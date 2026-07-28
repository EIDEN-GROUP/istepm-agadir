/**
 * MinIO (S3-compatible) client for document storage.
 *
 * Exam documents (PDF, Word) are stored here rather than in the database.
 * The DB only holds metadata (documentId, documentNom, etc.).
 */
import { Client as MinioClient } from "minio";
import { getEnv } from "@/config/env";
import type { BucketItemStat } from "minio";

let client: MinioClient | null = null;

function getMinio(): MinioClient {
  if (!client) {
    const env = getEnv();
    client = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return client;
}

const BUCKET = "school-crm";

/** Ensure the bucket exists. Called once on startup. */
export async function ensureBucket(): Promise<void> {
  const mc = getMinio();
  const exists = await mc.bucketExists(BUCKET);
  if (!exists) {
    await mc.makeBucket(BUCKET);
  }
}

/**
 * Upload a document buffer to MinIO.
 * @returns The object key (documentId) to store in the DB.
 */
export async function uploadDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<{
  objectKey: string;
  size: number;
}> {
  const mc = getMinio();
  const objectKey = `examens/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await mc.putObject(BUCKET, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return { objectKey, size: buffer.length };
}

/**
 * Get a document from MinIO as a Buffer.
 */
export async function getDocument(objectKey: string): Promise<Buffer | null> {
  const mc = getMinio();
  try {
    const stream = await mc.getObject(BUCKET, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "NotFound") {
      return null;
    }
    throw err;
  }
}

/**
 * Get document metadata (size, mime type, etc.) from MinIO.
 */
export async function statDocument(objectKey: string): Promise<BucketItemStat | null> {
  const mc = getMinio();
  try {
    return await mc.statObject(BUCKET, objectKey);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "NotFound") {
      return null;
    }
    throw err;
  }
}

/**
 * Delete a document from MinIO.
 */
export async function deleteDocument(objectKey: string): Promise<void> {
  const mc = getMinio();
  try {
    await mc.removeObject(BUCKET, objectKey);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "NotFound") {
      return; // Already gone   noop.
    }
    throw err;
  }
}
