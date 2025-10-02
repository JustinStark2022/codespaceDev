// src/middleware/upload.middleware.ts
import multer from "multer";
import path from "path";
import { env } from "@/utils/env-check";
import { Request } from "express";

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Use the directory from environment variables (default './uploads')
    cb(null, path.resolve(env.UPLOAD_DIR));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate a unique filename to prevent collisions
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${timestamp}-${random}${ext}`);
  }
});

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE || 5 * 1024 * 1024, // use MAX_FILE_SIZE from env (default 5MB)
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    // Allow only certain file types (images and common docs)
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed"));
    }
  }
});

export default upload;
