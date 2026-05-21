import fs from 'fs';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';

const uploadDirectory = path.join(__dirname, '../../../../uploads/club-logos');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function sanitizeBasename(name: string): string {
  const normalized = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
  return normalized || 'club-logo';
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => cb(null, uploadDirectory),
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const rawBase = path.basename(file.originalname || 'club-logo', ext);
    const safeBase = sanitizeBasename(rawBase).slice(0, 80);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!allowedImageMimeTypes.has(file.mimetype)) {
    cb(new Error('Only image files are allowed for club logos (JPEG, PNG, WEBP, GIF).'));
    return;
  }
  cb(null, true);
};

export const clubLogoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
