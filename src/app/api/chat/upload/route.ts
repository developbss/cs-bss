import { NextRequest, NextResponse } from 'next/server';
import { uploadToFTP, generateFilename } from '@/lib/ftp-upload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed. Only images and videos.' }, { status: 400 });
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 25MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine subfolder and message type
    const isVideo = file.type.startsWith('video/');
    const subfolder = isVideo ? 'chat/videos' : 'chat/images';
    const messageType = isVideo ? 'video' : 'image';

    // Generate unique filename
    const filename = generateFilename(file.name, messageType);

    // Upload to FTP server (permanent storage)
    const url = await uploadToFTP(buffer, subfolder, filename);

    return NextResponse.json({
      url,
      messageType,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
