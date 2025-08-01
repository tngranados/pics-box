import { NextResponse } from 'next/server';
import { listUploadedFiles, createDownloadUrl } from '@/lib/s3';

export async function GET() {
  try {
    console.log('Gallery API called');
    
    const files = await listUploadedFiles();
    console.log(`Found ${files.length} files in gallery`);

    const mediaFiles = files.map((file) => {
      try {
        // Use proxy URL instead of direct R2 URL to avoid CORS issues
        const url = `/api/media/${encodeURIComponent(file.key)}`;
        
        // Extract original filename from key (remove timestamp prefix)
        const keyParts = file.key.split('/');
        const fileName = keyParts[keyParts.length - 1];
        const originalName = fileName.replace(/^\d+-/, '');
        const decodedName = decodeURIComponent(originalName);
        
        // Determine file type from extension
        const extension = decodedName.toLowerCase().split('.').pop() || '';
        const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension);
        
        return {
          key: file.key,
          url,
          type: isVideo ? 'video' : 'image',
          uploadedAt: file.lastModified.toISOString(),
          fileName: decodedName,
          size: file.size,
        };
      } catch (error) {
        console.error(`Failed to process file ${file.key}:`, error);
        return null;
      }
    });

    // Filter out any failed URL generations
    const validMediaFiles = mediaFiles.filter(file => file !== null);
    
    return NextResponse.json({
      files: validMediaFiles,
      count: validMediaFiles.length,
    });
  } catch (error) {
    console.error('Gallery fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}