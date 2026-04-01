'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useImageGeneration } from '@/lib/hooks/useImageGeneration';
import { useChat } from '@/lib/hooks/useChat';
import toast from 'react-hot-toast';
import AppLogo from '@/components/ui/AppLogo';

// ─── Types ────────────────────────────────────────────────────────────────────
type StudioTab = 'image' | 'copy' | 'voiceover' | 'audio';

interface GeneratedAsset {
  id: string;
  type: 'image' | 'copy' | 'voiceover' | 'audio';
  label: string;
  content: string; // base64 for image/audio, text for copy/voiceover
  format?: string;
  createdAt: string;
}

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

// ─── Image Generation Tab ─────────────────────────────────────────────────────
function ImageGenerationTab({ onAssetSaved }: { onAssetSaved: (asset: GeneratedAsset) => void }) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1536x1024' | '1024x1536'>('1024x1024');
  const [quality, setQuality] = useState<'auto' | 'high' | 'medium' | 'low'>('high');
  const [style, setStyle] = useState('');
  const [savedImage, setSavedImage] = useState<string | null>(null);

  const { image, isLoading, error, generate } = useImageGeneration('OPEN_AI', 'gpt-image-1');

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  useEffect(() => {
    if (image?.data?.[0]?.b64_json) {
      setSavedImage(image.data[0].b64_json);
    }
  }, [image]);

  const handleGenerate = () => {
    if (!prompt.trim() || isLoading) return;
    const fullPrompt = style ? `${prompt}. Style: ${style}` : prompt;
    generate(fullPrompt, { size, quality });
  };

  const handleSave = () => {
    if (!savedImage) return;
    const asset: GeneratedAsset = {
      id: Date.now().toString(),
      type: 'image',
      label: prompt.slice(0, 50) || 'Ad Image',
      content: savedImage,
      format: 'png',
      createdAt: new Date().toISOString(),
    };
    onAssetSaved(asset);
    toast.success('Image saved to assets');
  };

  const handleDownload = () => {
    if (!savedImage) return;
    downloadBase64(savedImage, `ad-image-${Date.now()}.png`, 'image/png');
  };

  const adStylePresets = [
    'Bold and vibrant with high contrast',
    'Minimalist and clean, white background',
    'Cinematic, dramatic lighting',
    'Flat design, modern illustration',
    'Luxury, dark and gold tones',
    'Playful and colourful, cartoon style',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Ad Description</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your ad image in detail — product, scene, mood, target audience..."
            rows={5}
            disabled={isLoading}
            className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-gold-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Style Preset</label>
          <div className="grid grid-cols-2 gap-2">
            {adStylePresets.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(style === s ? '' : s)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                  style === s
                    ? 'bg-gold-500/15 border-gold-500/30 text-gold-400' :'bg-white/03 border-white/08 text-white/40 hover:text-white/60 hover:border-white/15'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as typeof size)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              <option value="1024x1024">Square (1:1)</option>
              <option value="1536x1024">Landscape (3:2)</option>
              <option value="1024x1536">Portrait (2:3)</option>
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low (Fast)</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-400 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generating Image...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Generate Ad Image
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-black/40 border border-white/08 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/08 flex items-center justify-between">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Preview</span>
          {savedImage && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-400 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PNG
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-6 min-h-[300px]">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/15 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-400/60 animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">Creating your ad image...</p>
              <p className="text-white/20 text-xs mt-1">This may take 15–30 seconds</p>
            </div>
          ) : savedImage ? (
            <img
              src={`data:image/png;base64,${savedImage}`}
              alt="Generated ad"
              className="max-w-full max-h-[500px] rounded-xl object-contain"
            />
          ) : (
            <div className="text-center">
              <svg className="w-12 h-12 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 002.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-white/25 text-sm">Your generated image will appear here</p>
            </div>
          )}
        </div>
        {image?.data?.[0]?.revised_prompt && (
          <div className="px-5 py-3 border-t border-white/08">
            <p className="text-white/30 text-xs"><span className="text-white/50 font-bold">Revised prompt:</span> {image.data[0].revised_prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ad Copy Tab ──────────────────────────────────────────────────────────────
function AdCopyTab({ onAssetSaved }: { onAssetSaved: (asset: GeneratedAsset) => void }) {
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('Professional');
  const [copyType, setCopyType] = useState('Full Ad Package');

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-5', false);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const handleGenerate = () => {
    if (!product.trim() || isLoading) return;

    const systemPrompt = `You are an expert advertising copywriter specialising in high-converting social media ads. 
Create compelling, platform-optimised ad copy that drives engagement and conversions.
Format your response clearly with labelled sections.`;

    const userPrompt = `Create ${copyType} for the following:

Product/Service: ${product}
Target Audience: ${audience || 'General audience'}
Platform: ${platform}
Tone: ${tone}

${copyType === 'Full Ad Package' ? `Please provide:
1. **Headline** (5-8 words, attention-grabbing)
2. **Sub-headline** (10-15 words)
3. **Body Copy** (2-3 sentences, benefit-focused)
4. **Call to Action** (3-5 words)
5. **Hashtags** (5-8 relevant hashtags)
6. **Hook Variation** (alternative opening line)` : ''}

${copyType === 'Headlines Only' ? 'Provide 5 different headline variations, each on a new line.' : ''}
${copyType === 'Social Media Captions' ? 'Write 3 different caption variations optimised for engagement.' : ''}
${copyType === 'Email Subject Lines' ? 'Write 5 compelling email subject lines with open rate optimisation tips.' : ''}`;

    sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { max_completion_tokens: 1000 });
  };

  const handleSave = () => {
    if (!response) return;
    const asset: GeneratedAsset = {
      id: Date.now().toString(),
      type: 'copy',
      label: `${copyType} — ${product.slice(0, 40)}`,
      content: response,
      createdAt: new Date().toISOString(),
    };
    onAssetSaved(asset);
    toast.success('Copy saved to assets');
  };

  const handleDownload = () => {
    if (!response) return;
    downloadText(response, `ad-copy-${Date.now()}.txt`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Product / Service</label>
          <textarea
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Describe your product or service in detail..."
            rows={3}
            disabled={isLoading}
            className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-gold-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Target Audience</label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. UK parents aged 30-45, small business owners..."
            disabled={isLoading}
            className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              {['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Twitter/X', 'YouTube', 'Google Ads'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              {['Professional', 'Conversational', 'Urgent', 'Inspirational', 'Humorous', 'Authoritative', 'Empathetic'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Copy Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['Full Ad Package', 'Headlines Only', 'Social Media Captions', 'Email Subject Lines'].map((ct) => (
              <button
                key={ct}
                onClick={() => setCopyType(ct)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  copyType === ct
                    ? 'bg-gold-500/15 border-gold-500/30 text-gold-400' :'bg-white/03 border-white/08 text-white/40 hover:text-white/60'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !product.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-400 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Writing Copy...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Generate Ad Copy
            </>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="bg-black/40 border border-white/08 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/08 flex items-center justify-between">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Generated Copy</span>
          {response && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-400 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download TXT
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-gold-400/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <p className="text-white/30 text-sm">Writing your ad copy...</p>
              </div>
            </div>
          ) : response ? (
            <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{response}</div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <svg className="w-12 h-12 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-white/25 text-sm">Your generated copy will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Voiceover Script Tab ─────────────────────────────────────────────────────
function VoiceoverScriptTab({ onAssetSaved }: { onAssetSaved: (asset: GeneratedAsset) => void }) {
  const [brief, setBrief] = useState('');
  const [duration, setDuration] = useState('30');
  const [scriptStyle, setScriptStyle] = useState('Conversational');
  const [platform, setPlatform] = useState('Social Media');

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-5', false);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const handleGenerate = () => {
    if (!brief.trim() || isLoading) return;

    const wordCount = parseInt(duration) === 15 ? '35-40' : parseInt(duration) === 30 ? '70-80' : parseInt(duration) === 60 ? '140-160' : '280-320';

    sendMessage([
      {
        role: 'system',
        content: `You are a professional voiceover scriptwriter for advertising. Write scripts that are natural to speak aloud, with clear pacing and emotional impact. Include delivery notes in [brackets].`,
      },
      {
        role: 'user',
        content: `Write a ${duration}-second voiceover script for:

Brief: ${brief}
Platform: ${platform}
Style: ${scriptStyle}
Target word count: ${wordCount} words

Format the output as:
**SCRIPT:**
[The actual script with delivery notes in brackets]

**DELIVERY NOTES:**
[Overall pacing, tone, and emphasis guidance]

**WORD COUNT:** [approximate count]`,
      },
    ], { max_completion_tokens: 800 });
  };

  const handleSave = () => {
    if (!response) return;
    const asset: GeneratedAsset = {
      id: Date.now().toString(),
      type: 'voiceover',
      label: `${duration}s Script — ${brief.slice(0, 40)}`,
      content: response,
      createdAt: new Date().toISOString(),
    };
    onAssetSaved(asset);
    toast.success('Script saved to assets');
  };

  const handleDownload = () => {
    if (!response) return;
    downloadText(response, `voiceover-script-${Date.now()}.txt`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Ad Brief</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe the ad — product, key message, emotion you want to evoke..."
            rows={4}
            disabled={isLoading}
            className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-gold-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="120">2 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/05 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/40 transition-colors"
            >
              {['Social Media', 'YouTube', 'TV Commercial', 'Radio', 'Podcast Ad', 'Explainer Video'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Script Style</label>
          <div className="grid grid-cols-2 gap-2">
            {['Conversational', 'Authoritative', 'Energetic', 'Warm & Friendly', 'Dramatic', 'Storytelling'].map((s) => (
              <button
                key={s}
                onClick={() => setScriptStyle(s)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  scriptStyle === s
                    ? 'bg-gold-500/15 border-gold-500/30 text-gold-400' :'bg-white/03 border-white/08 text-white/40 hover:text-white/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !brief.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-400 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Writing Script...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Generate Voiceover Script
            </>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="bg-black/40 border border-white/08 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/08 flex items-center justify-between">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Script Output</span>
          {response && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-400 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download TXT
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-gold-400/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <p className="text-white/30 text-sm">Writing your script...</p>
              </div>
            </div>
          ) : response ? (
            <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{response}</div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <svg className="w-12 h-12 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-white/25 text-sm">Your voiceover script will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audio TTS Tab ────────────────────────────────────────────────────────────
function AudioTTSTab({ onAssetSaved }: { onAssetSaved: (asset: GeneratedAsset) => void }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const voices = [
    { id: 'alloy', label: 'Alloy', desc: 'Neutral, balanced' },
    { id: 'echo', label: 'Echo', desc: 'Deep, resonant' },
    { id: 'fable', label: 'Fable', desc: 'Warm, storytelling' },
    { id: 'onyx', label: 'Onyx', desc: 'Deep, authoritative' },
    { id: 'nova', label: 'Nova', desc: 'Bright, energetic' },
    { id: 'shimmer', label: 'Shimmer', desc: 'Soft, friendly' },
  ];

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setAudioBase64(null);
    setAudioUrl(null);

    try {
      const res = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed, model: 'tts-1-hd' }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'TTS generation failed');
        return;
      }

      const data = await res.json();
      const b64 = data.audio;
      setAudioBase64(b64);
      const blob = base64ToBlob(b64, 'audio/mp3');
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err: any) {
      toast.error(err.message || 'TTS request failed');
    } finally {
      setIsLoading(false);
    }
  }, [text, voice, speed, isLoading]);

  const handleSave = () => {
    if (!audioBase64) return;
    const asset: GeneratedAsset = {
      id: Date.now().toString(),
      type: 'audio',
      label: `Audio — ${text.slice(0, 50)}`,
      content: audioBase64,
      format: 'mp3',
      createdAt: new Date().toISOString(),
    };
    onAssetSaved(asset);
    toast.success('Audio saved to assets');
  };

  const handleDownload = () => {
    if (!audioBase64) return;
    downloadBase64(audioBase64, `voiceover-${Date.now()}.mp3`, 'audio/mp3');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Script / Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your voiceover script or any text to convert to speech..."
            rows={6}
            disabled={isLoading}
            className="w-full bg-white/05 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-gold-500/40 transition-colors disabled:opacity-50"
          />
          <p className="text-white/25 text-xs mt-1">{text.length} characters · ~{Math.ceil(text.split(' ').filter(Boolean).length / 150)} min read</p>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Voice</label>
          <div className="grid grid-cols-2 gap-2">
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  voice === v.id
                    ? 'bg-gold-500/15 border-gold-500/30 text-gold-400' :'bg-white/03 border-white/08 text-white/50 hover:text-white/70 hover:border-white/15'
                }`}
              >
                <p className="text-xs font-bold">{v.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-bold tracking-widest uppercase mb-2">
            Speed: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.25"
            max="4.0"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            disabled={isLoading}
            className="w-full accent-yellow-400"
          />
          <div className="flex justify-between text-white/25 text-xs mt-1">
            <span>0.25x (Slow)</span>
            <span>1.0x (Normal)</span>
            <span>4.0x (Fast)</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-400 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generating Audio...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Audio
            </>
          )}
        </button>
      </div>

      {/* Audio Player */}
      <div className="bg-black/40 border border-white/08 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/08 flex items-center justify-between">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Audio Output</span>
          {audioBase64 && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-400 rounded-lg text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download MP3
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/15 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-400/60 animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">Synthesising voice...</p>
            </div>
          ) : audioUrl ? (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{voices.find((v) => v.id === voice)?.label} Voice</p>
                  <p className="text-white/40 text-xs">{speed}x speed · HD quality</p>
                </div>
              </div>
              <audio
                controls
                src={audioUrl}
                className="w-full"
                style={{ filter: 'invert(0.8) sepia(0.3) saturate(2) hue-rotate(10deg)' }}
              />
              <p className="text-white/25 text-xs text-center">Use the player above to preview, then download your MP3</p>
            </div>
          ) : (
            <div className="text-center">
              <svg className="w-12 h-12 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/25 text-sm">Your audio will appear here</p>
              <p className="text-white/15 text-xs mt-1">Supports up to 4,096 characters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved Assets Panel ───────────────────────────────────────────────────────
function SavedAssetsPanel({ assets, onClear }: { assets: GeneratedAsset[]; onClear: () => void }) {
  if (assets.length === 0) return null;

  const handleDownload = (asset: GeneratedAsset) => {
    if (asset.type === 'image') {
      downloadBase64(asset.content, `${asset.label.replace(/\s+/g, '-')}.png`, 'image/png');
    } else if (asset.type === 'audio') {
      downloadBase64(asset.content, `${asset.label.replace(/\s+/g, '-')}.mp3`, 'audio/mp3');
    } else {
      downloadText(asset.content, `${asset.label.replace(/\s+/g, '-')}.txt`);
    }
  };

  const typeIcon = (type: GeneratedAsset['type']) => {
    if (type === 'image') return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    if (type === 'audio') return 'M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072';
    return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
  };

  const typeColor = (type: GeneratedAsset['type']) => {
    if (type === 'image') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (type === 'audio') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (type === 'voiceover') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-gold-400 bg-gold-500/10 border-gold-500/20';
  };

  return (
    <div className="bg-black/40 border border-white/08 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/08 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-white font-bold text-sm">Saved Assets</span>
          <span className="bg-gold-500/15 text-gold-400 text-xs font-bold px-2 py-0.5 rounded-full border border-gold-500/20">{assets.length}</span>
        </div>
        <button
          onClick={onClear}
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="divide-y divide-white/05">
        {assets.map((asset) => (
          <div key={asset.id} className="flex items-center gap-4 px-5 py-3">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${typeColor(asset.type)}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={typeIcon(asset.type)} />
              </svg>
            </div>
            {asset.type === 'image' && (
              <img
                src={`data:image/png;base64,${asset.content}`}
                alt={asset.label}
                className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm font-bold truncate">{asset.label}</p>
              <p className="text-white/30 text-xs">{new Date(asset.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {asset.type}</p>
            </div>
            <button
              onClick={() => handleDownload(asset)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 rounded-lg text-xs font-bold transition-all flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteArrays: Uint8Array[] = [];
  for (let i = 0; i < byteChars.length; i += 512) {
    const slice = byteChars.slice(i, i + 512);
    const byteNumbers = Array.from(slice).map((c) => c.charCodeAt(0));
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreativeStudioPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('image');
  const [savedAssets, setSavedAssets] = useState<GeneratedAsset[]>([]);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) router.replace('/admin/login');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  const handleAssetSaved = useCallback((asset: GeneratedAsset) => {
    setSavedAssets((prev) => {
      const next = [asset, ...prev];
      // Persist to gallery storage
      try {
        const GALLERY_KEY = 'courtcraft_gallery_assets';
        const existing = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
        const galleryAsset = { ...asset, folderId: null, isFavorite: false };
        localStorage.setItem(GALLERY_KEY, JSON.stringify([galleryAsset, ...existing]));
      } catch {}
      return next;
    });
  }, []);

  const studioTabs: { id: StudioTab; label: string; icon: string; desc: string }[] = [
    {
      id: 'image',
      label: 'Ad Images',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      desc: 'Generate stunning ad visuals',
    },
    {
      id: 'copy',
      label: 'Ad Copy',
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      desc: 'Write high-converting copy',
    },
    {
      id: 'voiceover',
      label: 'VO Scripts',
      icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
      desc: 'Create voiceover scripts',
    },
    {
      id: 'audio',
      label: 'Audio TTS',
      icon: 'M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      desc: 'Convert scripts to speech',
    },
  ];

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black border-b border-white/08 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="font-display text-xl font-700 text-white">AI Creative Studio</h1>
            <p className="text-white/30 text-xs">Powered by OpenAI · Image Generation · Ad Copy · Voiceover · TTS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/asset-gallery')}
            className="flex items-center gap-2 px-4 py-2 bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-xl text-sm font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Asset Gallery
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white/60 hover:text-white/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Studio Tabs */}
      <div className="bg-black border-b border-white/08 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-2">
            {studioTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                  activeTab === t.id
                    ? 'bg-gold-500/15 border-gold-500/30 text-gold-400' :'bg-white/03 border-white/08 text-white/50 hover:text-white/70 hover:border-white/15'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
                <div className="text-left">
                  <p className="leading-tight">{t.label}</p>
                  <p className={`text-xs font-normal leading-tight mt-0.5 ${activeTab === t.id ? 'text-gold-400/60' : 'text-white/25'}`}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {activeTab === 'image' && <ImageGenerationTab onAssetSaved={handleAssetSaved} />}
        {activeTab === 'copy' && <AdCopyTab onAssetSaved={handleAssetSaved} />}
        {activeTab === 'voiceover' && <VoiceoverScriptTab onAssetSaved={handleAssetSaved} />}
        {activeTab === 'audio' && <AudioTTSTab onAssetSaved={handleAssetSaved} />}

        <SavedAssetsPanel assets={savedAssets} onClear={() => setSavedAssets([])} />
      </div>
    </div>
  );
}
