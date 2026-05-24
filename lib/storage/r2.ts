import fs from 'fs-extra';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isTestFixtureMode } from '../core/secrets';
import type { StorageAdapter } from './contracts';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase?: string;
}

function readConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE;
  if (!accountId) throw new Error('R2_ACCOUNT_ID missing');
  if (!accessKeyId) throw new Error('R2_ACCESS_KEY_ID missing');
  if (!secretAccessKey) throw new Error('R2_SECRET_ACCESS_KEY missing');
  if (!bucket) throw new Error('R2_BUCKET missing');
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

function buildClient(cfg: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function urlToKey(url: string, cfg: R2Config): string {
  if (cfg.publicBase && url.startsWith(cfg.publicBase)) {
    return url.slice(cfg.publicBase.length).replace(/^\/+/, '');
  }
  const prefix = `r2://${cfg.bucket}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  if (url.startsWith('r2://')) return url.slice(url.indexOf('/', 5) + 1);
  return url;
}

function publicUrl(key: string, cfg: R2Config): string {
  if (cfg.publicBase) return `${cfg.publicBase.replace(/\/+$/, '')}/${key}`;
  return `r2://${cfg.bucket}/${key}`;
}

export const r2StorageAdapter: StorageAdapter = {
  id: 'r2',
  async upload(localPath: string, options?: { keyPrefix?: string; contentType?: string }): Promise<string> {
    const base = path.basename(localPath);
    const key = `${options?.keyPrefix ?? 'outputs'}/${base}`;
    if (isTestFixtureMode()) {
      return `r2://mock-bucket/${key}`;
    }
    const cfg = readConfig();
    const client = buildClient(cfg);
    const Body = fs.createReadStream(localPath);
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body,
        ContentType: options?.contentType,
      }),
    );
    return publicUrl(key, cfg);
  },
  async download(url: string, destPath: string): Promise<string> {
    if (isTestFixtureMode()) {
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, '');
      return destPath;
    }
    const cfg = readConfig();
    const client = buildClient(cfg);
    const key = urlToKey(url, cfg);
    const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    const body = res.Body;
    if (!body) throw new Error('R2 GetObject returned empty body');
    await fs.ensureDir(path.dirname(destPath));
    const stream = body as Readable;
    await pipeline(stream, fs.createWriteStream(destPath));
    return destPath;
  },
  async signUrl(url: string, ttlSec = 3600): Promise<string> {
    if (isTestFixtureMode()) return url;
    const cfg = readConfig();
    const client = buildClient(cfg);
    const key = urlToKey(url, cfg);
    return getSignedUrl(client, new GetObjectCommand({ Bucket: cfg.bucket, Key: key }), { expiresIn: ttlSec });
  },
  async delete(url: string): Promise<void> {
    if (isTestFixtureMode()) return;
    const cfg = readConfig();
    const client = buildClient(cfg);
    const key = urlToKey(url, cfg);
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  },
};
