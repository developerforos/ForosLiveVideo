import React, { useState } from 'react';
import { X, FolderPlus, Check, Plus, Loader2, Globe, Lock } from 'lucide-react';
import { Playlist, User } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  videoId?: string; // If provided, we are in "Add Video to Playlist" mode
  playlists: Playlist[];
  onPlaylistCreated: (newPlaylist: Playlist) => void;
  onToggleVideoInPlaylist: (playlistId: string, videoId: string) => void;
}

export default function PlaylistModal({
  isOpen,
  onClose,
  currentUser,
  videoId,
  playlists,
  onPlaylistCreated,
  onToggleVideoInPlaylist
}: PlaylistModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('You must be signed in to create a playlist.');
      return;
    }

    if (!name.trim()) {
      setError('Playlist name is required.');
      return;
    }

    setIsSubmitting(true);

    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      userId: currentUser.id,
      name: name.trim(),
      description: description.trim(),
      videoIds: videoId ? [videoId] : [], // Pre-add the video if one is selected
      createdAt: new Date().toISOString(),
      isPrivate
    };

    setTimeout(() => {
      onPlaylistCreated(newPlaylist);
      setName('');
      setDescription('');
      setIsPrivate(false);
      setShowCreateForm(false);
      setIsSubmitting(false);
      if (!videoId) {
        // If we were just creating a playlist, close modal
        onClose();
      }
    }, 600);
  };

  // Filter playlists belonging to current user
  const userPlaylists = playlists.filter((pl) => pl.userId === currentUser?.id);

  return (
    <div id="playlist-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div id="playlist-modal-container" className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-600 w-full" />
        
        {/* Close Button */}
        <button
          id="close-playlist-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 id="playlist-modal-title" className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FolderPlus className="w-5 h-5 text-violet-600" />
            {videoId ? 'Save Video to Playlist' : 'Create New Playlist'}
          </h3>

          {!currentUser ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-4">
                Please register or sign in to save videos and curate your custom playlists.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Add Video to Existing Playlists checklist */}
              {videoId && !showCreateForm && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Playlists</p>
                  
                  {userPlaylists.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400 font-medium">You haven't created any playlists yet.</p>
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {userPlaylists.map((pl) => {
                        const hasVideo = pl.videoIds.includes(videoId);
                        return (
                          <button
                            key={pl.id}
                            id={`toggle-playlist-${pl.id}`}
                            onClick={() => onToggleVideoInPlaylist(pl.id, videoId)}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm font-semibold hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-slate-700 truncate">{pl.name}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              hasVideo 
                                ? 'bg-violet-600 border-violet-600 text-white' 
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    id="show-create-playlist-form-btn"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-2 border border-dashed border-slate-200 text-violet-600 hover:border-violet-300 hover:bg-violet-50/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Create new playlist
                  </button>
                </div>
              )}

              {/* Creation Form */}
              {(showCreateForm || !videoId) && (
                <form onSubmit={handleCreatePlaylist} className="space-y-4 animate-fade-in">
                  {error && (
                    <div className="p-2.5 bg-rose-50 text-rose-600 text-xs rounded-lg font-semibold border border-rose-100">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Playlist Title
                    </label>
                    <input
                      id="playlist-title-input"
                      type="text"
                      required
                      placeholder="e.g. Chill Coding Session"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-violet-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      id="playlist-desc-input"
                      rows={2}
                      placeholder="Describe what these videos are about..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-violet-500 focus:bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Visibility Options
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="playlist-visibility-public"
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
                        id="playlist-visibility-private"
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
                    {videoId && (
                      <button
                        type="button"
                        id="cancel-playlist-create-btn"
                        onClick={() => setShowCreateForm(false)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-semibold"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      id="submit-playlist-create-btn"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Playlist'
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
