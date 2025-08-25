#!/usr/bin/env ts-node

import { S3Client, ListObjectsV2Command, GetObjectCommand, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables explicitly (supports .env.local like Next.js)
import dotenv from 'dotenv';
const dotenvFiles = ['.env.local', '.env'];
for (const file of dotenvFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
  }
}

interface Env {
  S3_ENDPOINT: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
}

function validateEnv(): Env {
  const required: (keyof Env)[] = ['S3_ENDPOINT', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}\nEnsure you have a .env.local file with the proper values. Example:\nS3_ENDPOINT=...\nAWS_ACCESS_KEY_ID=...\nAWS_SECRET_ACCESS_KEY=...\nS3_BUCKET_NAME=...`);
  }
  return {
    S3_ENDPOINT: process.env.S3_ENDPOINT!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
  };
}

const env = validateEnv();

const s3Client = new S3Client({
  region: 'auto',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function listAllOriginalKeys(prefix = 'originals/'): Promise<string[]> {
  const bucket = env.S3_BUCKET_NAME;
  const keys: string[] = [];
  let ContinuationToken: string | undefined = undefined;
  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken,
      MaxKeys: 1000,
    });
    const resp: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
    (resp.Contents || []).forEach((o: { Key?: string | undefined }) => {
      if (o.Key) keys.push(o.Key);
    });
    ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    process.stdout.write(`\rListed ${keys.length} objects...`);
  } while (ContinuationToken);
  process.stdout.write('\n');
  return keys;
}

async function downloadObject(key: string, destRoot: string) {
  const bucket = env.S3_BUCKET_NAME;
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await s3Client.send(command);
  if (!resp.Body) throw new Error(`No body for ${key}`);
  const bytes = await resp.Body.transformToByteArray();
  const destPath = path.join(destRoot, key); // preserves prefix path
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, bytes);
  return { key, size: bytes.length };
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, answer => { rl.close(); resolve(/^y(es)?$/i.test(answer.trim())); }));
}

async function main() {
  const outDir = path.resolve('downloads/originals');
  await fs.promises.mkdir(outDir, { recursive: true });

  console.log('Listing originals...');
  const keys = await listAllOriginalKeys();
  if (keys.length === 0) {
    console.log('No originals found.');
    return;
  }
  console.log(`Found ${keys.length} original objects.`);

  // Determine which keys still need download (resume support)
  const remaining = keys.filter(k => !fs.existsSync(path.join(outDir, k)));
  if (remaining.length !== keys.length) {
    console.log(`${keys.length - remaining.length} already present locally, will skip those.`);
  }

  const totalBytes: { downloaded: number } = { downloaded: 0 };

  // Ask confirmation if more than 1000 files
  if (remaining.length > 1000) {
    const ok = await confirm(`You are about to download ${remaining.length} files. Continue? (y/N) `);
    if (!ok) return;
  }

  // Concurrency control
  const concurrency = 8;
  let index = 0;
  let success = 0;
  let failed: string[] = [];

  async function worker(id: number) {
    while (index < remaining.length) {
      const current = index++;
      const key = remaining[current];
      try {
        const { size } = await downloadObject(key, outDir);
        totalBytes.downloaded += size;
        success++;
        process.stdout.write(`\rDownloaded ${success}/${remaining.length} files (${(totalBytes.downloaded/1_000_000).toFixed(2)} MB)`);
      } catch (e) {
        failed.push(key);
        process.stderr.write(`\nFailed ${key}: ${(e as Error).message}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  process.stdout.write('\n');

  console.log('Download complete.');
  console.log(`Succeeded: ${success}`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`);
    failed.forEach(k => console.log('  ' + k));
    const failLog = path.join(outDir, 'failed-keys.txt');
    await fs.promises.writeFile(failLog, failed.join('\n'));
    console.log(`Failed keys written to ${failLog}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
