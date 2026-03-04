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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename with banner prefix
    const filename = generateFilename(file.name, 'banner');

    // Upload to FTP server (permanent storage)
    const url = await uploadToFTP(buffer, 'banners', filename);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Banner upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
