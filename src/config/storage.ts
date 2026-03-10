import { supabaseAdmin } from "./supabase";

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
  if (!supabaseAdmin) {
    console.warn("Supabase admin client not available — skipping storage bucket init");
    return;
  }

  for (const bucket of Object.values(STORAGE_BUCKETS)) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: PUBLIC_BUCKETS.has(bucket),
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });

    if (error && !error.message.includes("already exists")) {
      console.error(`Failed to create bucket "${bucket}":`, error.message);
    }
  }
}

/**
 * Upload a file to a Supabase Storage bucket
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return path;
}

/**
 * Get a signed URL for downloading a file (expires in 1 hour by default)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Get a public URL for a file in a public bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
