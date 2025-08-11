import { NextResponse } from 'next/server';
import { listUploadedFiles, generateUrlVariants } from '@/lib/s3';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log(`Gallery API called - page: ${page}, limit: ${limit}, offset: ${offset}`);

    const files = await listUploadedFiles();
    console.log(`Found ${files.length} files in gallery`);

    const mediaFiles = files.map((file) => {
      try {
        // Generate URL variants based on folder structure
        const urlVariants = generateUrlVariants(file.key);

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
          url: urlVariants.optimized_url, // Keep backwards compatibility - use optimized as default
          thumbnail_url: urlVariants.thumbnail_url,
          optimized_url: urlVariants.optimized_url,
          original_url: urlVariants.original_url,
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

    // Filter out any failed URL generations and sort by upload date (newest first)
    const validMediaFiles = mediaFiles
      .filter(file => file !== null)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Apply pagination
    const paginatedFiles = validMediaFiles.slice(offset, offset + limit);
    const totalPages = Math.ceil(validMediaFiles.length / limit);

    return NextResponse.json({
      files: paginatedFiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: validMediaFiles.length,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Gallery fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
