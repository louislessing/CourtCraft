'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetType = 'image' | 'copy' | 'voiceover' | 'audio';

interface GalleryAsset {
  id: string;
  type: AssetType;
  label: string;
  content: string;
  format?: string;
  createdAt: string;
  folderId: string | null;
  isFavorite: boolean;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

type FilterView = 'all' | 'favorites' | 'images' | 'copy' | 'voiceover' | 'audio' | string;

const STORAGE_KEY = 'courtcraft_gallery_assets';
const FOLDERS_KEY = 'courtcraft_gallery_folders';

const FOLDER_COLORS = [
  'bg-blue-500/20 border-blue-500/30 text-blue-400',
  'bg-purple-500/20 border-purple-500/30 text-purple-400',
  'bg-green-500/20 border-green-500/30 text-green-400',
  'bg-orange-500/20 border-orange-500/30 text-orange-400',
  'bg-pink-500/20 border-pink-500/30 text-pink-400',
  'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadBase64(base64: string, filename: string, mimeType: string) {
  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = filename;
  link.click();
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadAsset(asset: GalleryAsset) {
  const safeName = asset.label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  if (asset.type === 'image') {
    downloadBase64(asset.content, `${safeName}.png`, 'image/png');
  } else if (asset.type === 'audio') {
    downloadBase64(asset.content, `${safeName}.mp3`, 'audio/mp3');
  } else {
    downloadText(asset.content, `${safeName}.txt`);
  }
}

function typeLabel(type: AssetType) {
  if (type === 'image') return 'Image';
  if (type === 'audio') return 'Audio';
  if (type === 'voiceover') return 'VO Script';
  return 'Copy';
}

function typeColor(type: AssetType) {
  if (type === 'image') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  if (type === 'audio') return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (type === 'voiceover') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
}

function typeIconPath(type: AssetType) {
  if (type === 'image') return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
  if (type === 'audio') return 'M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072';
  if (type === 'voiceover') return 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z';
  return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
interface AssetCardProps {
  asset: GalleryAsset;
  folders: Folder[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMoveToFolder: (assetId: string, folderId: string | null) => void;
  onDelete: (id: string) => void;
  onDownload: (asset: GalleryAsset) => void;
}

function AssetCard({ asset, folders, isSelected, onToggleSelect, onToggleFavorite, onMoveToFolder, onDelete, onDownload }: AssetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div
      className={`relative bg-black/40 border rounded-2xl overflow-hidden transition-all group ${
        isSelected ? 'border-gold-500/50 ring-1 ring-gold-500/20' : 'border-white/08 hover:border-white/15'
      }`}
    >
      {/* Selection checkbox */}
      <button
        onClick={() => onToggleSelect(asset.id)}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-gold-500 border-gold-500' : 'bg-black/60 border-white/30 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Favorite button */}
      <button
        onClick={() => onToggleFavorite(asset.id)}
        className={`absolute top-3 right-10 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
          asset.isFavorite
            ? 'text-yellow-400 bg-yellow-500/20' :'text-white/20 bg-black/60 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={asset.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      {/* Context menu */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white/30 hover:text-white/70 opacity-0 group-hover:opacity-100 transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 w-44 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
            <button
              onClick={() => { onDownload(asset); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/05 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <div className="border-t border-white/08">
              <p className="px-4 py-1.5 text-white/25 text-xs font-bold tracking-widest uppercase">Move to folder</p>
              <button
                onClick={() => { onMoveToFolder(asset.id, null); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/05 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                No folder
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onMoveToFolder(asset.id, f.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/05 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${f.color.split(' ')[0].replace('bg-', 'bg-').replace('/20', '')}`} />
                  {f.name}
                </button>
              ))}
            </div>
            <div className="border-t border-white/08">
              <button
                onClick={() => { onDelete(asset.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset preview */}
      <div className="aspect-square bg-black/60 flex items-center justify-center overflow-hidden">
        {asset.type === 'image' ? (
          <img
            src={`data:image/png;base64,${asset.content}`}
            alt={asset.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${typeColor(asset.type)}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={typeIconPath(asset.type)} />
            </svg>
          </div>
        )}
      </div>

      {/* Asset info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-white/80 text-xs font-bold leading-tight line-clamp-2 flex-1">{asset.label}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${typeColor(asset.type)}`}>
            {typeLabel(asset.type)}
          </span>
          <span className="text-white/25 text-xs">
            {new Date(asset.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </span>
        </div>
        <button
          onClick={() => onDownload(asset)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 rounded-lg text-xs font-bold transition-all"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Create Folder Modal ──────────────────────────────────────────────────────
function CreateFolderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, color: string) => void }) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-white font-bold text-lg mb-4">New Folder</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs font-bold tracking-widest uppercase mb-2">Folder Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Instagram Ads, Q2 Campaign..."
              autoFocus
              className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold-500/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim(), selectedColor)}
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs font-bold tracking-widest uppercase mb-2">Colour</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${c.split(' ').slice(0, 2).join(' ')} ${
                    selectedColor === c ? 'border-white/60 scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-white/10 text-white/50 hover:text-white/70 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), selectedColor)}
            disabled={!name.trim()}
            className="flex-1 py-2.5 bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-400 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssetGalleryPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Auth check
  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) router.replace('/admin/login');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAssets(JSON.parse(raw));
      const rawFolders = localStorage.getItem(FOLDERS_KEY);
      if (rawFolders) setFolders(JSON.parse(rawFolders));
    } catch {}
  }, []);

  // Persist assets
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch {}
  }, [assets]);

  // Persist folders
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    } catch {}
  }, [folders]);

  // ── Filtered assets ──────────────────────────────────────────────────────
  const filteredAssets = assets.filter((a) => {
    const matchesSearch = !searchQuery || a.label.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeView === 'all') return true;
    if (activeView === 'favorites') return a.isFavorite;
    if (activeView === 'images') return a.type === 'image';
    if (activeView === 'copy') return a.type === 'copy';
    if (activeView === 'voiceover') return a.type === 'voiceover';
    if (activeView === 'audio') return a.type === 'audio';
    return a.folderId === activeView;
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
    }
  };

  const handleToggleFavorite = useCallback((id: string) => {
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
  }, []);

  const handleMoveToFolder = useCallback((assetId: string, folderId: string | null) => {
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, folderId } : a));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const handleBulkDelete = () => {
    setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
  };

  const handleBulkDownload = () => {
    const toDownload = assets.filter((a) => selectedIds.has(a.id));
    toDownload.forEach((asset, i) => {
      setTimeout(() => downloadAsset(asset), i * 200);
    });
  };

  const handleBulkMoveToFolder = (folderId: string | null) => {
    setAssets((prev) => prev.map((a) => selectedIds.has(a.id) ? { ...a, folderId } : a));
    setSelectedIds(new Set());
  };

  const handleCreateFolder = (name: string, color: string) => {
    const folder: Folder = {
      id: Date.now().toString(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, folder]);
    setShowCreateFolder(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setAssets((prev) => prev.map((a) => a.folderId === folderId ? { ...a, folderId: null } : a));
    if (activeView === folderId) setActiveView('all');
  };

  const handleRenameFolder = (folderId: string) => {
    if (!editingFolderName.trim()) return;
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f));
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const counts = {
    all: assets.length,
    favorites: assets.filter((a) => a.isFavorite).length,
    images: assets.filter((a) => a.type === 'image').length,
    copy: assets.filter((a) => a.type === 'copy').length,
    voiceover: assets.filter((a) => a.type === 'voiceover').length,
    audio: assets.filter((a) => a.type === 'audio').length,
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarItems: { id: FilterView; label: string; icon: string; count: number }[] = [
    { id: 'all', label: 'All Assets', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', count: counts.all },
    { id: 'favorites', label: 'Favourites', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', count: counts.favorites },
    { id: 'images', label: 'Images', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', count: counts.images },
    { id: 'copy', label: 'Ad Copy', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', count: counts.copy },
    { id: 'voiceover', label: 'VO Scripts', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', count: counts.voiceover },
    { id: 'audio', label: 'Audio', icon: 'M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072', count: counts.audio },
  ];

  const activeFolder = folders.find((f) => f.id === activeView);
  const viewTitle = activeFolder
    ? activeFolder.name
    : sidebarItems.find((s) => s.id === activeView)?.label ?? 'All Assets';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black border-b border-white/08 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="font-display text-xl font-700 text-white">Asset Gallery</h1>
            <p className="text-white/30 text-xs">Organise · Favourite · Download your creative assets</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/creative-studio')}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/25 text-gold-400 rounded-xl text-sm font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white/50 hover:text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-black border-r border-white/08 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-white/05 border border-white/08 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Filter items */}
          <nav className="px-2 pb-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  activeView === item.id
                    ? 'bg-gold-500/15 text-gold-400' :'text-white/50 hover:text-white/70 hover:bg-white/05'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill={item.id === 'favorites' && activeView === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span className="text-xs font-bold">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeView === item.id ? 'bg-gold-500/20 text-gold-400' : 'bg-white/08 text-white/30'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Folders */}
          <div className="px-2 pb-2 flex-1">
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <span className="text-white/25 text-xs font-bold tracking-widest uppercase">Folders</span>
              <button
                onClick={() => setShowCreateFolder(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {folders.length === 0 && (
              <p className="px-3 text-white/20 text-xs">No folders yet</p>
            )}

            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-white/05 border border-white/15 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameFolder(folder.id);
                        if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName(''); }
                      }}
                      onBlur={() => handleRenameFolder(folder.id)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveView(folder.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all mb-0.5 ${
                      activeView === folder.id
                        ? 'bg-white/08 text-white/80' :'text-white/40 hover:text-white/60 hover:bg-white/05'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <span className="text-white/20 text-xs">
                      {assets.filter((a) => a.folderId === folder.id).length}
                    </span>
                  </button>
                )}
                {/* Folder actions on hover */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                    className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/08 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-bold text-base">{viewTitle}</h2>
              <span className="text-white/30 text-sm">{filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}</span>
            </div>

            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">{selectedIds.size} selected</span>
                <button
                  onClick={handleBulkDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/25 text-gold-400 rounded-lg text-xs font-bold transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All
                </button>
                {folders.length > 0 && (
                  <div className="relative group">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-xs font-bold transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                      Move to Folder
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-40 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 hidden group-hover:block">
                      <button
                        onClick={() => handleBulkMoveToFolder(null)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/05 transition-colors"
                      >
                        No folder
                      </button>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleBulkMoveToFolder(f.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/05 transition-colors"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={handleSelectAll}
                disabled={filteredAssets.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/08 text-white/50 hover:text-white/70 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              >
                Select All
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="p-6">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/03 border border-white/08 flex items-center justify-center mb-5">
                  <svg className="w-10 h-10 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <p className="text-white/40 font-bold text-base mb-2">
                  {searchQuery ? 'No assets match your search' : activeView === 'favorites' ? 'No favourites yet' : 'No assets here yet'}
                </p>
                <p className="text-white/20 text-sm mb-6">
                  {searchQuery ? 'Try a different search term' : 'Generate assets in the Creative Studio and save them here'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push('/admin/creative-studio')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/25 text-gold-400 rounded-xl text-sm font-bold transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Open Creative Studio
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    folders={folders}
                    isSelected={selectedIds.has(asset.id)}
                    onToggleSelect={handleToggleSelect}
                    onToggleFavorite={handleToggleFavorite}
                    onMoveToFolder={handleMoveToFolder}
                    onDelete={handleDelete}
                    onDownload={downloadAsset}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  );
}
