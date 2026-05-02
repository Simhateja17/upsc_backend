import multer from "multer";
import path from "path";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

function fileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: JPG, PNG, PDF, DOCX`));
  }
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
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
}).single("file");
