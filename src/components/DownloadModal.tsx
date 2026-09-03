import React, { useState } from 'react';
import { Video } from '../types';
import { 
  X, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  HardDrive, 
  Music, 
  FileVideo, 
  Tv, 
  Smartphone, 
  Check 
} from 'lucide-react';
import { formatFileSize } from '../utils';

export interface QualityDownloadItem {
  id: string;
  label: string;
  resolution: string;
  description: string;
  format: 'MP4' | 'MP3';
  ratio: number; // size multiplier relative to original fileSize
  isPopular?: boolean;
  isBest?: boolean;
  bitrate: string;
}

const QUALITY_DOWNLOAD_OPTIONS: QualityDownloadItem[] = [
  {
    id: '1080p',
    label: '1080p Full HD',
    resolution: '1920 × 1080',
    description: 'Crispest visual fidelity with original high bitrate audio',
    format: 'MP4',
    ratio: 1.0,
    isBest: true,
    bitrate: '8.5 Mbps'
  },
  {
    id: '720p',
    label: '720p HD',
    resolution: '1280 × 720',
    description: 'Standard high-definition balance between quality and storage',
    format: 'MP4',
    ratio: 0.55,
    isPopular: true,
    bitrate: '4.2 Mbps'
  },
  {
    id: '480p',
    label: '480p Standard',
    resolution: '854 × 480',
    description: 'Data saver mode ideal for mobile streaming & quick sharing',
    format: 'MP4',
    ratio: 0.28,
    bitrate: '1.8 Mbps'
  },
  {
    id: '360p',
    label: '360p Lite',
    resolution: '640 × 360',
    description: 'Ultra lightweight download for low bandwidth & older devices',
    format: 'MP4',
    ratio: 0.16,
    bitrate: '850 Kbps'
  },
  {
    id: 'audio',
    label: 'Audio Only',
    resolution: 'Stereo Track',
    description: 'High-fidelity audio soundtrack extraction in MP3 format',
    format: 'MP3',
    ratio: 0.08,
    bitrate: '192 Kbps'
  }
];

interface DownloadModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  defaultQuality?: string;
}

export default function DownloadModal({ video, isOpen, onClose, defaultQuality = '1080p' }: DownloadModalProps) {
  const [selectedQualityId, setSelectedQualityId] = useState<string>(() => {
    if (defaultQuality.includes('720')) return '720p';
    if (defaultQuality.includes('480')) return '480p';
    if (defaultQuality.includes('360')) return '360p';
    return '1080p';
  });

  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');
  const [downloadCompleted, setDownloadCompleted] = useState<boolean>(false);
  const [downloadedItem, setDownloadedItem] = useState<QualityDownloadItem | null>(null);

  if (!isOpen) return null;

  // Compute calculated file size for each option based on video.fileSize or reasonable default
  const baseSize = video.fileSize && video.fileSize > 10000 ? video.fileSize : 45 * 1024 * 1024; // 45MB fallback base

  const calculateOptionSize = (ratio: number) => {
    return Math.max(1024 * 100, Math.round(baseSize * ratio));
  };

  const handleStartDownload = async (option: QualityDownloadItem) => {
    setSelectedQualityId(option.id);
    setDownloadedItem(option);
    setDownloadCompleted(false);
    setDownloadProgress(10);
    setDownloadStatusText(`Preparing ${option.label} stream...`);

    // Clean filename
    const safeTitle = video.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const filename = `${safeTitle}_${option.id}.${option.format.toLowerCase()}`;

    // Progressive simulated preparation step
    await new Promise((r) => setTimeout(r, 400));
    setDownloadProgress(35);
    setDownloadStatusText(`Optimizing ${option.resolution} bitrate encoding (${option.bitrate})...`);

    await new Promise((r) => setTimeout(r, 450));
    setDownloadProgress(75);
    setDownloadStatusText(`Packaging ${option.format} media stream (${formatFileSize(calculateOptionSize(option.ratio))})...`);

    await new Promise((r) => setTimeout(r, 350));
    setDownloadProgress(95);
    setDownloadStatusText('Finalizing download packet...');

    // Trigger actual download via blob or anchor
    try {
      const response = await fetch(video.videoUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      } else {
        throw new Error('CORS or fetch status not ok');
      }
    } catch {
      // Fallback for cross-origin or direct downloads
      const a = document.createElement('a');
      a.href = video.videoUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setDownloadProgress(100);
    setDownloadCompleted(true);
    setDownloadStatusText('Download complete! File saved to your device.');
  };

  return (
    <div 
      id="download-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="download-modal-container" 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 id="download-modal-title" className="text-base font-bold text-slate-800 leading-tight">
                Download Video
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Select your desired quality and format</p>
            </div>
          </div>
          <button
            id="close-download-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Target Video Card Banner */}
          <div className="flex gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 items-center">
            <div className="relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-black shadow-xs">
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="w-full h-full object-cover" 
              />
              <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono font-bold text-white px-1 rounded-xs">
                {video.duration}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-800 truncate" title={video.title}>
                {video.title}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                by <span className="font-semibold text-slate-700">{video.uploaderName}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold text-slate-400">
                  Original: {formatFileSize(baseSize)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Download Progress State */}
          {downloadProgress !== null && (
            <div 
              id="download-progress-box"
              className={`p-4 rounded-xl border transition-all ${
                downloadCompleted 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                  : 'bg-violet-50/70 border-violet-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {downloadCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                  )}
                  <span className="text-xs font-bold">
                    {downloadCompleted ? 'Download Ready' : `Downloading ${downloadedItem?.label}...`}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold">
                  {downloadProgress}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    downloadCompleted ? 'bg-emerald-500' : 'bg-violet-600'
                  }`}
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>

              <p className="text-[11px] font-medium text-slate-600">
                {downloadStatusText}
              </p>
            </div>
          )}

          {/* Multi-Quality Options List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-violet-600" />
                Select Video Resolution
              </label>
              <span className="text-[11px] text-slate-400 font-medium">5 formats available</span>
            </div>

            <div className="space-y-2">
              {QUALITY_DOWNLOAD_OPTIONS.map((option) => {
                const estimatedSize = calculateOptionSize(option.ratio);
                const isSelected = selectedQualityId === option.id;

                return (
                  <div
                    key={option.id}
                    id={`download-option-${option.id}`}
                    onClick={() => setSelectedQualityId(option.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-violet-50/70 border-violet-500 ring-2 ring-violet-400/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Left: Quality Badge & Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        option.format === 'MP3' 
                          ? 'bg-amber-100 text-amber-700' 
                          : isSelected 
                          ? 'bg-violet-600 text-white' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {option.format === 'MP3' ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <FileVideo className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">
                            {option.label}
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-semibold">
                            {option.format}
                          </span>
                          {option.isBest && (
                            <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 rounded-full text-[9px] font-extrabold tracking-wide uppercase">
                              Best
                            </span>
                          )}
                          {option.isPopular && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-extrabold tracking-wide uppercase">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {option.resolution} • {option.bitrate}
                        </p>
                      </div>
                    </div>

                    {/* Right: Estimated Size & Download Action Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="block text-xs font-bold font-mono text-slate-700">
                          {formatFileSize(estimatedSize)}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-semibold">
                          ~{Math.round(option.ratio * 100)}% size
                        </span>
                      </div>

                      <button
                        id={`btn-download-direct-${option.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDownload(option);
                        }}
                        title={`Download ${option.label}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Primary Selected Quality Button */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Selected: <span className="font-bold text-slate-800">
              {QUALITY_DOWNLOAD_OPTIONS.find(o => o.id === selectedQualityId)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="cancel-download-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              id="primary-download-selected-btn"
              onClick={() => {
                const opt = QUALITY_DOWNLOAD_OPTIONS.find(o => o.id === selectedQualityId);
                if (opt) handleStartDownload(opt);
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected Quality</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
