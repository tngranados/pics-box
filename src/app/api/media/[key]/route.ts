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
  const { key } = await params;

  // Decode the key parameter since it comes URL encoded from the route
  const decodedKey = decodeURIComponent(key);

  try {
    console.log('Media proxy request for encoded key:', key);
    console.log('Media proxy request for decoded key:', decodedKey);

    // Handle range requests for video streaming
    const range = request.headers.get('range');
    console.log('Range header:', range);

    console.log('Environment check:', {
      hasEndpoint: !!process.env.S3_ENDPOINT,
      hasBucket: !!process.env.S3_BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: decodedKey,
      Range: range || undefined,
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
    let contentType = response.ContentType;

    // Handle QuickTime videos - some browsers have issues with video/quicktime
    if (contentType === 'video/quicktime' || decodedKey.toLowerCase().endsWith('.mov')) {
      contentType = 'video/mp4'; // Serve MOV as MP4 for better browser compatibility
    }

    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }

    // Handle range response headers for video streaming
    if (response.ContentRange) {
      headers.set('Content-Range', response.ContentRange);
      headers.set('Accept-Ranges', 'bytes');
    } else {
      headers.set('Accept-Ranges', 'bytes');
    }

    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    headers.set('Cache-Control', 'public, max-age=3600');

    // Return 206 for partial content (range requests), 200 otherwise
    const status = range && response.ContentRange ? 206 : 200;
    return new NextResponse(bytes, { headers, status });
  } catch (error) {
    console.error('Media proxy error for key:', decodedKey);
    console.error('Full error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  try {

    console.log('HEAD request for:', decodedKey);

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: decodedKey,
    });

    const response = await s3Client.send(command);

    const headers = new Headers();
    let contentType = response.ContentType;

    // Handle QuickTime videos - some browsers have issues with video/quicktime
    if (contentType === 'video/quicktime' || decodedKey.toLowerCase().endsWith('.mov')) {
      contentType = 'video/mp4'; // Serve MOV as MP4 for better browser compatibility
    }

    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');

    return new NextResponse(null, { headers, status: 200 });
  } catch (error) {
    console.error('HEAD request error:', error);
    return new NextResponse(null, { status: 404 });
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new NextResponse(null, { status: 200, headers });
}
