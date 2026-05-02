import multer from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

function verifyMagicBytes(buffer: Buffer, expectedSignatures: number[][]): boolean {
  if (!buffer || buffer.length === 0) return false;
  return expectedSignatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

function fileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: JPG, PNG, PDF, DOCX`));
    return;
  }

  const signatures = MAGIC_BYTES[file.mimetype];
  if (signatures && file.buffer && !verifyMagicBytes(file.buffer, signatures)) {
    cb(new Error(`File content does not match its declared type (${file.mimetype})`));
    return;
  }

  cb(null, true);
}

/**
 * Multer middleware for single file upload
 */
export const uploadSingle = (fieldName: string = "file") =>
  multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).single(fieldName);

/**
 * Multer middleware for PDF upload (admin PYQ uploads - 50MB limit)
 */
export const uploadPDF = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    const pdfSig = MAGIC_BYTES["application/pdf"];
    if (file.buffer && !verifyMagicBytes(file.buffer, pdfSig)) {
      cb(new Error("File content does not match PDF format"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 },
}).single("file");
