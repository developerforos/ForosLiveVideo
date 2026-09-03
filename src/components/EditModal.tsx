import React, { useState, useEffect } from 'react';
import { X, Film, Globe, Lock, Calendar, Clock, Sliders, CheckCircle } from 'lucide-react';
import { Video, VideoStatus } from '../types';
import { storeVideoFile } from '../indexedDb';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onSave: (updatedVideo: Video) => void;
}

export default function EditModal({
  isOpen,
  onClose,
  video,
  onSave
}: EditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VideoStatus>('public');
  const [language, setLanguage] = useState('English');

  // Thumbnail options states
  const [thumbnailType, setThumbnailType] = useState<'preset' | 'url' | 'upload'>('preset');
  const [selectedPreset, setSelectedPreset] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  // Scheduling States
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledHour, setScheduledHour] = useState<string>('05');
  const [scheduledMinute, setScheduledMinute] = useState<string>('00');
  const [scheduledAmPm, setScheduledAmPm] = useState<'AM' | 'PM'>('PM');

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description);
      setStatus(video.status);
      setLanguage(video.language || 'English');

      if (video.thumbnailUrl.startsWith('blob:')) {
        setThumbnailType('upload');
        setThumbnailPreview(video.thumbnailUrl);
      } else if (video.thumbnailUrl.includes('images.unsplash.com')) {
        setThumbnailType('preset');
        setSelectedPreset(video.thumbnailUrl);
      } else {
        setThumbnailType('url');
        setCustomThumbnailUrl(video.thumbnailUrl);
      }

      if (video.status === 'scheduled' && video.scheduledTime) {
        try {
          const dateObj = new Date(video.scheduledTime);
          setScheduledDate(dateObj.toISOString().split('T')[0]);
          
          let hours = dateObj.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          setScheduledAmPm(ampm);
          
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          setScheduledHour(hours.toString().padStart(2, '0'));
          
          const minutes = dateObj.getMinutes();
          // Round minutes to nearest scheduled interval if needed
          const nearestMin = Math.round(minutes / 15) * 15;
          const minVal = nearestMin >= 60 ? '00' : nearestMin.toString().padStart(2, '0');
          setScheduledMinute(minVal);
        } catch (e) {
          // Fallback
          setScheduledDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          setScheduledHour('05');
          setScheduledMinute('00');
          setScheduledAmPm('PM');
        }
      } else {
        // Preset tomorrow
        setScheduledDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setScheduledHour('05');
        setScheduledMinute('00');
        setScheduledAmPm('PM');
      }
    }
  }, [video, isOpen]);

  if (!isOpen || !video) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalScheduledTime: string | undefined = undefined;
    if (status === 'scheduled') {
      let hours = parseInt(scheduledHour);
      if (scheduledAmPm === 'PM' && hours < 12) hours += 12;
      if (scheduledAmPm === 'AM' && hours === 12) hours = 0;
      
      const formattedHour = hours.toString().padStart(2, '0');
      const timeStr = `${formattedHour}:${scheduledMinute}:00`;
      finalScheduledTime = new Date(`${scheduledDate}T${timeStr}`).toISOString();
    }

    if (thumbnailType === 'upload' && thumbnailFile) {
      try {
        await storeVideoFile(`thumb-${video.id}`, thumbnailFile);
      } catch (err) {
        console.error('Failed to store custom thumbnail in IndexedDB', err);
      }
    }

    let finalThumbnailUrl = video.thumbnailUrl;
    if (thumbnailType === 'url' && customThumbnailUrl) {
      finalThumbnailUrl = customThumbnailUrl;
    } else if (thumbnailType === 'preset') {
      finalThumbnailUrl = selectedPreset;
    } else if (thumbnailType === 'upload' && thumbnailPreview) {
      finalThumbnailUrl = thumbnailPreview;
    }

    const updatedVideo: Video = {
      ...video,
      title: title || 'Untitled Video',
      description: description || 'No description provided.',
      status,
      scheduledTime: finalScheduledTime,
      language,
      thumbnailUrl: finalThumbnailUrl
    };

    onSave(updatedVideo);
    onClose();
  };

  return (
    <div id="edit-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="edit-modal-container" className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Edit Video Details</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure metadata & settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Video Title
              </label>
              <input
                id="edit-title-input"
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
                id="edit-desc-input"
                rows={4}
                placeholder="Tell viewers about your video..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                <span>Language</span>
                <span className="text-[10px] text-slate-400 normal-case font-medium">Localization label</span>
              </label>
              <div className="flex gap-2">
                <select
                  id="edit-language-select"
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

            {/* Visibility Settings */}
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
                  <span>Update Release Schedule</span>
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
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
