import { NextRequest, NextResponse } from 'next/server';
import { uploadToFTP, generateFilename } from '@/lib/ftp-upload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const csName = formData.get('csName') as string;

    if (!file || !csName) {
      return NextResponse.json({ error: 'File and csName required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename with CS name prefix
    const cleanName = csName.toLowerCase().replace(/\s+/g, '-');
    const filename = generateFilename(file.name, `cs-${cleanName}`);

    // Upload to FTP server (permanent storage)
    const url = await uploadToFTP(buffer, 'avatars', filename);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
