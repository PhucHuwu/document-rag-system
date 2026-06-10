import logging

from app.services.embedding_service import embedding_service
from app.services.qdrant_repository import qdrant_repository
from app.services.queue_consumer import queue_consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tina.worker")


def main() -> None:
    logger.info("Starting Tina ingestion worker")

    try:
        qdrant_repository.ensure_collection()
    except Exception:
        logger.exception("Qdrant ensure_collection failed at worker startup")

    try:
        embedding_service.warm()
    except Exception:
        logger.exception("Embedding model warm-up failed at worker startup")

    queue_consumer.run()


if __name__ == "__main__":
    main()
