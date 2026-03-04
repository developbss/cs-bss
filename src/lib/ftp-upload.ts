import { Client } from 'basic-ftp';
import { Readable } from 'stream';

const FTP_CONFIG = {
  host: process.env.FTP_HOST || 'ftp.mybss.cloud',
  user: process.env.FTP_USER || 'mybe5217',
  password: process.env.FTP_PASSWORD || '',
  secure: false,
};

const BASE_FTP_PATH = '/public_html/uploads';
const BASE_URL = process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://mybss.cloud';

/**
 * Upload a buffer to FTP server
 * @param buffer - file buffer
 * @param subfolder - e.g. 'chat/images', 'chat/videos', 'avatars'
 * @param filename - target filename
 * @returns public URL of uploaded file
 */
export async function uploadToFTP(
  buffer: Buffer,
  subfolder: string,
  filename: string
): Promise<string> {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    await client.access(FTP_CONFIG);

    // Ensure directory exists
    const targetDir = `${BASE_FTP_PATH}/${subfolder}`;
    await client.ensureDir(targetDir);
    await client.cd(targetDir);

    // Upload from buffer using stream
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, filename);

    // Return public URL
    const publicUrl = `${BASE_URL}/uploads/${subfolder}/${filename}`;
    return publicUrl;
  } catch (error) {
    console.error('FTP upload error:', error);
    throw new Error(`FTP upload failed: ${String(error)}`);
  } finally {
    client.close();
  }
}

/**
 * Generate unique filename with timestamp
 */
export function generateFilename(originalName: string, prefix?: string): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const cleanPrefix = prefix ? `${prefix}-` : '';
  const random = Math.random().toString(36).slice(2, 8);
  return `${cleanPrefix}${Date.now()}-${random}.${ext}`;
}
