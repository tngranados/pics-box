import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

interface ProcessedImageResult {
  key: string;
  url: string;
  thumbnail_url: string;
  optimized_url: string;
  original_url: string;
  type: 'image' | 'video';
  uploadedAt: string;
  fileName: string;
  size: number;
}

export async function processAndUploadImage(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<ProcessedImageResult> {
  const timestamp = Date.now();
  const encodedFileName = encodeURIComponent(fileName);
  const baseKey = `${timestamp}-${encodedFileName}`;

  // For videos, just upload original
  if (fileType.startsWith('video/')) {
    const originalKey = `originals/${baseKey}`;

    await uploadToS3(buffer, originalKey, fileType);

    const originalUrl = await createPublicUrl(originalKey);

    return {
      key: originalKey,
      url: originalUrl, // Keep backwards compatibility
      thumbnail_url: '', // Videos don't have thumbnails yet
      optimized_url: originalUrl, // Use original for now
      original_url: originalUrl,
      type: 'video',
      uploadedAt: new Date().toISOString(),
      fileName,
      size: buffer.length,
    };
  }

  // Process images
  const image = sharp(buffer);

  // Generate thumbnail (400x400)
  const thumbnailBuffer = await image
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 75 })
    .toBuffer();

  // Generate optimized version (1920x1920)
  const optimizedBuffer = await image
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Upload all versions
  const originalKey = `originals/${baseKey}`;
  const thumbnailKey = `thumbnails/${baseKey}`;
  const optimizedKey = `optimized/${baseKey}`;

  await Promise.all([
    uploadToS3(buffer, originalKey, fileType),
    uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg'),
    uploadToS3(optimizedBuffer, optimizedKey, 'image/jpeg'),
  ]);

  // Generate public URLs
  const originalUrl = await createPublicUrl(originalKey);
  const thumbnailUrl = await createPublicUrl(thumbnailKey);
  const optimizedUrl = await createPublicUrl(optimizedKey);

  return {
    key: originalKey, // Keep original key as primary
    url: optimizedUrl, // Keep backwards compatibility - use optimized for default
    thumbnail_url: thumbnailUrl,
    optimized_url: optimizedUrl,
    original_url: originalUrl,
    type: 'image',
    uploadedAt: new Date().toISOString(),
    fileName,
    size: buffer.length,
  };
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Make files publicly readable
    ACL: 'public-read',
  });

  await s3Client.send(command);
}

async function createPublicUrl(key: string): Promise<string> {
  // Create public URL directly (no presigned URL needed if ACL is public-read)
  const endpoint = process.env.S3_ENDPOINT!.replace('https://', '').replace('http://', '');
  return `https://${endpoint}/${process.env.S3_BUCKET_NAME}/${key}`;
}
