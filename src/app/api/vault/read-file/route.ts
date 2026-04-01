import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'case-files';

// Text-readable MIME types
const TEXT_TYPES = [
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
];

// Binary types we can pass as base64 to Claude
const BINARY_READABLE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    const { fileId, userId } = await request.json();

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'Missing fileId or userId' }, { status: 400 });
    }

    // Use service role to bypass RLS for server-side read
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify file belongs to user
    const { data: fileMeta, error: metaError } = await supabase
      .from('file_uploads')
      .select('id, file_name, storage_path, mime_type, file_size, context')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (metaError || !fileMeta) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
    }

    // Check file size limit (10MB for AI reading)
    if (fileMeta.file_size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large for AI reading (max 10MB)',
        fileName: fileMeta.file_name,
      }, { status: 413 });
    }

    const mimeType = fileMeta.mime_type || 'application/octet-stream';
    const isTextType = TEXT_TYPES.includes(mimeType);
    const isBinaryReadable = BINARY_READABLE_TYPES.includes(mimeType);

    if (!isTextType && !isBinaryReadable) {
      return NextResponse.json({
        error: `File type "${mimeType}" cannot be read by AI. Supported: PDF, images, text files.`,
        fileName: fileMeta.file_name,
        unsupported: true,
      }, { status: 415 });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(fileMeta.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
    }

    if (isTextType) {
      // Return as plain text
      const text = await fileData.text();
      return NextResponse.json({
        fileName: fileMeta.file_name,
        mimeType,
        contentType: 'text',
        content: text,
        folder: fileMeta.context?.replace('dashboard-secure/', '') || 'General',
      });
    } else {
      // Return as base64 for binary files (PDF, images)
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return NextResponse.json({
        fileName: fileMeta.file_name,
        mimeType,
        contentType: 'binary',
        base64,
        folder: fileMeta.context?.replace('dashboard-secure/', '') || 'General',
      });
    }
  } catch (err: any) {
    console.error('Vault read-file error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
