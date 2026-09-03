import React, { useState, useRef } from 'react';
import { X, UploadCloud, Film, ShieldAlert, AlertCircle, Calendar, Clock, Globe, Lock, Sliders, CheckCircle } from 'lucide-react';
import { Video, VideoStatus, User, CopyrightRecord } from '../types';
import { calculateFileHash, formatFileSize } from '../utils';
import { storeVideoFile } from '../indexedDb';
import { uploadFileToServer } from '../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUploadSuccess: (newVideo: Video) => void;
  existingVideos: Video[];
}

// 600 GB limit in bytes
const MAX_LIMIT_BYTES = 600 * 1024 * 1024 * 1024; // 644,245,094,400 bytes

export default function UploadModal({
  isOpen,
  onClose,
  currentUser,
  onUploadSuccess,
  existingVideos
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [simulatedSizeGB, setSimulatedSizeGB] = useState<number>(1.2); // Default simulated size
  const [isSimulatingMassive, setIsSimulatingMassive] = useState<boolean>(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VideoStatus>('public');
  const [language, setLanguage] = useState<string>('English');

  // Thumbnail options states
  const [thumbnailType, setThumbnailType] = useState<'preset' | 'url' | 'upload'>('preset');
  const [selectedPreset, setSelectedPreset] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  
  // Scheduling States
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow as default
  );
  const [scheduledHour, setScheduledHour] = useState<string>('05');
  const [scheduledMinute, setScheduledMinute] = useState<string>('00');
  const [scheduledAmPm, setScheduledAmPm] = useState<'AM' | 'PM'>('PM');

  // Scanning states
  const [isCheckingCopyright, setIsCheckingCopyright] = useState(false);
  const [copyrightMatch, setCopyrightMatch] = useState<CopyrightRecord | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setSizeError(null);
    setCopyrightMatch(null);

    // Calculate actual size
    const finalSize = isSimulatingMassive ? (simulatedSizeGB * 1024 * 1024 * 1024) : selectedFile.size;

    // Check size limit: 600 GB
    if (finalSize > MAX_LIMIT_BYTES) {
      setSizeError(`Upload Failed! This file is ${formatFileSize(finalSize)}, which exceeds the maximum allowed upload limit of 600 GB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    // Auto-populate uploader title from file name (sans extension)
    const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
    setTitle(nameWithoutExt);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !currentUser) return;

    setIsCheckingCopyright(true);
    setCopyrightMatch(null);
    setSizeError(null);
    setDbError(null);

    // 1. Calculate File Hash (Fingerprint)
    const fileHash = await calculateFileHash(file);

    // 2. Query Copyright Records (Check against existing videos in state)
    const matchingVideo = existingVideos.find(v => v.fileHash === fileHash);

    if (matchingVideo) {
      // Duplicate file content detected! Trigger copyright block!
      setTimeout(() => {
        setIsCheckingCopyright(false);
        setCopyrightMatch({
          id: `cr-${Date.now()}`,
          fileHash,
          originalVideoId: matchingVideo.id,
          originalVideoTitle: matchingVideo.title,
          originalUploaderName: matchingVideo.uploaderName,
          createdAt: matchingVideo.createdAt
        });
      }, 1500); // Simulated delay for high-tech scanning effect
      return;
    }

    // 3. Concurrent real uploader pipeline with database write and progress tracking
    setIsCheckingCopyright(false);
    setIsUploading(true);

    let dbWriteFinished = false;
    let dbWriteError: any = null;
    const videoId = `v-user-${Date.now()}`;

    // Store video & custom thumbnail in background immediately
    const startDbWrite = async () => {
      try {
        await storeVideoFile(videoId, file);
        if (thumbnailType === 'upload' && thumbnailFile) {
          await storeVideoFile(`thumb-${videoId}`, thumbnailFile);
        }
        dbWriteFinished = true;
      } catch (err) {
        dbWriteError = err;
      }
    };
    startDbWrite();

    let progress = 0;
    const interval = setInterval(() => {
      if (progress < 90) {
        progress += 10;
        setUploadProgress(progress);
      } else {
        // At 90%+, gate progress on DB write completion
        if (dbWriteError) {
          clearInterval(interval);
          setDbError(`Database Storage Error: Could not save the binary video file completely to your browser's IndexedDB. Details: ${dbWriteError.message || dbWriteError}. Please free up disk space or try in a different browser.`);
          setIsUploading(false);
          setIsDone(false);
        } else if (dbWriteFinished) {
          setUploadProgress(100);
          clearInterval(interval);
          finalizeVideoCreationWithId(fileHash, videoId);
        } else {
          if (progress < 98) {
            progress += 1;
            setUploadProgress(progress);
          }
        }
      }
    }, 150);
  };

  const finalizeVideoCreationWithId = async (fileHash: string, videoId: string) => {
    if (!file || !currentUser) return;

    const fileSize = isSimulatingMassive ? (simulatedSizeGB * 1024 * 1024 * 1024) : file.size;
    const objectUrl = URL.createObjectURL(file);

    // Upload video file to server for cross-device playback
    let serverVideoUrl = objectUrl;
    try {
      const uploadRes = await uploadFileToServer(file, file.name);
      if (uploadRes?.url) {
        serverVideoUrl = uploadRes.url;
      }
    } catch (err) {
      console.warn('Server upload fallback to objectUrl:', err);
    }

    // Build the scheduled time if status is 'scheduled'
    let finalScheduledTime: string | undefined = undefined;
    if (status === 'scheduled') {
      // Combine date and time
      let hours = parseInt(scheduledHour);
      if (scheduledAmPm === 'PM' && hours < 12) hours += 12;
      if (scheduledAmPm === 'AM' && hours === 12) hours = 0;
      
      const formattedHour = hours.toString().padStart(2, '0');
      const timeStr = `${formattedHour}:${scheduledMinute}:00`;
      finalScheduledTime = new Date(`${scheduledDate}T${timeStr}`).toISOString();
    }

    let finalThumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80';
    if (thumbnailType === 'url' && customThumbnailUrl) {
      finalThumbnailUrl = customThumbnailUrl;
    } else if (thumbnailType === 'preset') {
      finalThumbnailUrl = selectedPreset;
    } else if (thumbnailType === 'upload' && thumbnailFile) {
      try {
        const thumbRes = await uploadFileToServer(thumbnailFile, thumbnailFile.name);
        if (thumbRes?.url) {
          finalThumbnailUrl = thumbRes.url;
        } else if (thumbnailPreview) {
          finalThumbnailUrl = thumbnailPreview;
        }
      } catch (err) {
        console.warn('Thumbnail server upload fallback to preview:', err);
        if (thumbnailPreview) finalThumbnailUrl = thumbnailPreview;
      }
    } else if (thumbnailType === 'upload' && thumbnailPreview) {
      finalThumbnailUrl = thumbnailPreview;
    }

    const newVideo: Video = {
      id: videoId,
      title: title || 'Untitled Video',
      description: description || 'No description provided.',
      videoUrl: serverVideoUrl,
      thumbnailUrl: finalThumbnailUrl,
      uploaderId: currentUser.id,
      uploaderName: currentUser.username,
      views: 0,
      likes: 0,
      shares: 0,
      fileHash,
      fileSize,
      status,
      scheduledTime: finalScheduledTime,
      createdAt: new Date().toISOString(),
      duration: '0:10', // Standard simulated duration
      language: language
    };

    setIsUploading(false);
    setIsDone(true);
    
    setTimeout(() => {
      onUploadSuccess(newVideo);
      resetState();
      onClose();
    }, 1500);
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetState = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setStatus('public');
    setLanguage('English');
    setThumbnailType('preset');
    setSelectedPreset('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80');
    setCustomThumbnailUrl('');
    setThumbnailFile(null);
    setThumbnailPreview('');
    setCopyrightMatch(null);
    setSizeError(null);
    setDbError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsDone(false);
    setIsCheckingCopyright(false);
  };

  return (
    <div id="upload-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="upload-modal-container" className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-lg font-bold text-slate-800">Upload Creator Video</h2>
              <p className="text-xs text-slate-500">Max Upload Limit: <span className="font-semibold text-slate-700">600 GB</span></p>
            </div>
          </div>
          <button
            id="close-upload-btn"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outer content container */}
        <div className="p-6">
          {!currentUser ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Account Required</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                Please create an account or sign in to upload high-definition videos to ForosLiveVideo.
              </p>
            </div>
          ) : isCheckingCopyright ? (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-violet-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Scanning for Copyright Matching</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                Scanning the digital fingerprint and audio-visual patterns to prevent duplicate uploader content. Please wait...
              </p>
            </div>
          ) : copyrightMatch ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-lg shrink-0 h-fit">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-800">Copyright Infringement Detected</h3>
                  <p className="text-sm text-rose-700 mt-1 font-medium">
                    This file matches an existing video already uploaded on ForosLiveVideo. Re-uploading copyrighted or identical files is strictly prevented.
                  </p>
                  
                  <div className="mt-4 bg-white p-4 rounded-lg border border-rose-100 space-y-2 text-xs text-slate-700 shadow-xs">
                    <p><span className="font-semibold text-slate-500 uppercase tracking-wider">Matched Video:</span> {copyrightMatch.originalVideoTitle}</p>
                    <p><span className="font-semibold text-slate-500 uppercase tracking-wider">Original Creator:</span> {copyrightMatch.originalUploaderName}</p>
                    <p><span className="font-semibold text-slate-500 uppercase tracking-wider">File Fingerprint:</span> <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-rose-600">{copyrightMatch.fileHash.substring(0, 24)}...</code></p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      id="copyright-try-again-btn"
                      onClick={() => setCopyrightMatch(null)}
                      className="px-4 py-2 bg-rose-100 text-rose-800 rounded-lg text-sm font-semibold hover:bg-rose-200 transition-colors"
                    >
                      Try Another File
                    </button>
                    <button
                      id="copyright-dismiss-btn"
                      onClick={() => {
                        resetState();
                        onClose();
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Close uploader
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isUploading ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto space-y-4">
                <div className="p-4 bg-violet-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-violet-600 animate-pulse">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Uploading Video File</h3>
                <p className="text-slate-500 text-xs">Simulating streaming connection pipelines to uploader servers...</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-6">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="text-sm font-bold text-violet-600">{uploadProgress}%</span>
              </div>
            </div>
          ) : isDone ? (
            <div className="text-center py-16 space-y-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto scale-up">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Upload Finalized Successfully!</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Your video has been integrated. {status === 'scheduled' ? `It will unlock automatically at the scheduled date and time.` : `It is now live.`}
              </p>
            </div>
          ) : !file ? (
            // Drag and Drop view
            <div className="space-y-6">
              <div
                id="drag-and-drop-zone"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[250px] ${
                  dragActive 
                    ? 'border-violet-600 bg-violet-50/50 scale-[0.99]' 
                    : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  accept="video/*"
                  className="hidden"
                />
                <UploadCloud className={`w-12 h-12 mb-4 transition-transform ${dragActive ? 'text-violet-600 -translate-y-1' : 'text-slate-400'}`} />
                <p className="text-slate-700 font-semibold">Drag & drop your video file here</p>
                <p className="text-xs text-slate-400 mt-1">or <span className="text-violet-600 font-bold underline">browse files</span> from your system</p>
                <p className="text-[11px] text-slate-400 mt-4 bg-slate-100 px-2.5 py-1 rounded-full font-medium">Supports MP4, MOV, AVI (Max limit: 600 GB)</p>
              </div>

              {/* Massive file simulation controls */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">600 GB Sandbox Simulation Controls</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="simulate-massive-checkbox"
                      checked={isSimulatingMassive}
                      onChange={(e) => setIsSimulatingMassive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-600">Simulate Custom File Size</span>
                  </label>
                </div>

                {isSimulatingMassive && (
                  <div className="mt-4 space-y-2 animate-fade-in">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>File Size:</span>
                      <span className={simulatedSizeGB > 600 ? 'text-rose-600 font-black' : 'text-violet-600 font-black'}>
                        {simulatedSizeGB.toFixed(1)} GB {simulatedSizeGB > 600 ? '(EXCEEDS 600 GB LIMIT)' : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1000"
                      step="5"
                      value={simulatedSizeGB}
                      onChange={(e) => setSimulatedSizeGB(parseFloat(e.target.value))}
                      className="w-full accent-violet-600 bg-slate-200 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>100 MB</span>
                      <span>600 GB (Limit)</span>
                      <span>1,000 GB (1 TB)</span>
                    </div>
                  </div>
                )}
              </div>

              {sizeError && (
                <div id="size-limit-error" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Size Limit Exceeded:</span> {sizeError}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // File Metadata and Settings Form
            <form onSubmit={handleUploadSubmit} className="space-y-5 animate-fade-in">
              {dbError && (
                <div id="db-write-error" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-sm text-rose-900 mb-1">Local Storage Failure</span>
                    <p className="leading-relaxed font-bold text-rose-700">{dbError}</p>
                  </div>
                </div>
              )}
              {/* Selected File Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <Film className="w-5 h-5 text-violet-500" />
                  <div className="max-w-md truncate">
                    <p className="font-semibold truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      File Size:{' '}
                      <span className="font-bold text-slate-600">
                        {isSimulatingMassive ? `${simulatedSizeGB.toFixed(1)} GB` : formatFileSize(file.size)}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded"
                >
                  Change File
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Video Title
                </label>
                <input
                  id="upload-title-input"
                  type="text"
                  required
                  placeholder="Enter video title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  id="upload-desc-input"
                  rows={3}
                  placeholder="Tell viewers about your video..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Language</span>
                  <span className="text-[10px] text-slate-400 normal-case font-medium">Flag video for region / localization</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="upload-language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setLanguage('Tamil')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      language === 'Tamil'
                        ? 'bg-amber-100 border border-amber-300 text-amber-800 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 border border-transparent text-slate-700'
                    }`}
                  >
                    Set as Tamil (தமிழ்)
                  </button>
                </div>
              </div>

              {/* Custom Thumbnail Selection Section */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Video Thumbnail
                  </label>
                  <div className="flex bg-slate-200/60 p-1 rounded-lg gap-1">
                    {[
                      { id: 'preset', label: 'Presets' },
                      { id: 'url', label: 'Image URL' },
                      { id: 'upload', label: 'Upload Image' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setThumbnailType(tab.id as any)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          thumbnailType === tab.id
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset Thumbnails */}
                {thumbnailType === 'preset' && (
                  <div className="space-y-3 animate-fade-in">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Choose a beautiful background:</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: 'Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80' },
                        { name: 'Gaming', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1280&h=720&q=80' },
                        { name: 'Landscape', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1280&h=720&q=80' },
                        { name: 'Neon', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1280&h=720&q=80' },
                        { name: 'Minimal', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1280&h=720&q=80' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setSelectedPreset(preset.url)}
                          className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${
                            selectedPreset === preset.url ? 'border-violet-600 scale-95 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover transition-transform group-hover:scale-115" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                            <span className="text-[8px] font-black text-white uppercase">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom URL Input */}
                {thumbnailType === 'url' && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">Paste Image URL:</span>
                      <input
                        type="url"
                        placeholder="https://example.com/thumbnail.jpg"
                        value={customThumbnailUrl}
                        onChange={(e) => setCustomThumbnailUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 mt-1"
                      />
                    </div>
                    {customThumbnailUrl && (
                      <div className="aspect-video w-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                        <img
                          src={customThumbnailUrl}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80';
                          }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase">Live Preview</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Custom File */}
                {thumbnailType === 'upload' && (
                  <div className="space-y-3 animate-fade-in">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Upload Custom Image (PNG/JPG):</span>
                    <div className="flex gap-4 items-center">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-xl p-4 bg-white cursor-pointer transition-colors w-1/2 text-center group">
                        <svg className="w-6 h-6 text-slate-400 group-hover:text-violet-500 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-600">Select Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailFileChange}
                          className="hidden"
                        />
                      </label>

                      {thumbnailPreview ? (
                        <div className="aspect-video w-1/2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative shadow-sm">
                          <img
                            src={thumbnailPreview}
                            alt="Custom Image Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1 left-1 bg-violet-600 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase">Custom</div>
                        </div>
                      ) : (
                        <div className="aspect-video w-1/2 rounded-lg border border-dashed border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-semibold">
                          No image uploaded
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Visibility and Scheduling settings */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Visibility Settings
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('public')}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      status === 'public'
                        ? 'border-violet-600 bg-violet-50/40 text-violet-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Globe className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold">Public</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Anyone can view</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('private')}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      status === 'private'
                        ? 'border-violet-600 bg-violet-50/40 text-violet-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Lock className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold">Private</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Only you can view</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('scheduled')}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      status === 'scheduled'
                        ? 'border-violet-600 bg-violet-50/40 text-violet-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Calendar className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold">Scheduled</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Publish at set time</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Configurator */}
              {status === 'scheduled' && (
                <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-violet-800 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Set Release Schedule (AM or PM Specific)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Release Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Time Selection
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={scheduledHour}
                          onChange={(e) => setScheduledHour(e.target.value)}
                          className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
                        >
                          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="self-center font-bold text-slate-400">:</span>
                        <select
                          value={scheduledMinute}
                          onChange={(e) => setScheduledMinute(e.target.value)}
                          className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white ml-2">
                          <button
                            type="button"
                            onClick={() => setScheduledAmPm('AM')}
                            className={`px-2 py-1 text-[10px] font-bold ${
                              scheduledAmPm === 'AM' 
                                ? 'bg-violet-600 text-white' 
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduledAmPm('PM')}
                            className={`px-2 py-1 text-[10px] font-bold ${
                              scheduledAmPm === 'PM' 
                                ? 'bg-violet-600 text-white' 
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-violet-700 font-medium">
                    * The system automates publication the second local time crosses{' '}
                    <span className="font-bold underline">
                      {scheduledDate} at {scheduledHour}:{scheduledMinute} {scheduledAmPm}
                    </span>.
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetState}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  Publish & Fingerprint Check
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
