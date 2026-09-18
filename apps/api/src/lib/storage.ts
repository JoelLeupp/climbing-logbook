import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

// Local-disk storage for v1. MinIO runs in docker-compose for when this
// needs to move off local disk - swap this module's body for an S3 client
// call, the callers (routes/media.ts, index.ts) don't need to change.
export async function saveUploadedFile(file: File): Promise<{ url: string }> {
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return { url: `/uploads/${filename}` };
}

export async function readUploadedFile(filename: string): Promise<{ data: Buffer; contentType: string } | null> {
  // reject path traversal - filename must not escape uploadsDir
  const resolved = path.resolve(uploadsDir, filename);
  if (path.dirname(resolved) !== uploadsDir) return null;

  try {
    const data = await readFile(resolved);
    const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
    return { data, contentType };
  } catch {
    return null;
  }
}
