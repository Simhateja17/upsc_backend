import * as https from "https";
import { supabaseAdminStorage } from "./supabase";

export const STORAGE_BUCKETS = {
  PYQ_PDFS: "pyq-pdfs",
  ANSWER_UPLOADS: "answer-uploads",
  TOPPER_PDFS: "topper-pdfs",
  TOPPER_ANSWER_PAGES: "topper-answer-pages",
  CHECKED_COPIES: "checked-copies",
  STUDY_MATERIALS: "study-materials",
  EDITORIAL_IMAGES: "editorial-images",
  CMS_MEDIA: "cms-media",
} as const;

// Buckets that should be publicly accessible (no signed URL needed)
const PUBLIC_BUCKETS: Set<string> = new Set([STORAGE_BUCKETS.CMS_MEDIA]);

const RETRYABLE_UPLOAD_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "ECONNABORTED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

export function sanitizeStorageFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "upload";
}

export function buildStoragePath(...parts: string[]): string {
  return parts
    .map((part) => sanitizeStorageFileName(part))
    .filter(Boolean)
    .join("/");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Initialize storage buckets (call once on startup or via admin endpoint)
 */
export async function initStorageBuckets() {
  if (!supabaseAdminStorage) {
    console.warn("Supabase admin client not available — skipping storage bucket init");
    return;
  }

  const { data: existingBuckets, error: listError } =
    await supabaseAdminStorage.storage.listBuckets();

  if (listError) {
    console.error("Failed to list storage buckets:", listError.message);
    return;
  }

  const existingBucketIds = new Set((existingBuckets || []).map((bucket) => bucket.id));

  for (const bucket of Object.values(STORAGE_BUCKETS)) {
    if (existingBucketIds.has(bucket)) continue;

    const { error } = await supabaseAdminStorage.storage.createBucket(bucket, {
      public: PUBLIC_BUCKETS.has(bucket),
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });

    if (error && !error.message.includes("already exists")) {
      console.error(`Failed to create bucket "${bucket}":`, error.message);
    }
  }
}

/**
 * Upload a file to a Supabase Storage bucket.
 * Uses Node.js https.request instead of fetch to bypass Node.js v25's built-in
 * undici, which fails with TypeError: fetch failed when sending binary Buffer bodies.
 * The `family: 4` option forces IPv4 at the TCP socket level.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars not configured");

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  const parsed = new URL(uploadUrl);
  const maxAttempts = Number(process.env.SUPABASE_STORAGE_UPLOAD_ATTEMPTS || 3);
  const timeoutMs = Number(process.env.SUPABASE_STORAGE_UPLOAD_TIMEOUT_MS || 120000);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await uploadFileOnce({
        bucket,
        path,
        file,
        contentType,
        parsed,
        serviceKey,
        uploadUrl,
        attempt,
        maxAttempts,
        timeoutMs,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const code = (lastError as NodeJS.ErrnoException).code;
      const retryableStatus = /Upload failed \[(5\d\d|429)\]/.test(lastError.message);
      const retryable = (code && RETRYABLE_UPLOAD_ERROR_CODES.has(code)) || retryableStatus;

      if (!retryable || attempt >= maxAttempts) break;

      const delayMs = Math.min(5000, 500 * 2 ** (attempt - 1));
      console.warn(
        `[STORAGE] upload retry ${attempt + 1}/${maxAttempts} in ${delayMs}ms after ${code || lastError.message}`
      );
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Upload failed");
}

async function uploadFileOnce(params: {
  bucket: string;
  path: string;
  file: Buffer;
  contentType: string;
  parsed: URL;
  serviceKey: string;
  uploadUrl: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
}): Promise<string> {
  console.log(
    `[STORAGE] https.request upload ${params.attempt}/${params.maxAttempts} → ${params.uploadUrl} (${params.file.length} bytes)`
  );

  return new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: params.parsed.hostname,
        port: 443,
        path: params.parsed.pathname,
        method: "POST",
        family: 4, // Force IPv4 at socket level
        headers: {
          Authorization: `Bearer ${params.serviceKey}`,
          "Content-Type": params.contentType,
          Connection: "close",
          "x-upsert": "true",
          "Content-Length": params.file.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(params.path);
          } else {
            reject(new Error(`Upload failed [${res.statusCode}]: ${body}`));
          }
        });
      }
    );

    req.setTimeout(params.timeoutMs, () => {
      const err = new Error(`Upload timed out after ${params.timeoutMs}ms`) as NodeJS.ErrnoException;
      err.code = "ETIMEDOUT";
      req.destroy(err);
    });

    req.on("error", (err: any) => {
      console.error("[STORAGE] https.request error:", err.message, "code:", err.code);
      const wrapped = new Error(`Upload failed: ${err.message}`) as NodeJS.ErrnoException;
      wrapped.code = err.code;
      reject(wrapped);
    });

    req.write(params.file);
    req.end();
  });
}

/**
 * Get a signed URL for a file.
 * Pass inline=true to set Content-Disposition: inline (for in-browser viewing).
 * Default (inline=false) sets Content-Disposition: attachment (for downloading).
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
  inline = false
): Promise<string> {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");

  const { data, error } = await supabaseAdminStorage.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, { download: !inline });

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Get a public URL for a file in a public bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");
  const { data } = supabaseAdminStorage.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download a file from a Supabase Storage bucket as a Buffer.
 * Returns both the file bytes and the content type so callers (e.g. the
 * Gemini OCR helper) can forward it to multimodal models without guessing
 * the MIME type from the extension.
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");

  console.log(`[STORAGE] download → ${bucket}/${path}`);
  const { data, error } = await supabaseAdminStorage.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Download failed: ${error?.message || "no data returned"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type || "application/octet-stream",
  };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");

  const { error } = await supabaseAdminStorage.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
