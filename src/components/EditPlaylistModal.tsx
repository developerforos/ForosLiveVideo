import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Globe, Lock } from 'lucide-react';
import { Playlist } from '../types';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onPlaylistUpdated: (updatedPlaylist: Playlist) => void;
}

export default function EditPlaylistModal({
  isOpen,
  onClose,
  playlist,
  onPlaylistUpdated
}: EditPlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state with selected playlist
  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setIsPrivate(!!playlist.isPrivate);
      setError('');
    }
  }, [playlist, isOpen]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Playlist name is required.');
      return;
    }

    setIsSubmitting(true);

    const updatedPlaylist: Playlist = {
      ...playlist,
      name: name.trim(),
      description: description.trim(),
      isPrivate
    };

    // Simulate subtle server save lag for premium feedback
    setTimeout(() => {
      onPlaylistUpdated(updatedPlaylist);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div id="edit-playlist-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div id="edit-playlist-modal-container" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
        
        {/* Top brand line */}
        <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-600 w-full" />
        
        {/* Close Button */}
        <button
          id="close-edit-playlist-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 id="edit-playlist-modal-title" className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <Edit3 className="w-5 h-5 text-violet-600" />
            Edit Playlist Details
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-600 text-xs rounded-lg font-semibold border border-rose-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Playlist Name
              </label>
              <input
                id="edit-playlist-title-input"
                type="text"
                required
                placeholder="e.g. Daily Motivation Hits"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Description (Optional)
              </label>
              <textarea
                id="edit-playlist-desc-input"
                rows={4}
                placeholder="Describe what kinds of streams or uploads are categorized here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Visibility Options
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="edit-playlist-visibility-public"
                  onClick={() => setIsPrivate(false)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isPrivate
                      ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </button>
                <button
                  type="button"
                  id="edit-playlist-visibility-private"
                  onClick={() => setIsPrivate(true)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPrivate
                      ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                id="cancel-edit-playlist-btn"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-edit-playlist-btn"
                disabled={isSubmitting}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-75 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-violet-600/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
