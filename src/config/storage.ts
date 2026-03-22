import * as https from "https";
import { supabaseAdminStorage } from "./supabase";

export const STORAGE_BUCKETS = {
  PYQ_PDFS: "pyq-pdfs",
  ANSWER_UPLOADS: "answer-uploads",
  STUDY_MATERIALS: "study-materials",
  EDITORIAL_IMAGES: "editorial-images",
  CMS_MEDIA: "cms-media",
} as const;

// Buckets that should be publicly accessible (no signed URL needed)
const PUBLIC_BUCKETS: Set<string> = new Set([STORAGE_BUCKETS.CMS_MEDIA]);

/**
 * Initialize storage buckets (call once on startup or via admin endpoint)
 */
export async function initStorageBuckets() {
  if (!supabaseAdminStorage) {
    console.warn("Supabase admin client not available — skipping storage bucket init");
    return;
  }

  for (const bucket of Object.values(STORAGE_BUCKETS)) {
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
  console.log(`[STORAGE] https.request upload → ${uploadUrl} (${file.length} bytes)`);

  return new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname,
        method: "POST",
        family: 4, // Force IPv4 at socket level
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
          "Content-Length": file.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(path);
          } else {
            reject(new Error(`Upload failed [${res.statusCode}]: ${body}`));
          }
        });
      }
    );

    req.on("error", (err: any) => {
      console.error("[STORAGE] https.request error:", err.message, "code:", err.code);
      reject(new Error(`Upload failed: ${err.message}`));
    });

    req.write(file);
    req.end();
  });
}

/**
 * Get a signed URL for downloading a file (expires in 1 hour by default)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");

  const { data, error } = await supabaseAdminStorage.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

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
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  if (!supabaseAdminStorage) throw new Error("Supabase admin client not configured");

  const { error } = await supabaseAdminStorage.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
