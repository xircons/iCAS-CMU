import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../../../uploads/assignments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Fixes filename encoding from Latin-1 to UTF-8 (Windows issue)
 * Windows sends filenames in Latin-1 encoding, which corrupts non-ASCII characters
 */
function fixFilenameEncoding(filename: string): string {
  try {
    // Convert from Latin-1 to UTF-8
    // This fixes the corruption that happens on Windows when Thai/Unicode characters are used
    const fixed = Buffer.from(filename, 'latin1').toString('utf8');
    return fixed;
  } catch (error) {
    console.error('Error fixing filename encoding:', error);
    // Fallback to original if conversion fails
    return filename;
  }
}

/**
 * Normalizes and sanitizes filename for safe storage
 * - Removes/replaces dangerous characters
 * - Ensures filename is safe for filesystem
 */
function normalizeFilename(filename: string): string {
  // Remove or replace characters that are problematic for filesystems
  // Keep Unicode characters (Thai, etc.) but remove control characters
  let normalized = filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace dangerous chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .trim();
  
  // Ensure filename is not empty
  if (!normalized || normalized === '_') {
    normalized = 'file';
  }
  
  // Limit filename length (keep extension)
  const maxLength = 200;
  if (normalized.length > maxLength) {
    const ext = path.extname(normalized);
    const nameWithoutExt = normalized.slice(0, maxLength - ext.length);
    normalized = nameWithoutExt + ext;
  }
  
  return normalized;
}

/**
 * Processes filename: fixes encoding and normalizes for safe storage
 */
function processFilename(originalname: string): string {
  // Step 1: Fix encoding (Latin-1 → UTF-8)
  const fixedEncoding = fixFilenameEncoding(originalname);
  
  // Step 2: Normalize for filesystem safety
  const normalized = normalizeFilename(fixedEncoding);
  
  return normalized;
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    console.log('Multer storage - destination:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Fix encoding and normalize the original filename
    const processedName = processFilename(file.originalname);
    
    // Generate unique filename: timestamp-random-processedName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(processedName);
    const nameWithoutExt = path.basename(processedName, ext);
    const filename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
    
    console.log('Multer storage - original filename:', file.originalname);
    console.log('Multer storage - processed filename:', processedName);
    console.log('Multer storage - final filename:', filename);
    
    cb(null, filename);
  }
});

// File filter - allow only certain file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('Multer fileFilter - processing file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Allowed file types
  const allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Text
    'text/plain',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('Multer fileFilter - file accepted:', file.originalname);
    cb(null, true);
  } else {
    console.error('Multer fileFilter - file rejected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      allowedTypes: allowedMimeTypes
    });
    cb(new Error(`File type not allowed. Allowed types: PDF, Word, Excel, PowerPoint, Images, Text, ZIP, RAR. Received: ${file.mimetype}`));
  }
};

// Multer upload configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Helper function to delete uploaded file
export const deleteFile = (filePath: string): void => {
  try {
    const fullPath = path.join(__dirname, '../../../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

