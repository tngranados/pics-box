import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    // The key parameter comes URL encoded from the route, but we need to use it as-is
    // because the actual S3 key was stored with encoding
    console.log('Media proxy request for key:', key);
    console.log('Environment check:', {
      hasEndpoint: !!process.env.S3_ENDPOINT,
      hasBucket: !!process.env.S3_BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    const response = await s3Client.send(command);
    console.log('S3 response metadata:', {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      hasBody: !!response.Body,
    });
    
    if (!response.Body) {
      console.error('No body in S3 response');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Convert the stream to bytes
    const bytes = await response.Body.transformToByteArray();
    console.log('Converted bytes length:', bytes.length);

    // Set appropriate headers
    const headers = new Headers();
    if (response.ContentType) {
      headers.set('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }
    
    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(bytes, { headers });
  } catch (error) {
    console.error('Media proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}