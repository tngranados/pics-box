import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  signerVersion: 'v4',
});

export async function createUploadUrl(fileName: string, fileType: string) {
  const key = `uploads/${Date.now()}-${encodeURIComponent(fileName)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { 
    expiresIn: 3600 // 1 hour
  });

  return { url, key };
}
