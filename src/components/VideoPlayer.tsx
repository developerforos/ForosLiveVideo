import React, { useState, useEffect, useRef } from 'react';
import { Video, Comment, User, Playlist } from '../types';
import { 
  ThumbsUp, 
  Share2, 
  FolderPlus, 
  CornerUpRight, 
  Sparkles, 
  Send, 
  X, 
  Edit, 
  Trash2, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Check, 
  Sliders, 
  Gauge, 
  Zap,
  Globe,
  MessageSquare,
  Download,
  ArrowDownToLine
} from 'lucide-react';
import { formatViews, formatFileSize, timeAgo } from '../utils';
import DownloadModal from './DownloadModal';

export type FitMode = 'contain' | 'cover' | 'fill';
export type QualityOption = 'Auto (1080p)' | '1080p HD' | '720p HD' | '480p' | '360p' | '240p';
export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

interface VideoPlayerProps {
  video: Video;
  currentUser: User | null;
  comments: Comment[];
  playlists: Playlist[];
  onAddComment: (text: string) => void;
  onEditComment?: (commentId: string, text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeVideo: (videoId: string) => void;
  onIncrementShare: (videoId: string) => void;
  onIncrementView: (videoId: string) => void;
  onOpenPlaylistModal: (videoId: string) => void;
  suggestedVideos: Video[];
  onSelectVideo: (video: Video) => void;
  onSelectChannel?: (channelId: string) => void;
  onEditVideo?: (video: Video) => void;
  onDeleteVideo?: (videoId: string) => void;
  isSubscribed?: boolean;
  subscriberCount?: number;
  onToggleSubscription?: (channelId: string) => void;
  onExit?: () => void;
}

export default function VideoPlayer({
  video,
  currentUser,
  comments,
  playlists,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onLikeVideo,
  onIncrementShare,
  onIncrementView,
  onOpenPlaylistModal,
  suggestedVideos,
  onSelectVideo,
  onSelectChannel,
  onEditVideo,
  onDeleteVideo,
  isSubscribed = false,
  subscriberCount = 0,
  onToggleSubscription,
  onExit
}: VideoPlayerProps) {
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  // Player Interface customization states
  const [fitMode, setFitMode] = useState<FitMode>('cover'); // default to screen fit
  const [quality, setQuality] = useState<QualityOption>('1080p HD');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackRate>(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'quality' | 'speed' | 'fit'>('main');
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [showInVideoControls, setShowInVideoControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const viewLogged = useRef<string | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 3-second auto-hide timer for in-video settings and HD options
  const resetInVideoControlsTimer = () => {
    setShowInVideoControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowInVideoControls(false);
      setShowSettingsMenu(false);
    }, 3000);
  };

  // Auto-track view when video changes or starts playing and kick off 3s auto-hide
  useEffect(() => {
    if (viewLogged.current !== video.id) {
      onIncrementView(video.id);
      viewLogged.current = video.id;
    }
    setHasLiked(false);
    resetInVideoControlsTimer();

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [video.id]);

  // Sync playback rate to element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
        setSettingsView('main');
      }
    };
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
    } else {
      document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
    }
  };

  const handleSelectQuality = (newQuality: QualityOption) => {
    setQuality(newQuality);
    setShowSettingsMenu(false);
    setSettingsView('main');
    resetInVideoControlsTimer();
    setQualityNotification(`Video quality switched to ${newQuality}`);
    setTimeout(() => {
      setQualityNotification(null);
    }, 2800);
  };

  const handleSelectSpeed = (speed: PlaybackRate) => {
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
    setSettingsView('main');
    resetInVideoControlsTimer();
  };

  const handleSelectFit = (mode: FitMode) => {
    setFitMode(mode);
    setShowSettingsMenu(false);
    setSettingsView('main');
    resetInVideoControlsTimer();
  };

  const handleLike = () => {
    setHasLiked(!hasLiked);
    onLikeVideo(video.id);
  };

  const handleShareClick = () => {
    setShowShareModal(true);
    onIncrementShare(video.id);
  };

  const getShareableUrl = () => {
    let baseUrl = window.location.href.split('?')[0];
    if (baseUrl.includes('ais-dev-')) {
      baseUrl = baseUrl.replace('ais-dev-', 'ais-pre-');
    }
    return baseUrl + '?v=' + video.id;
  };

  const handleCopyLink = () => {
    const videoUrl = getShareableUrl();
    let success = false;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(videoUrl);
        success = true;
      }
    } catch (err) {
      console.warn("Clipboard API restricted inside iframe, using selection fallback", err);
    }

    if (!success) {
      try {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        tempInput.value = videoUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        success = true;
        document.body.removeChild(tempInput);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
    }

    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText.trim());
    setCommentText('');
  };

  const filteredComments = comments.filter((c) => c.videoId === video.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-300">
      {/* Main Video & Details Panel */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Interactive Video Stage wrapper with Screen Fit & In-Video Settings */}
        <div 
          ref={stageContainerRef}
          id="player-stage-container" 
          onMouseMove={resetInVideoControlsTimer}
          onMouseEnter={resetInVideoControlsTimer}
          onTouchStart={resetInVideoControlsTimer}
          onClick={resetInVideoControlsTimer}
          className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-slate-900 group select-none transition-all duration-300"
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            autoPlay
            playsInline
            className={`w-full h-full transition-all duration-200 ${
              fitMode === 'cover' 
                ? 'object-cover' 
                : fitMode === 'fill' 
                ? 'object-fill' 
                : 'object-contain'
            }`}
          />

          {/* Quality Change Notification Toast inside Player */}
          {qualityNotification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/85 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg border border-white/10 flex items-center gap-2 animate-fade-in pointer-events-none">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{qualityNotification}</span>
            </div>
          )}

          {/* Scheduled Upload Tag */}
          {video.status === 'scheduled' && (
            <div className="absolute top-4 left-4 z-20 bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none">
              <Sparkles className="w-4 h-4 animate-spin" />
              Scheduled Upload
            </div>
          )}

          {/* In-Video Exit Video Button Overlay (Top Left) - Auto-hides after inactivity */}
          {onExit && (
            <div 
              id="player-invideo-exit-control"
              onMouseEnter={resetInVideoControlsTimer}
              onMouseMove={resetInVideoControlsTimer}
              className={`absolute top-3 left-3 z-30 flex items-center gap-2 transition-all duration-500 ease-out ${
                showInVideoControls 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-1.5 pointer-events-none'
              }`}
            >
              <button
                id="player-stage-exit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                title="Exit Video & Back to Home Feed"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black/75 hover:bg-black/90 active:scale-95 text-white/95 hover:text-white rounded-lg text-[11px] font-black border border-white/20 hover:border-white/40 cursor-pointer shadow-lg transition-all"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Exit Video</span>
              </button>
            </div>
          )}

          {/* Top-Right Quick Badges & Controls Overlay - Auto-hides every 3 seconds of inactivity */}
          <div 
            id="player-invideo-controls"
            onMouseEnter={resetInVideoControlsTimer}
            onMouseMove={resetInVideoControlsTimer}
            className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-all duration-500 ease-out ${
              showInVideoControls 
                ? 'opacity-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 -translate-y-1.5 pointer-events-none'
            }`}
          >
            {/* Active Quality Badge */}
            <button
              id="player-active-quality-badge"
              onClick={(e) => {
                e.stopPropagation();
                resetInVideoControlsTimer();
                setShowSettingsMenu(true);
                setSettingsView('quality');
              }}
              title="Click to change video quality"
              className="px-2 py-1 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white rounded-md text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {quality}
            </button>

            {/* In-Video Settings Gear Button */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                id="player-settings-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  resetInVideoControlsTimer();
                  setShowSettingsMenu(!showSettingsMenu);
                  setSettingsView('main');
                }}
                title="Player Settings (Quality, Fit, Speed)"
                className={`p-2 rounded-lg backdrop-blur-md transition-all cursor-pointer shadow-md ${
                  showSettingsMenu 
                    ? 'bg-violet-600 text-white shadow-violet-600/30 ring-2 ring-violet-400' 
                    : 'bg-black/60 hover:bg-black/85 text-white/90 hover:text-white border border-white/15 opacity-80 hover:opacity-100'
                }`}
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettingsMenu ? 'rotate-90' : ''}`} />
              </button>

              {/* In-Video Settings Menu Popup */}
              {showSettingsMenu && (
                <div 
                  id="player-settings-menu"
                  className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-2 z-50 animate-slide-up text-xs font-sans"
                >
                  {/* Settings Main Navigation */}
                  {settingsView === 'main' && (
                    <div className="space-y-1">
                      <div className="px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-violet-400" />
                          Player Preferences
                        </span>
                        <span className="text-[9px] text-slate-500 font-normal">In-Video HUD</span>
                      </div>

                      {/* Quality Option Menu Item */}
                      <button
                        id="settings-menu-item-quality"
                        onClick={() => setSettingsView('quality')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Quality
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                          {quality}
                          <span className="text-slate-500">›</span>
                        </span>
                      </button>

                      {/* Screen Fit Option Menu Item */}
                      <button
                        id="settings-menu-item-fit"
                        onClick={() => setSettingsView('fit')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                          Fit Screen
                        </span>
                        <span className="text-slate-400 capitalize text-[11px] flex items-center gap-1">
                          {fitMode === 'cover' ? 'Fit & Fill' : fitMode === 'contain' ? 'Original (Fit)' : 'Stretch'}
                          <span className="text-slate-500">›</span>
                        </span>
                      </button>

                      {/* Playback Speed Option Menu Item */}
                      <button
                        id="settings-menu-item-speed"
                        onClick={() => setSettingsView('speed')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          Playback Speed
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                          {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                          <span className="text-slate-500">›</span>
                        </span>
                      </button>

                      {/* Multi-Quality Video Download Menu Item */}
                      <button
                        id="settings-menu-item-download"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          setShowDownloadModal(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Download className="w-3.5 h-3.5 text-violet-400" />
                          Download Video
                        </span>
                        <span className="text-violet-300 font-medium text-[11px] flex items-center gap-1">
                          Multi-Quality
                          <span className="text-slate-500">›</span>
                        </span>
                      </button>

                      {/* Quick Fullscreen Toggle */}
                      <div className="pt-1 border-t border-white/10 text-[11px]">
                        <button
                          id="settings-toggle-fullscreen"
                          onClick={() => {
                            handleToggleFullscreen();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 cursor-pointer transition-colors"
                        >
                          {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          <span>{isNativeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quality Selection Sub-Menu */}
                  {settingsView === 'quality' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/10">
                        <button
                          onClick={() => setSettingsView('main')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer font-bold"
                        >
                          <span>‹</span> Back
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video Quality</span>
                      </div>
                      
                      {(['Auto (1080p)', '1080p HD', '720p HD', '480p', '360p', '240p'] as QualityOption[]).map((q) => (
                        <button
                          key={q}
                          id={`quality-opt-${q.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => handleSelectQuality(q)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            quality === q 
                              ? 'bg-violet-600 text-white font-bold' 
                              : 'hover:bg-white/10 text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {q}
                            {q.includes('HD') && (
                              <span className="px-1 py-0.2 bg-violet-400 text-slate-900 rounded font-black text-[9px]">
                                HD
                              </span>
                            )}
                          </span>
                          {quality === q && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Screen Fit Sub-Menu */}
                  {settingsView === 'fit' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/10">
                        <button
                          onClick={() => setSettingsView('main')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer font-bold"
                        >
                          <span>‹</span> Back
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Screen Fit Mode</span>
                      </div>

                      <button
                        id="fit-mode-cover"
                        onClick={() => handleSelectFit('cover')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                          fitMode === 'cover' 
                            ? 'bg-violet-600 text-white font-bold' 
                            : 'hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">Fit & Fill Screen (Default)</p>
                          <p className="text-[10px] text-slate-400">Expands video to eliminate black borders</p>
                        </div>
                        {fitMode === 'cover' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        id="fit-mode-contain"
                        onClick={() => handleSelectFit('contain')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                          fitMode === 'contain' 
                            ? 'bg-violet-600 text-white font-bold' 
                            : 'hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">Original Aspect Ratio</p>
                          <p className="text-[10px] text-slate-400">Preserves original bounds with letterboxing</p>
                        </div>
                        {fitMode === 'contain' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        id="fit-mode-fill"
                        onClick={() => handleSelectFit('fill')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                          fitMode === 'fill' 
                            ? 'bg-violet-600 text-white font-bold' 
                            : 'hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">Stretch to Screen</p>
                          <p className="text-[10px] text-slate-400">Stretches exact bounds across player width</p>
                        </div>
                        {fitMode === 'fill' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Playback Speed Sub-Menu */}
                  {settingsView === 'speed' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/10">
                        <button
                          onClick={() => setSettingsView('main')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer font-bold"
                        >
                          <span>‹</span> Back
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Playback Speed</span>
                      </div>
                      
                      {([0.5, 0.75, 1, 1.25, 1.5, 2] as PlaybackRate[]).map((rate) => (
                        <button
                          key={rate}
                          id={`speed-opt-${rate}`}
                          onClick={() => handleSelectSpeed(rate)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            playbackSpeed === rate 
                              ? 'bg-violet-600 text-white font-bold' 
                              : 'hover:bg-white/10 text-slate-200'
                          }`}
                        >
                          <span>{rate === 1 ? '1.0x (Normal)' : `${rate}x`}</span>
                          {playbackSpeed === rate && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}


                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Toolbar for Screen Fit & Quality Selection */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50/80 border border-slate-200/70 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-slate-500" />
              Screen Fit:
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
              <button
                id="quick-fit-cover"
                onClick={() => setFitMode('cover')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  fitMode === 'cover' 
                    ? 'bg-white text-violet-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fit Screen
              </button>
              <button
                id="quick-fit-contain"
                onClick={() => setFitMode('contain')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  fitMode === 'contain' 
                    ? 'bg-white text-violet-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Original
              </button>
              <button
                id="quick-fit-fill"
                onClick={() => setFitMode('fill')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  fitMode === 'fill' 
                    ? 'bg-white text-violet-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stretch
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Quality Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Quality:</span>
              <select
                id="quick-quality-select"
                value={quality}
                onChange={(e) => handleSelectQuality(e.target.value as QualityOption)}
                className="bg-white border border-slate-200 text-slate-700 font-bold rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hover:border-violet-400 focus:border-violet-600 shadow-2xs"
              >
                <option value="Auto (1080p)">Auto (1080p)</option>
                <option value="1080p HD">1080p HD</option>
                <option value="720p HD">720p HD</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
                <option value="240p">240p</option>
              </select>
            </div>

            {/* Quick Multi-Quality Download Button */}
            <button
              id="quick-toolbar-download-btn"
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              title="Download video in multi-quality formats"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Video Actions & Meta */}
        <div className="space-y-4">
          <h1 id="playing-video-title" className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            {/* Creator Information & Subscribe */}
            <div className="flex items-center gap-3">
              <div 
                onClick={() => onSelectChannel && onSelectChannel(video.uploaderId)}
                className={`flex items-center gap-3 ${onSelectChannel ? 'cursor-pointer hover:opacity-80 group' : ''}`}
                title="View Channel"
              >
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-sm shadow-inner uppercase group-hover:scale-105 transition-transform">
                  {video.uploaderName.charAt(0)}
                </div>
                <div>
                  <p id="video-creator-name" className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors leading-snug">{video.uploaderName}</p>
                  <p id="video-creator-subscribers" className="text-xs text-slate-400 font-semibold leading-snug">
                    {formatViews(subscriberCount)} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
                  </p>
                </div>
              </div>

              {onToggleSubscription && (
                <button
                  id="player-subscribe-btn"
                  onClick={() => onToggleSubscription(video.uploaderId)}
                  className={`ml-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isSubscribed
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      : 'bg-violet-600 hover:bg-violet-700 text-white'
                  }`}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            {/* Metric Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Like action */}
              <button
                id="like-video-btn"
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  hasLiked 
                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{formatViews(video.likes + (hasLiked ? 1 : 0))}</span>
              </button>

              {/* Share action */}
              <button
                id="share-video-btn"
                onClick={handleShareClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 rounded-full text-xs font-bold transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>{formatViews(video.shares)}</span>
              </button>

              {/* Playlist Action */}
              <button
                id="add-to-playlist-btn"
                onClick={() => onOpenPlaylistModal(video.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 rounded-full text-xs font-bold transition-all"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Save</span>
              </button>

              {/* Multi-Quality Download Action */}
              <button
                id="download-video-action-btn"
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                title="Download video in multiple qualities"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Download</span>
                <span className="px-1.5 py-0.2 bg-violet-200/70 text-violet-800 rounded text-[10px] font-bold">
                  HD
                </span>
              </button>

              {/* Creator-Specific Actions */}
              {video.uploaderId === currentUser?.id && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                  <button
                    id="edit-video-btn"
                    onClick={() => onEditVideo && onEditVideo(video)}
                    className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    title="Edit Video"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    id="delete-video-btn"
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this video?')) {
                        onDeleteVideo && onDeleteVideo(video.id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description Card */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold">
                <span>{formatViews(video.views)} views</span>
                <span>•</span>
                <span>{timeAgo(video.createdAt)}</span>
                <span>•</span>
                <span>File Size: {formatFileSize(video.fileSize)}</span>
                {video.status !== 'public' && (
                  <>
                    <span>•</span>
                    <span className="uppercase text-violet-600 bg-violet-100/50 px-2 py-0.5 rounded font-black text-[10px]">
                      {video.status}
                    </span>
                  </>
                )}
              </div>
              {video.language && (
                <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{video.language}</span>
                </div>
              )}
            </div>
            <p id="video-description" className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {video.description}
            </p>
          </div>
        </div>

        {/* Comment Section */}
        <div className="space-y-6 pt-2">
          <h3 id="comments-title" className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-600" />
            Comments ({filteredComments.length})
          </h3>

          {currentUser ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0 uppercase`}>
                {currentUser.username.charAt(0)}
              </div>
              <div className="relative flex-1">
                <input
                  id="comment-input"
                  type="text"
                  placeholder="Add a public comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-violet-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  id="submit-comment-btn"
                  className="absolute right-1.5 top-1.5 p-1 text-violet-600 hover:text-white hover:bg-violet-600 rounded-md transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-xs font-semibold text-slate-500">
              Please sign up or log in to add comments to this video.
            </div>
          )}

          {/* Comment list */}
          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-2">No comments yet. Be the first to start the conversation!</p>
            ) : (
              <>
                {(showAllComments ? filteredComments : filteredComments.slice(0, 3)).map((comment) => {
                  const isMyComment = currentUser && currentUser.id === comment.userId;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="flex gap-3 text-xs leading-relaxed border-b border-slate-50 pb-3 group/comment">
                      <div className={`w-8 h-8 rounded-full ${comment.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0 uppercase`}>
                        {comment.username.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{comment.username}</span>
                            <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                          </div>
                          {isMyComment && !isEditing && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {deletingCommentId === comment.id ? (
                                <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded animate-fade-in">
                                  <span className="text-[10px] text-red-600 font-bold mr-1">Delete?</span>
                                  <button
                                    onClick={() => {
                                      onDeleteComment?.(comment.id);
                                      setDeletingCommentId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-[4px] text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeletingCommentId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[4px] text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.text);
                                      setDeletingCommentId(null);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Edit comment"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingCommentId(comment.id);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="mt-1.5 space-y-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-medium text-slate-700"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (editingCommentText.trim()) {
                                    onEditComment?.(comment.id, editingCommentText.trim());
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all shadow-xs"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-600 font-medium whitespace-pre-wrap">{comment.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredComments.length > 3 && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => setShowAllComments(!showAllComments)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-bold rounded-xl transition-all border border-slate-150/60 cursor-pointer shadow-xs font-semibold"
                    >
                      {showAllComments ? 'Show Less Comments' : `View More (${filteredComments.length - 3} other comments)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Videos Sidebar column */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 id="suggested-sidebar-title" className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Up Next
          </h3>
        </div>
        
        <div className="space-y-3.5 max-h-[85vh] overflow-y-auto pr-1">
          {suggestedVideos.length === 0 ? (
            <p className="text-xs text-slate-400">No other videos are public at the moment.</p>
          ) : (
            suggestedVideos.map((item) => (
              <div
                key={item.id}
                id={`suggested-video-${item.id}`}
                onClick={() => onSelectVideo(item)}
                className="group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-all border border-transparent hover:border-slate-100 flex gap-3"
              >
                {/* Miniature Thumbnail */}
                <div className="relative w-28 aspect-video bg-slate-900 rounded-md overflow-hidden shrink-0 shadow-xs">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/75 text-[10px] font-bold text-white px-1 rounded-sm font-mono">
                    {item.duration}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{item.uploaderName}</p>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                    <span>{formatViews(item.views)} views</span>
                    <span>•</span>
                    <span>{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sharing modal overlay */}
      {showShareModal && (
        <div id="share-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div id="share-modal-content" className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-100 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <CornerUpRight className="w-4 h-4 text-violet-600" />
                Share this Video
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">Share this direct video link with your friends:</p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={getShareableUrl()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  copiedLink 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
              >
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 font-semibold text-center italic">* Direct share recorded. Shares counter incremented.</p>
          </div>
        </div>
      )}

      {/* Multi-Quality Download Modal */}
      <DownloadModal
        video={video}
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        defaultQuality={quality}
      />
    </div>
  );
}
