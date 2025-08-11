import { NextRequest, NextResponse } from 'next/server';
import { processAndUploadImage } from '@/lib/image-processing';

export async function POST(request: NextRequest) {
  try {
    console.log('Process upload API called');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Convert File to Buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processAndUploadImage(buffer, file.name, file.type);

    console.log('File processed successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('File processing failed:', error);
    return NextResponse.json(
      { error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
