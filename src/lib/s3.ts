import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
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

export async function listUploadedFiles() {
  // Get files from all folders (originals, uploads for backwards compatibility)
  const [originalsResponse, uploadsResponse] = await Promise.all([
    s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: 'originals/',
      MaxKeys: 1000,
    })),
    s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: 'uploads/',
      MaxKeys: 1000,
    }))
  ]);

  const allFiles = [
    ...(originalsResponse.Contents || []),
    ...(uploadsResponse.Contents || [])
  ];

  if (allFiles.length === 0) {
    return [];
  }

  const files = allFiles.map(obj => ({
    key: obj.Key!,
    lastModified: obj.LastModified!,
    size: obj.Size!,
  }));

  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

export async function createDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600 // 1 hour
  });

  return url;
}

export function createPublicUrl(key: string): string {
  // Create public URL directly (assuming files are public-readable)
  const endpoint = process.env.S3_ENDPOINT!.replace('https://', '').replace('http://', '');
  return `https://${endpoint}/${process.env.S3_BUCKET_NAME}/${key}`;
}

export function generateUrlVariants(originalKey: string) {
  // Extract base filename from key
  const keyParts = originalKey.split('/');
  const fileName = keyParts[keyParts.length - 1];

  // Determine if it's a video based on file extension
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension);

  if (originalKey.startsWith('originals/')) {
    // For videos, only use original URL since optimized versions may not exist
    if (isVideo) {
      const originalUrl = `/api/media/${encodeURIComponent(originalKey)}`;
      return {
        thumbnail_url: originalUrl, // Use original for thumbnail too
        optimized_url: originalUrl, // Use original since optimized may not exist
        original_url: originalUrl
      };
    }

    // For images, try optimized variants but fallback to original
    return {
      thumbnail_url: `/api/media/${encodeURIComponent(`thumbnails/${fileName}`)}`,
      optimized_url: `/api/media/${encodeURIComponent(`optimized/${fileName}`)}`,
      original_url: `/api/media/${encodeURIComponent(originalKey)}`
    };
  } else {
    // Legacy format - fallback to proxy URLs
    const proxyUrl = `/api/media/${encodeURIComponent(originalKey)}`;
    return {
      thumbnail_url: proxyUrl, // Use proxy for backwards compatibility
      optimized_url: proxyUrl,
      original_url: proxyUrl
    };
  }
}
