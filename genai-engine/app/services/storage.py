"""
S3/MinIO storage service for file upload/download.
"""

import structlog
import boto3
from botocore.exceptions import ClientError

from app.config import Settings, settings

logger = structlog.get_logger()


class StorageService:
    """MinIO/S3 object storage operations."""

    def __init__(self, app_settings: Settings | None = None):
        s = app_settings or settings
        self.s3 = boto3.client(
            "s3",
            endpoint_url=s.MINIO_SERVICE_URL,
            aws_access_key_id=s.MINIO_ACCESS_KEY,
            aws_secret_access_key=s.MINIO_SECRET_KEY,
        )
        self.bucket = s.MINIO_FOLDER_NAME

    def upload_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload bytes to S3 and return the key."""
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        logger.info("s3_uploaded", key=key, size=len(data))
        return key

    def download_bytes(self, key: str) -> bytes:
        """Download object from S3 as bytes."""
        obj = self.s3.get_object(Bucket=self.bucket, Key=key)
        return obj["Body"].read()

    def download_to_file(self, key: str, local_path: str) -> None:
        """Download S3 object to a local file."""
        self.s3.download_file(self.bucket, key, local_path)

    def delete_object(self, key: str) -> None:
        """Delete object from S3."""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            logger.warning("s3_delete_failed", key=key, error=str(e))
