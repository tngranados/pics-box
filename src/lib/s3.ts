import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function createUploadUrl(fileName: string, fileType: string) {
  const key = `uploads/${Date.now()}-${fileName}`;
  
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ['content-length-range', 0, 50 * 1024 * 1024], // 50MB max
      ['starts-with', '$Content-Type', fileType.split('/')[0] + '/'],
    ],
    Fields: {
      'Content-Type': fileType,
    },
    Expires: 600, // 10 minutes
  });

  return { url, fields, key };
}