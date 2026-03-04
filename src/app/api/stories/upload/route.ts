import { NextRequest, NextResponse } from 'next/server';
import { uploadToFTP, generateFilename } from '@/lib/ftp-upload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    // Determine media type from file
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename with story prefix
    const filename = generateFilename(file.name, 'story');

    // Upload to FTP server (permanent storage)
    const url = await uploadToFTP(buffer, 'stories', filename);

    return NextResponse.json({ success: true, url, media_type: mediaType });
  } catch (error) {
    console.error('Story upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
