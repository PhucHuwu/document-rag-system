import boto3
from botocore.client import Config

from app.config import settings


class StorageClient:
    """Reads original document files from MinIO (S3-compatible) by storage key.

    Mirrors the Core Backend StorageService: path-style addressing, MinIO creds.
    """

    def __init__(self) -> None:
        scheme = "https" if settings.minio_secure else "http"
        endpoint = f"{scheme}://{settings.minio_endpoint}:{settings.minio_port}"

        self._bucket = settings.minio_bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            region_name="us-east-1",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def download(self, storage_key: str) -> bytes:
        response = self._client.get_object(Bucket=self._bucket, Key=storage_key)
        return response["Body"].read()


storage_client = StorageClient()
