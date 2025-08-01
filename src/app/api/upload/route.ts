import { NextRequest, NextResponse } from 'next/server';
import { createUploadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    const { fileName, fileType } = await request.json();
    console.log('Request data:', { fileName, fileType });

    if (!fileName || !fileType) {
      console.log('Missing fileName or fileType');
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    console.log('Environment variables check:', {
      hasRegion: !!process.env.AWS_REGION,
      hasEndpoint: !!process.env.S3_ENDPOINT,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.S3_BUCKET_NAME,
    });

    const { url, key } = await createUploadUrl(fileName, fileType);
    console.log('Presigned PUT URL created successfully:', { 
      key, 
      url
    });

    return NextResponse.json({
      uploadUrl: url,
      key,
    });
  } catch (error) {
    console.error('Upload URL creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}