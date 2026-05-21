import { 
  FileText, 
  Image, 
  File, 
  FileCode, 
  Archive,
  FileType,
  Download,
  ExternalLink
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type FileType = 
  | 'pdf' 
  | 'image' 
  | 'text' 
  | 'document' 
  | 'spreadsheet' 
  | 'presentation' 
  | 'archive' 
  | 'code' 
  | 'unsupported';

export interface FileTypeInfo {
  type: FileType;
  canPreview: boolean;
  icon: LucideIcon;
  label: string;
}

/**
 * Detect file type from MIME type
 */
function getFileTypeFromName(fileName?: string | null): FileType {
  const ext = getFileExtension(fileName);
  if (!ext) return 'unsupported';

  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['txt', 'md', 'rtf', 'csv', 'log'].includes(ext)) return 'text';
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'xml', 'html', 'css', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'cs', 'php', 'rb', 'sql'].includes(ext)) return 'code';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'unsupported';
}

export function getFileType(mimeType?: string | null, fileName?: string | null): FileType {
  if (!mimeType) return getFileTypeFromName(fileName);

  const mime = mimeType.toLowerCase();

  // PDF
  if (mime.includes('pdf')) return 'pdf';

  // Images
  if (mime.startsWith('image/')) return 'image';

  // Text files
  if (mime.startsWith('text/')) {
    // Code files
    if (mime.includes('javascript') || 
        mime.includes('typescript') || 
        mime.includes('json') || 
        mime.includes('xml') || 
        mime.includes('html') || 
        mime.includes('css') ||
        mime.includes('python') ||
        mime.includes('java') ||
        mime.includes('c++') ||
        mime.includes('csharp')) {
      return 'code';
    }
    return 'text';
  }

  // Documents
  if (mime.includes('word') || 
      mime.includes('document') || 
      mime.includes('msword') || 
      mime.includes('wordprocessingml')) {
    return 'document';
  }

  // Spreadsheets
  if (mime.includes('excel') || 
      mime.includes('spreadsheet') || 
      mime.includes('spreadsheetml')) {
    return 'spreadsheet';
  }

  // Presentations
  if (mime.includes('powerpoint') || 
      mime.includes('presentation') || 
      mime.includes('presentationml')) {
    return 'presentation';
  }

  // Archives
  if (mime.includes('zip') || 
      mime.includes('rar') || 
      mime.includes('tar') || 
      mime.includes('gzip') || 
      mime.includes('7z')) {
    return 'archive';
  }

  // Generic/broken mime types from some browsers/storage should fallback to filename extension
  if (mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
    return getFileTypeFromName(fileName);
  }

  const byName = getFileTypeFromName(fileName);
  return byName !== 'unsupported' ? byName : 'unsupported';
}

/**
 * Get file type information
 */
export function getFileTypeInfo(mimeType?: string | null, fileName?: string | null): FileTypeInfo {
  const type = getFileType(mimeType, fileName);

  const typeMap: Record<FileType, FileTypeInfo> = {
    pdf: {
      type: 'pdf',
      canPreview: true,
      icon: FileText,
      label: 'PDF Document'
    },
    image: {
      type: 'image',
      canPreview: true,
      icon: Image,
      label: 'Image'
    },
    text: {
      type: 'text',
      canPreview: true,
      icon: FileText,
      label: 'Text File'
    },
    code: {
      type: 'code',
      canPreview: true,
      icon: FileCode,
      label: 'Code File'
    },
    document: {
      type: 'document',
      canPreview: false,
      icon: FileType,
      label: 'Document'
    },
    spreadsheet: {
      type: 'spreadsheet',
      canPreview: false,
      icon: FileType,
      label: 'Spreadsheet'
    },
    presentation: {
      type: 'presentation',
      canPreview: false,
      icon: FileType,
      label: 'Presentation'
    },
    archive: {
      type: 'archive',
      canPreview: false,
      icon: Archive,
      label: 'Archive'
    },
    unsupported: {
      type: 'unsupported',
      canPreview: false,
      icon: File,
      label: 'File'
    }
  };

  return typeMap[type];
}

/**
 * Check if file can be previewed
 */
export function canPreview(mimeType?: string | null, fileName?: string | null): boolean {
  return getFileTypeInfo(mimeType, fileName).canPreview;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType?: string | null, fileName?: string | null): LucideIcon {
  return getFileTypeInfo(mimeType, fileName).icon;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Truncate filename to specified length
 */
export function truncateFileName(fileName: string, maxLength: number = 50): string {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = getFileExtension(fileName);
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
  
  return `${truncatedName}...${extension ? '.' + extension : ''}`;
}

