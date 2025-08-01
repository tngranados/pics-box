# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run lint` - Run ESLint on the codebase
- `npm start` - Start production server

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure:
```env
AWS_REGION=auto
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

## Architecture Overview

### Upload Flow Architecture
The app uses **presigned PUT URLs** for direct uploads to Cloudflare R2 (not presigned POST - R2 doesn't support it):

1. **Frontend** (`src/app/page.tsx`) - Calls `/api/upload` with file metadata
2. **Upload API** (`src/app/api/upload/route.ts`) - Generates presigned PUT URL via S3 SDK
3. **S3 Client** (`src/lib/s3.ts`) - Configured for R2 with `forcePathStyle: true` and `signerVersion: 'v4'`
4. **Direct Upload** - Frontend uploads file directly to R2 using PUT request

### Key Technical Constraints

**Cloudflare R2 Limitations:**
- Only supports presigned GET/PUT/HEAD/DELETE URLs (no POST)
- Requires exact CORS configuration for cross-origin uploads
- Must use `forcePathStyle: true` in S3Client configuration

**CORS Requirements for R2:**
```json
{
  "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
  "AllowedMethods": ["GET", "PUT", "HEAD"],
  "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-date", "x-amz-content-sha256", "authorization"],
  "MaxAgeSeconds": 3600
}
```

### App Structure
- **Main Upload Page** (`/`) - Mobile-first file selection and upload interface
- **Gallery Page** (`/gallery`) - View uploaded media (placeholder implementation)
- **PWA Support** - Configured in `layout.tsx` with manifest and mobile meta tags
- **Wedding Theme** - Pink/purple gradient design optimized for mobile QR code access

### File Upload Process
Files are uploaded with timestamped keys: `uploads/{timestamp}-{encoded-filename}`
- Frontend validates file type (image/* or video/*)
- API generates 1-hour expiring presigned PUT URLs
- Direct upload to R2 using fetch() with PUT method
- Comprehensive logging for debugging upload issues

## PWA Configuration

Requires icons in `/public/`:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

Manifest configured for standalone mobile app experience with wedding branding.