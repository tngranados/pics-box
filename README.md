# PicsBox - Wedding Photo Sharing App

A mobile-first wedding photo and video sharing application built with Next.js. Allows guests to easily upload photos and videos from the wedding using QR codes at tables.

## Features

- 📱 Mobile-first responsive design
- 📸 Photo and video upload with camera integration
- ☁️ S3/R2 cloud storage integration
- 🖼️ Gallery view for uploaded content
- 📱 PWA support for app-like experience
- 💝 Wedding-themed UI with elegant design

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure S3/R2 storage:**

   - Copy `.env.local.example` to `.env.local`
   - Fill in your S3/R2 credentials:
     ```env
     AWS_REGION=auto
     S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
     AWS_ACCESS_KEY_ID=your-access-key-id
     AWS_SECRET_ACCESS_KEY=your-secret-access-key
     S3_BUCKET_NAME=your-bucket-name
     ```

3. **Add PWA icons:**

   - Add `icon-192.png` (192x192px) to `/public/`
   - Add `icon-512.png` (512x512px) to `/public/`

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Cloudflare R2 Setup

1. Create a Cloudflare R2 bucket
2. Generate API tokens with appropriate permissions
3. Configure CORS for your bucket to allow uploads from your domain
4. Set the bucket to public (or configure appropriate access policies)

## Deployment

The app can be deployed to any platform that supports Next.js:

- **Vercel**: Automatic deployment from Git
- **Netlify**: Connect your repository
- **Cloudflare Pages**: Perfect if using R2 storage

## Usage

1. Generate QR codes pointing to your deployed app URL
2. Place QR codes on wedding tables
3. Guests scan QR codes and upload photos/videos
4. View all uploads in the gallery

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: AWS S3/Cloudflare R2
- **PWA**: Native browser APIs

## File Structure

```
src/
├── app/
│   ├── api/upload/       # Upload API endpoint
│   ├── gallery/          # Gallery page
│   ├── page.tsx          # Main upload page
│   └── layout.tsx        # Root layout with PWA config
├── lib/
│   └── s3.ts            # S3/R2 configuration
public/
├── manifest.json        # PWA manifest
└── icons/              # PWA icons
```

## One-off: Download All Original Files

You can download every original uploaded asset (those stored under the `originals/` prefix in the bucket) to a local folder for backup or migration.

1. Ensure your `.env.local` (or exported env vars) contains the S3/R2 configuration values:
   - `S3_ENDPOINT`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_BUCKET_NAME`
2. Install dependencies if you haven't: `npm install`
3. Run:
   ```bash
   npm run download:originals
   ```

The script will:

- List all objects with prefix `originals/` (handles pagination)
- Skip any files already present locally (resume capable)
- Download concurrently (8 at a time) into `downloads/originals/` preserving key paths
- Write a `failed-keys.txt` file if any objects couldn't be downloaded

Safety notes:

- If more than 1000 files need downloading, you'll be asked for confirmation.
- Rerunning the script is safe; already-downloaded files are skipped.
- Ensure you have sufficient disk space before proceeding.
