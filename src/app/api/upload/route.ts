import { NextRequest, NextResponse } from 'next/server';
import { createUploadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    const { url, fields, key } = await createUploadUrl(fileName, fileType);

    return NextResponse.json({
      uploadUrl: url,
      fields,
      key,
    });
  } catch (error) {
    console.error('Upload URL creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}