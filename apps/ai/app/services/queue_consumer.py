import json
import logging
import time
from typing import Any

import redis

from app.config import settings
from app.services.core_client import core_client
from app.services.ingestion_service import ingestion_service

logger = logging.getLogger("tina.queue")

RECLAIM_MIN_IDLE_MS = 60_000
BLOCK_MS = 5_000


class QueueConsumer:
    """Consumes ingestion jobs from a Redis Stream with a consumer group.

    At-least-once delivery: a job is only XACK'd after it succeeds. Failed jobs
    stay pending and are retried via XAUTOCLAIM until max_ingestion_attempts,
    then dead-lettered (reported failed + acked).
    """

    def __init__(self) -> None:
        self._redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        self._stream = settings.redis_stream
        self._group = settings.redis_group
        self._consumer = settings.redis_consumer

    def ensure_group(self) -> None:
        try:
            self._redis.xgroup_create(name=self._stream, groupname=self._group, id="0", mkstream=True)
        except redis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    def run(self) -> None:
        self.ensure_group()
        logger.info(
            "Ingestion consumer started (stream=%s group=%s consumer=%s)",
            self._stream,
            self._group,
            self._consumer,
        )
        while True:
            try:
                self._reclaim_stale()
                messages = self._redis.xreadgroup(
                    groupname=self._group,
                    consumername=self._consumer,
                    streams={self._stream: ">"},
                    count=1,
                    block=BLOCK_MS,
                )
                for _stream_name, entries in messages or []:
                    for message_id, fields in entries:
                        self._handle(message_id, fields)
            except Exception:
                logger.exception("Consumer loop error; backing off")
                time.sleep(2)

    def _handle(self, message_id: str, fields: dict[str, str]) -> None:
        job = self._parse_job(fields)
        job_id = job.get("jobId", "?")
        try:
            count = ingestion_service.process_job(job)
            self._redis.xack(self._stream, self._group, message_id)
            logger.info("Job %s done (%s chunks), acked %s", job_id, count, message_id)
        except Exception as exc:
            attempts = self._delivery_count(message_id)
            logger.warning(
                "Job %s failed (attempt %s/%s): %s",
                job_id,
                attempts,
                settings.max_ingestion_attempts,
                exc,
            )
            if attempts >= settings.max_ingestion_attempts:
                self._dead_letter(job_id, message_id, exc)

    def _reclaim_stale(self) -> None:
        try:
            result = self._redis.xautoclaim(
                name=self._stream,
                groupname=self._group,
                consumername=self._consumer,
                min_idle_time=RECLAIM_MIN_IDLE_MS,
                count=10,
            )
        except redis.ResponseError:
            logger.debug("xautoclaim skipped", exc_info=True)
            return

        claimed = result[1] if len(result) > 1 else []
        for message_id, fields in claimed:
            if fields:
                self._handle(message_id, fields)

    def _delivery_count(self, message_id: str) -> int:
        pending = self._redis.xpending_range(
            name=self._stream,
            groupname=self._group,
            min=message_id,
            max=message_id,
            count=1,
        )
        if pending:
            return int(pending[0]["times_delivered"])
        return 1

    def _dead_letter(self, job_id: str, message_id: str, exc: Exception) -> None:
        try:
            core_client.fail(job_id, str(exc))
        except Exception:
            logger.exception("Failed to report dead-letter for job %s", job_id)
        self._redis.xack(self._stream, self._group, message_id)
        logger.error("Job %s dead-lettered after %s attempts", job_id, settings.max_ingestion_attempts)

    @staticmethod
    def _parse_job(fields: dict[str, str]) -> dict[str, Any]:
        payload = fields.get("payload")
        if payload:
            return json.loads(payload)
        return dict(fields)


queue_consumer = QueueConsumer()
