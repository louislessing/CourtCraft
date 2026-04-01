'use client';

import React, { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BUCKET = 'case-files';

const ALLOWED_TYPES: Record<string, string[]> = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  screenshots: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  receipts: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  evidence: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
  ],
  all: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
  ],
};

const ACCEPT_STRINGS: Record<string, string> = {
  documents: '.pdf,.doc,.docx,.xls,.xlsx,.txt',
  images: '.jpg,.jpeg,.png,.gif,.webp',
  screenshots: '.jpg,.jpeg,.png,.gif,.webp',
  receipts: '.jpg,.jpeg,.png,.webp,.pdf',
  evidence: '.jpg,.jpeg,.png,.gif,.webp,.pdf,.mp4,.mov,.mp3,.wav',
  all: '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.mp3,.wav',
};

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'PhotoIcon';
  if (mimeType === 'application/pdf') return 'DocumentTextIcon';
  if (mimeType.startsWith('video/')) return 'FilmIcon';
  if (mimeType.startsWith('audio/')) return 'MusicalNoteIcon';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'TableCellsIcon';
  return 'DocumentIcon';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface UploadedFile {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  context_id?: string | null;
}

interface FileUploadProps {
  context: string;
  contextId?: string;
  label?: string;
  accept?: keyof typeof ALLOWED_TYPES;
  maxSizeMB?: number;
  multiple?: boolean;
  existingFiles?: UploadedFile[];
  onUploaded?: (file: UploadedFile) => void;
  onDeleted?: (fileId: string) => void;
  compact?: boolean;
  inputId?: string;
}

export default function FileUpload({
  context,
  contextId,
  label = 'Upload File',
  accept = 'all',
  maxSizeMB = 50,
  multiple = true,
  existingFiles = [],
  onUploaded,
  onDeleted,
  compact = false,
  inputId,
}: FileUploadProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;
  const allowedMimes = ALLOWED_TYPES[accept] || ALLOWED_TYPES.all;

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    setError(null);

    if (!allowedMimes.includes(file.type)) {
      setError(`File type not allowed. Accepted: ${ACCEPT_STRINGS[accept]}`);
      return;
    }
    if (file.size > maxBytes) {
      setError(`File too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const ext = file.name.split('.').pop();
      const storagePath = `${user.id}/${context}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      // Simulate progress steps
      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      setProgress(70);

      // Save metadata
      const { data: meta, error: metaError } = await supabase
        .from('file_uploads')
        .insert({
          user_id: user.id,
          bucket_name: BUCKET,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          context,
          context_id: contextId || null,
        })
        .select()
        .single();

      if (metaError) throw metaError;

      setProgress(100);
      setTimeout(() => { setProgress(0); setUploading(false); }, 600);

      if (onUploaded && meta) onUploaded(meta as UploadedFile);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  }, [user, context, contextId, allowedMimes, maxBytes, maxSizeMB, accept, onUploaded, supabase]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (!multiple && arr.length > 1) {
      setError('Only one file allowed.');
      return;
    }
    arr.forEach(uploadFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!user) return;
    try {
      await supabase.storage.from(BUCKET).remove([file.storage_path]);
      await supabase.from('file_uploads').delete().eq('id', file.id);
      if (onDeleted) onDeleted(file.id);
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  const handlePreview = async (file: UploadedFile) => {
    try {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(file.storage_path, 300);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewFile(file);
      }
    } catch {
      setError('Could not generate preview URL.');
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(file.storage_path, 60);
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = file.file_name;
        a.click();
      }
    } catch {
      setError('Could not generate download URL.');
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-white text-opacity-70 hover:text-white transition-colors disabled:opacity-50 border border-navy-600"
          >
            {uploading ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="PaperClipIcon" size={12} className="text-gold-400" />
            )}
            {uploading ? `Uploading ${progress}%` : label}
          </button>
          {existingFiles.length > 0 && (
            <span className="text-xs text-white text-opacity-40">{existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {uploading && (
          <div className="h-1 rounded-full bg-navy-700 overflow-hidden">
            <div className="h-full bg-gold-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Icon name="ExclamationCircleIcon" size={11} />
            {error}
          </p>
        )}

        {existingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {existingFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-navy-700 border border-navy-600">
                <Icon name={getFileIcon(f.mime_type) as any} size={11} className="text-gold-400 flex-shrink-0" />
                <span className="text-xs text-white text-opacity-70 max-w-[100px] truncate">{f.file_name}</span>
                <button onClick={() => handlePreview(f)} className="text-white text-opacity-40 hover:text-white transition-colors ml-0.5">
                  <Icon name="EyeIcon" size={10} />
                </button>
                <button onClick={() => handleDelete(f)} className="text-white text-opacity-40 hover:text-red-400 transition-colors">
                  <Icon name="XMarkIcon" size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          id={inputId}
          accept={ACCEPT_STRINGS[accept]}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {previewUrl && previewFile && (
          <FilePreviewModal
            url={previewUrl}
            file={previewFile}
            onClose={() => { setPreviewUrl(null); setPreviewFile(null); }}
            onDownload={() => handleDownload(previewFile)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-gold-500 bg-gold-500 bg-opacity-5' :'border-navy-600 hover:border-navy-500 bg-navy-800 bg-opacity-50'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-white text-opacity-60">Uploading... {progress}%</p>
              <div className="w-full max-w-xs h-1.5 rounded-full bg-navy-700 overflow-hidden">
                <div className="h-full bg-gold-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center">
                <Icon name="CloudArrowUpIcon" size={20} className="text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-white text-opacity-70">
                  <span className="text-gold-400 font-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-white text-opacity-40 mt-0.5">
                  {ACCEPT_STRINGS[accept].replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} • Max {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20">
          <Icon name="ExclamationCircleIcon" size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <Icon name="XMarkIcon" size={12} />
          </button>
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="label-tag text-white text-opacity-40" style={{ fontSize: '9px' }}>UPLOADED FILES ({existingFiles.length})</p>
          {existingFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-navy-800 border border-navy-600">
              <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
                <Icon name={getFileIcon(f.mime_type) as any} size={16} className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-600 truncate">{f.file_name}</p>
                <p className="text-xs text-white text-opacity-40">{formatBytes(f.file_size)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handlePreview(f)}
                  className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-navy-600 flex items-center justify-center transition-colors"
                  title="Preview"
                >
                  <Icon name="EyeIcon" size={13} className="text-white text-opacity-60" />
                </button>
                <button
                  onClick={() => handleDownload(f)}
                  className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-navy-600 flex items-center justify-center transition-colors"
                  title="Download"
                >
                  <Icon name="ArrowDownTrayIcon" size={13} className="text-white text-opacity-60" />
                </button>
                <button
                  onClick={() => handleDelete(f)}
                  className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-red-500 hover:bg-opacity-20 flex items-center justify-center transition-colors"
                  title="Delete"
                >
                  <Icon name="TrashIcon" size={13} className="text-red-400 text-opacity-60 hover:text-opacity-100" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        id={inputId}
        accept={ACCEPT_STRINGS[accept]}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {previewUrl && previewFile && (
        <FilePreviewModal
          url={previewUrl}
          file={previewFile}
          onClose={() => { setPreviewUrl(null); setPreviewFile(null); }}
          onDownload={() => handleDownload(previewFile)}
        />
      )}
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
interface PreviewModalProps {
  url: string;
  file: UploadedFile;
  onClose: () => void;
  onDownload: () => void;
}

function FilePreviewModal({ url, file, onClose, onDownload }: PreviewModalProps) {
  const isImage = file.mime_type.startsWith('image/');
  const isPdf = file.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80" onClick={onClose}>
      <div
        className="bg-navy-900 border border-navy-600 rounded-3xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-navy-600">
          <div className="flex items-center gap-3">
            <Icon name={getFileIcon(file.mime_type) as any} size={18} className="text-gold-400" />
            <div>
              <p className="text-sm font-display font-700 text-white truncate max-w-xs">{file.file_name}</p>
              <p className="text-xs text-white text-opacity-40">{formatBytes(file.file_size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDownload} className="btn-outline text-xs py-1.5 px-3">
              <Icon name="ArrowDownTrayIcon" size={13} />
              Download
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-navy-700 hover:bg-navy-600 flex items-center justify-center transition-colors">
              <Icon name="XMarkIcon" size={16} className="text-white text-opacity-60" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
          {isImage ? (
            <img src={url} alt={file.file_name} className="max-w-full max-h-[60vh] object-contain rounded-xl" />
          ) : isPdf ? (
            <iframe src={url} className="w-full h-[60vh] rounded-xl border border-navy-600" title={file.file_name} />
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto">
                <Icon name={getFileIcon(file.mime_type) as any} size={32} className="text-gold-400" />
              </div>
              <p className="text-sm text-white text-opacity-60">Preview not available for this file type.</p>
              <button onClick={onDownload} className="btn-gold text-xs py-2 px-4">
                <Icon name="ArrowDownTrayIcon" size={14} className="text-navy-900" />
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
