import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HeadBucketCommand, CreateBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>("MINIO_ENDPOINT", "localhost");
    const port = config.get<string>("MINIO_PORT", "9000");

    this.bucket = config.get<string>("MINIO_BUCKET", "tina-documents");
    this.client = new S3Client({
      region: "us-east-1",
      endpoint: `http://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>("MINIO_ACCESS_KEY", "minioadmin"),
        secretAccessKey: config.get<string>("MINIO_SECRET_KEY", "minioadmin")
      }
    });
  }

  async uploadObject(input: { key: string; body: Buffer; contentType: string }) {
    await this.ensureBucket();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );

    return { bucket: this.bucket, key: input.key };
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
