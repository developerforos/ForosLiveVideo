import React, { useState, useEffect, useRef } from 'react';
import { User, Video, Comment, Playlist, Notification, CopyrightRecord, WatchHistoryItem } from './types';
import { INITIAL_VIDEOS, INITIAL_COMMENTS, INITIAL_PLAYLISTS, formatFileSize, timeAgo, formatViews } from './utils';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import AuthModal from './components/AuthModal';
import UploadModal from './components/UploadModal';
import PlaylistModal from './components/PlaylistModal';
import EditModal from './components/EditModal';
import DownloadModal from './components/DownloadModal';
import EditPlaylistModal from './components/EditPlaylistModal';
import { getVideoFile, deleteVideoFile } from './indexedDb';
import { 
  fetchVideos, 
  createVideo, 
  updateVideoOnServer, 
  deleteVideoOnServer, 
  fetchChannels, 
  fetchComments, 
  postCommentToServer, 
  updateCommentOnServer,
  deleteCommentFromServer,
  fetchPlaylists, 
  savePlaylistToServer,
  deletePlaylistFromServer,
  toggleSubscriptionOnServer,
  fetchServerUsers,
  uploadFileToServer,
  saveUserToServer,
  ChannelInfo
} from './api';
import { 
  Film, 
  Trash2, 
  FolderHeart, 
  Lock, 
  Globe, 
  X, 
  Calendar, 
  Sparkles, 
  Plus, 
  Clock, 
  TrendingUp, 
  Users, 
  HardDrive, 
  ShieldAlert, 
  Eye, 
  Play, 
  CheckCircle,
  HelpCircle,
  Undo,
  History,
  FileVideo,
  Home,
  Download,
  Edit3,
  Camera,
  Loader2
} from 'lucide-react';

export default function App() {
  // --- States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const hasParsedUrl = useRef(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'playlists' | 'creator-hub' | 'copyright' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  
  // Watch history state
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    const saved = localStorage.getItem('foros_watch_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [profileSubTab, setProfileSubTab] = useState<'my-videos' | 'playlists' | 'watch-history'>('my-videos');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');
  
  // Channels and search states
  const [searchTab, setSearchTab] = useState<'all' | 'videos' | 'channels'>('all');
  const [serverChannels, setServerChannels] = useState<ChannelInfo[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [viewingChannelId, setViewingChannelId] = useState<string | null>(null);
  const [channelSubTab, setChannelSubTab] = useState<'videos' | 'playlists'>('videos');

  useEffect(() => {
    setChannelSubTab('videos');
    setChannelSearchQuery('');
  }, [viewingChannelId]);
  const [subscriptions, setSubscriptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('foros_subscriptions');
    return saved ? JSON.parse(saved) : ['system-creator', 'system-creator-2'];
  });
  
  // Custom sandbox simulated time system (allows testing the PM/AM video scheduler instantly!)
  const [simulatedTime, setSimulatedTime] = useState<Date>(new Date());
  const [timeIsSimulated, setTimeIsSimulated] = useState(false);

  // Active playlist browsing
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Modal Control States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isEditPlaylistOpen, setIsEditPlaylistOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [playlistVideoTarget, setPlaylistVideoTarget] = useState<string | undefined>(undefined);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [downloadTargetVideo, setDownloadTargetVideo] = useState<Video | null>(null);

  // --- Remote Server Sync & Initial Hydration ---
  const refreshRemoteData = React.useCallback(async () => {
    try {
      const [remoteVideos, remoteChannels, remoteComments, remotePlaylists, remoteUsers] = await Promise.all([
        fetchVideos(),
        fetchChannels(),
        fetchComments(),
        fetchPlaylists(),
        fetchServerUsers()
      ]);

      if (remoteVideos && remoteVideos.length > 0) {
        setVideos(remoteVideos);
        localStorage.setItem('foros_videos', JSON.stringify(remoteVideos));
      }
      if (remoteChannels && remoteChannels.length > 0) {
        setServerChannels(remoteChannels);
      }
      if (remoteComments && remoteComments.length > 0) {
        setComments(remoteComments);
        localStorage.setItem('foros_comments', JSON.stringify(remoteComments));
      }
      if (remotePlaylists && remotePlaylists.length > 0) {
        setPlaylists(remotePlaylists);
        localStorage.setItem('foros_playlists', JSON.stringify(remotePlaylists));
      }

      // Sync active user actual subscribers from server
      if (remoteUsers && remoteUsers.length > 0) {
        const storedUser = localStorage.getItem('foros_current_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            const fresh = remoteUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase());
            if (fresh) {
              setCurrentUser(fresh);
              localStorage.setItem('foros_current_user', JSON.stringify(fresh));
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Server sync error, using local state:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Load active user session
    const loggedUser = localStorage.getItem('foros_current_user');
    if (loggedUser) {
      try {
        setCurrentUser(JSON.parse(loggedUser));
      } catch (e) {}
    }

    // 2. Load immediate cached datasets for instant initial frame render
    const savedVideos = localStorage.getItem('foros_videos');
    if (savedVideos) {
      try {
        const parsedVideos: Video[] = JSON.parse(savedVideos);
        setVideos(parsedVideos);
      } catch (e) {}
    } else {
      setVideos(INITIAL_VIDEOS);
    }

    const savedComments = localStorage.getItem('foros_comments');
    if (savedComments) {
      try { setComments(JSON.parse(savedComments)); } catch (e) {}
    } else {
      setComments(INITIAL_COMMENTS);
    }

    const savedPlaylists = localStorage.getItem('foros_playlists');
    if (savedPlaylists) {
      try { setPlaylists(JSON.parse(savedPlaylists)); } catch (e) {}
    } else {
      setPlaylists(INITIAL_PLAYLISTS);
    }

    // 3. Load notifications
    const savedNotifications = localStorage.getItem('foros_notifications');
    if (savedNotifications) {
      try { setNotifications(JSON.parse(savedNotifications)); } catch (e) {}
    } else {
      const initialAlerts: Notification[] = [
        {
          id: 'n-init',
          title: 'Welcome to ForosLiveVideo!',
          message: 'Explore videos, search channels across devices, and manage your creator uploads in real-time.',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
      setNotifications(initialAlerts);
      localStorage.setItem('foros_notifications', JSON.stringify(initialAlerts));
    }

    // 4. Fetch persistent shared data from the server
    refreshRemoteData();

    // 5. Periodic polling every 20 seconds so changes from other mobile phones appear automatically
    const pollInterval = setInterval(() => {
      refreshRemoteData();
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [refreshRemoteData]);

  // When user begins typing a search query, instantly ping server to retrieve latest global uploads
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      refreshRemoteData();
    }
  }, [searchQuery, refreshRemoteData]);

  // --- Parse URL Query parameters to auto-select shared video link ---
  useEffect(() => {
    if (videos.length > 0 && !hasParsedUrl.current) {
      hasParsedUrl.current = true;
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      if (videoId) {
        const found = videos.find(v => v.id === videoId);
        if (found) {
          setSelectedVideo(found);
        }
      }
    }
  }, [videos]);

  // --- Popstate listener to handle browser back/forward buttons ---
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      if (videoId) {
        const found = videos.find(v => v.id === videoId);
        if (found) {
          setSelectedVideo(found);
        } else {
          setSelectedVideo(null);
        }
      } else {
        setSelectedVideo(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [videos]);

  // --- Sync selectedVideo state to browser URL search parameter ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');
    if (selectedVideo) {
      if (videoId !== selectedVideo.id) {
        params.set('v', selectedVideo.id);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ videoId: selectedVideo.id }, '', newUrl);
      }
    } else {
      if (params.has('v')) {
        params.delete('v');
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.pushState({}, '', newUrl);
      }
    }
  }, [selectedVideo]);

  // --- Sync State back to LocalStorage helper ---
  const saveVideosToDisk = (updatedVideos: Video[]) => {
    setVideos(updatedVideos);
    localStorage.setItem('foros_videos', JSON.stringify(updatedVideos));
  };

  const savePlaylistsToDisk = (updatedPlaylists: Playlist[]) => {
    setPlaylists(updatedPlaylists);
    localStorage.setItem('foros_playlists', JSON.stringify(updatedPlaylists));
  };

  const saveCommentsToDisk = (updatedComments: Comment[]) => {
    setComments(updatedComments);
    localStorage.setItem('foros_comments', JSON.stringify(updatedComments));
  };

  const saveNotificationsToDisk = (updatedNotifications: Notification[]) => {
    setNotifications(updatedNotifications);
    localStorage.setItem('foros_notifications', JSON.stringify(updatedNotifications));
  };

  // --- Automated Scheduler Background Engine ---
  // Evaluates scheduled videos against simulated or real local time
  useEffect(() => {
    const checkScheduleInterval = setInterval(() => {
      // Update our ticking simulated clock if sandbox time is active, otherwise sync to real time
      if (!timeIsSimulated) {
        setSimulatedTime(new Date());
      } else {
        // Just increment simulated time slightly (e.g., 5 seconds per tick) to maintain the simulator
        setSimulatedTime((prev) => new Date(prev.getTime() + 5000));
      }
    }, 5000);

    return () => clearInterval(checkScheduleInterval);
  }, [timeIsSimulated]);

  // Handle actual publishing logic when simulatedTime shifts
  useEffect(() => {
    let changed = false;
    const updatedVideos = videos.map((video) => {
      if (video.status === 'scheduled' && video.scheduledTime) {
        const publishTime = new Date(video.scheduledTime);
        if (simulatedTime >= publishTime) {
          changed = true;
          // Add a uploader alert
          const notif: Notification = {
            id: `n-pub-${Date.now()}-${video.id}`,
            title: 'Scheduled Video Live!',
            message: `"${video.title}" has been automatically published according to your calendar parameters.`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false
          };
          setNotifications((prev) => {
            const list = [notif, ...prev];
            localStorage.setItem('foros_notifications', JSON.stringify(list));
            return list;
          });

          return { ...video, status: 'public' as const };
        }
      }
      return video;
    });

    if (changed) {
      saveVideosToDisk(updatedVideos);
    }
  }, [simulatedTime, videos]);

  // --- Search Filter Logic ---
  const q = searchQuery.toLowerCase().trim().replace(/^@/, '');

  // Derive list of unique channels from both the server and the videos array
  const allChannels = React.useMemo(() => {
    const channelMap = new Map<string, { id: string; name: string; avatarColor: string; subscriberCount: number; videoCount: number; avatarUrl?: string }>();
    
    // 1. Seed server-registered channels with actual subscriber count
    serverChannels.forEach(sc => {
      channelMap.set(sc.id, {
        id: sc.id,
        name: sc.name,
        avatarColor: sc.avatarColor || 'bg-violet-600',
        subscriberCount: sc.subscriberCount ?? 0,
        videoCount: 0,
        avatarUrl: sc.avatarUrl
      });
    });

    // 2. Seed default system channels if not already populated
    if (!channelMap.has('system-creator')) {
      channelMap.set('system-creator', {
        id: 'system-creator',
        name: 'OceanPulse',
        avatarColor: 'bg-emerald-500',
        subscriberCount: 142000,
        videoCount: 0
      });
    }
    if (!channelMap.has('system-creator-2')) {
      channelMap.set('system-creator-2', {
        id: 'system-creator-2',
        name: 'GreenwoodWanderer',
        avatarColor: 'bg-teal-500',
        subscriberCount: 89000,
        videoCount: 0
      });
    }
    if (!channelMap.has('system-creator-3')) {
      channelMap.set('system-creator-3', {
        id: 'system-creator-3',
        name: 'TechnoByte',
        avatarColor: 'bg-violet-500',
        subscriberCount: 254000,
        videoCount: 0
      });
    }

    // 3. Populate/update from all actual videos
    videos.forEach(v => {
      const isVisible = v.status === 'public' || v.uploaderId === currentUser?.id;
      const existing = channelMap.get(v.uploaderId);
      if (existing) {
        if (isVisible) {
          existing.videoCount += 1;
        }
        existing.name = v.uploaderName;
      } else {
        const colors = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-indigo-500', 'bg-teal-500'];
        const colorIndex = Math.abs(v.uploaderName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
        const actualCount = currentUser && v.uploaderId === currentUser.id ? (currentUser.subscribers || 0) : 0;
        channelMap.set(v.uploaderId, {
          id: v.uploaderId,
          name: v.uploaderName,
          avatarColor: colors[colorIndex],
          subscriberCount: actualCount,
          videoCount: isVisible ? 1 : 0
        });
      }
    });

    // 4. If current user is logged in, ensure their channel record uses their exact actual subscriber count
    if (currentUser) {
      const currentChan = channelMap.get(currentUser.id);
      if (currentChan) {
        currentChan.subscriberCount = currentUser.subscribers || 0;
        currentChan.name = currentUser.username;
        currentChan.avatarUrl = currentUser.avatarUrl;
      } else {
        channelMap.set(currentUser.id, {
          id: currentUser.id,
          name: currentUser.username,
          avatarColor: currentUser.avatarColor || 'bg-violet-600',
          subscriberCount: currentUser.subscribers || 0,
          videoCount: videos.filter(v => v.uploaderId === currentUser.id && (v.status === 'public' || !v.status)).length,
          avatarUrl: currentUser.avatarUrl
        });
      }
    }

    return Array.from(channelMap.values());
  }, [videos, serverChannels, currentUser]);

  const filteredChannels = React.useMemo(() => {
    if (!q) return allChannels;
    return allChannels.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const idMatch = c.id.toLowerCase().includes(q);
      const videoMatch = videos.some(v => v.uploaderId === c.id && (
        v.title.toLowerCase().includes(q) || 
        v.description.toLowerCase().includes(q)
      ));
      return nameMatch || idMatch || videoMatch;
    });
  }, [allChannels, q, videos]);

  const filteredVideos = videos.filter((v) => {
    // Only display public videos in the feed, unless the current user is the uploader
    const isVisible = v.status === 'public' || v.uploaderId === currentUser?.id;
    
    // Check language match - when actively searching, do not filter out results by previous language filter
    const matchesLanguage = q.length > 0 ||
                            languageFilter === 'All' || 
                            v.language === languageFilter ||
                            (languageFilter === 'English' && !v.language);
                            
    const matchesSearch = !q ||
                          v.title.toLowerCase().includes(q) || 
                          v.description.toLowerCase().includes(q) ||
                          v.uploaderName.toLowerCase().includes(q) ||
                          (v.language && v.language.toLowerCase().includes(q));

    return isVisible && matchesLanguage && matchesSearch;
  });

  // --- Handler Functions ---
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // Welcome notification
    const alert: Notification = {
      id: `n-welcome-${Date.now()}`,
      title: `Welcome, ${user.username}!`,
      message: 'Account created successfully. You now have full dashboard upload privileges.',
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    setIsUploadingAvatar(true);
    setAvatarUploadError('');
    try {
      const res = await uploadFileToServer(file, `avatar-${currentUser.id}-${file.name}`);
      const updatedUser: User = {
        ...currentUser,
        avatarUrl: res.url
      };
      const savedUser = await saveUserToServer(updatedUser);
      setCurrentUser(savedUser);
      localStorage.setItem('foros_current_user', JSON.stringify(savedUser));
      
      // Update local serverChannels list to show avatar instantly
      setServerChannels(prev => prev.map(c => c.id === currentUser.id ? { ...c, avatarUrl: res.url } : c));

      // Notification
      const alert: Notification = {
        id: `n-avatar-${Date.now()}`,
        title: 'Profile Image Updated',
        message: 'Your custom profile photo has been successfully uploaded.',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      };
      saveNotificationsToDisk([alert, ...notifications]);
    } catch (err: any) {
      console.error('Failed to upload profile image:', err);
      setAvatarUploadError(err.message || 'Failed to upload profile image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('foros_current_user');
    // Goodbye notification
    const alert: Notification = {
      id: `n-logout-${Date.now()}`,
      title: 'Signed Out',
      message: 'You have been signed out. Browse videos as a guest anytime.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleUploadSuccess = (newVideo: Video) => {
    const list = [newVideo, ...videos];
    saveVideosToDisk(list);

    // Persist to server database for cross-device access
    createVideo(newVideo).catch(err => console.warn('Failed to sync uploaded video to server:', err));

    // Create dynamic notification
    const alert: Notification = {
      id: `n-upload-${Date.now()}`,
      title: newVideo.status === 'scheduled' ? 'Video Scheduled Successfully' : 'Video Uploaded successfully',
      message: newVideo.status === 'scheduled' 
        ? `"${newVideo.title}" is queued for ${new Date(newVideo.scheduledTime!).toLocaleString()}.` 
        : `"${newVideo.title}" is now publicly playable across all devices.`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  // Video Metrics Tracking
  const handleLikeVideo = (videoId: string) => {
    let newLikes = 0;
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        newLikes = v.likes + 1;
        return { ...v, likes: newLikes };
      }
      return v;
    });
    saveVideosToDisk(updated);
    if (newLikes > 0) {
      updateVideoOnServer(videoId, { likes: newLikes }).catch(() => {});
    }
  };

  const handleIncrementShare = (videoId: string) => {
    let newShares = 0;
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        newShares = v.shares + 1;
        return { ...v, shares: newShares };
      }
      return v;
    });
    saveVideosToDisk(updated);
    if (newShares > 0) {
      updateVideoOnServer(videoId, { shares: newShares }).catch(() => {});
    }
  };

  const handleIncrementView = (videoId: string) => {
    let newViews = 0;
    const updated = videos.map((v) => {
      if (v.id === videoId) {
        newViews = v.views + 1;
        return { ...v, views: newViews };
      }
      return v;
    });
    saveVideosToDisk(updated);
    if (newViews > 0) {
      updateVideoOnServer(videoId, { views: newViews }).catch(() => {});
    }

    if (currentUser) {
      const filtered = watchHistory.filter(
        (item) => !(item.userId === currentUser.id && item.videoId === videoId)
      );
      const newHistoryItem = {
        id: `wh-${Date.now()}`,
        userId: currentUser.id,
        videoId,
        watchedAt: new Date().toISOString()
      };
      const updatedHistory = [newHistoryItem, ...filtered];
      setWatchHistory(updatedHistory);
      localStorage.setItem('foros_watch_history', JSON.stringify(updatedHistory));
    }
  };

  const handleAddComment = (text: string) => {
    if (!currentUser || !selectedVideo) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      videoId: selectedVideo.id,
      userId: currentUser.id,
      username: currentUser.username,
      avatarColor: currentUser.avatarColor,
      text,
      createdAt: new Date().toISOString()
    };

    const updated = [newComment, ...comments];
    saveCommentsToDisk(updated);
    postCommentToServer(newComment).catch(err => console.warn('Failed to save comment to server:', err));
  };

  const handleEditComment = (commentId: string, text: string) => {
    const updated = comments.map(c => c.id === commentId ? { ...c, text } : c);
    saveCommentsToDisk(updated);
    updateCommentOnServer(commentId, text).catch(err => console.warn('Failed to edit comment on server:', err));
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = comments.filter(c => c.id !== commentId);
    saveCommentsToDisk(updated);
    deleteCommentFromServer(commentId).catch(err => console.warn('Failed to delete comment on server:', err));
  };

  // Playlists Logic
  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    const updated = [newPlaylist, ...playlists];
    savePlaylistsToDisk(updated);
    savePlaylistToServer(newPlaylist).catch(err => console.warn('Failed to save playlist to server:', err));

    const alert: Notification = {
      id: `n-pl-${Date.now()}`,
      title: 'Playlist Created!',
      message: `"${newPlaylist.name}" has been successfully initialized.`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleToggleVideoInPlaylist = (playlistId: string, videoId: string) => {
    let targetPlaylist: Playlist | null = null;
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        const index = pl.videoIds.indexOf(videoId);
        let updatedIds = [...pl.videoIds];
        if (index > -1) {
          updatedIds.splice(index, 1);
        } else {
          updatedIds.push(videoId);
        }
        targetPlaylist = { ...pl, videoIds: updatedIds };
        return targetPlaylist;
      }
      return pl;
    });
    savePlaylistsToDisk(updated);
    if (targetPlaylist) {
      savePlaylistToServer(targetPlaylist).catch(err => console.warn('Failed to sync playlist to server:', err));
    }
  };

  const handlePlaylistUpdated = (updatedPlaylist: Playlist) => {
    const updated = playlists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p);
    savePlaylistsToDisk(updated);
    savePlaylistToServer(updatedPlaylist).catch(err => console.warn('Failed to update playlist on server:', err));

    if (selectedPlaylist?.id === updatedPlaylist.id) {
      setSelectedPlaylist(updatedPlaylist);
    }

    const alert: Notification = {
      id: `n-pl-upd-${Date.now()}`,
      title: 'Playlist Updated',
      message: `"${updatedPlaylist.name}" has been successfully updated.`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (!confirm(`Are you sure you want to delete playlist "${pl.name}"?`)) return;

    const updated = playlists.filter(p => p.id !== playlistId);
    savePlaylistsToDisk(updated);
    deletePlaylistFromServer(playlistId).catch(err => console.warn('Failed to delete playlist on server:', err));

    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
    }

    const alert: Notification = {
      id: `n-pl-del-${Date.now()}`,
      title: 'Playlist Removed',
      message: `"${pl.name}" has been deleted from your catalogue.`,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  // Sandbox Clock Simulator triggers (To verify scheduled videos!)
  const handleSimulateHourSkip = () => {
    setTimeIsSimulated(true);
    setSimulatedTime((prev) => {
      const nextTime = new Date(prev.getTime() + 60 * 60 * 1000); // Add 1 hour
      return nextTime;
    });

    const alert: Notification = {
      id: `n-skip-${Date.now()}`,
      title: 'Simulator Skip Active (+1 Hour)',
      message: `System simulated clock pushed 1 hour forward. Automated scheduler reassessing...`,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleResetSimulatedTime = () => {
    setTimeIsSimulated(false);
    setSimulatedTime(new Date());

    const alert: Notification = {
      id: `n-reset-${Date.now()}`,
      title: 'Real-time Synchronized',
      message: `Sandbox simulation disabled. Clock reset to live local time parameters.`,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleOpenPlaylistModal = (videoId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setPlaylistVideoTarget(videoId);
    setIsPlaylistOpen(true);
  };

  const handleEditVideoSave = (updatedVideo: Video) => {
    const updated = videos.map(v => v.id === updatedVideo.id ? updatedVideo : v);
    saveVideosToDisk(updated);
    updateVideoOnServer(updatedVideo.id, updatedVideo).catch(err => console.warn('Failed to sync updated video to server:', err));
    
    // If it is the active video playing, update selectedVideo state too
    if (selectedVideo?.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo);
    }

    const alert: Notification = {
      id: `n-edit-${Date.now()}`,
      title: 'Video Updated',
      message: `"${updatedVideo.title}" metadata has been updated successfully.`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  const handleDeleteVideo = (videoId: string) => {
    const videoObj = videos.find(v => v.id === videoId);
    if (videoObj) {
      setVideoToDelete(videoObj);
    }
  };

  const confirmDeleteVideo = () => {
    if (!videoToDelete) return;
    const videoId = videoToDelete.id;
    
    const updated = videos.filter(v => v.id !== videoId);
    saveVideosToDisk(updated);
    deleteVideoOnServer(videoId).catch(err => console.warn('Failed to delete video from server:', err));

    if (videoId.startsWith('v-user-')) {
      deleteVideoFile(videoId).catch(err => console.error('Error deleting file from IndexedDB', err));
    }

    if (selectedVideo?.id === videoId) {
      setSelectedVideo(null);
    }

    const alert: Notification = {
      id: `n-del-${Date.now()}`,
      title: 'Video Deleted',
      message: 'Video has been successfully removed from servers.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
    setVideoToDelete(null);
  };

  // Notification management
  const handleClearNotifications = () => {
    saveNotificationsToDisk([]);
  };

  const handleReadNotification = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotificationsToDisk(updated);
  };

  const handleToggleSubscription = async (channelId: string) => {
    const isSubscribed = subscriptions.includes(channelId);
    const updated = isSubscribed
      ? subscriptions.filter(id => id !== channelId)
      : [...subscriptions, channelId];
    
    setSubscriptions(updated);
    localStorage.setItem('foros_subscriptions', JSON.stringify(updated));

    // Optimistically update serverChannels subscriber count immediately
    setServerChannels(prev => {
      const idx = prev.findIndex(c => c.id === channelId);
      if (idx > -1) {
        const next = [...prev];
        const count = next[idx].subscriberCount ?? 0;
        next[idx] = {
          ...next[idx],
          subscriberCount: isSubscribed ? Math.max(0, count - 1) : count + 1
        };
        return next;
      } else {
        const matchingVid = videos.find(v => v.uploaderId === channelId);
        const name = matchingVid?.uploaderName || 'Creator';
        return [...prev, {
          id: channelId,
          name,
          avatarColor: 'bg-violet-600',
          subscriberCount: isSubscribed ? 0 : 1,
          videoCount: 1
        }];
      }
    });

    // If channel is the currently logged in user, update their subscribers count locally
    if (currentUser && currentUser.id === channelId) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const newCount = isSubscribed ? Math.max(0, (prev.subscribers || 1) - 1) : (prev.subscribers || 0) + 1;
        const updatedUser = { ...prev, subscribers: newCount };
        localStorage.setItem('foros_current_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    }

    // Persist to backend server so count is shared across devices
    try {
      const res = await toggleSubscriptionOnServer(channelId, isSubscribed ? 'unsubscribe' : 'subscribe', currentUser?.id);
      if (res && typeof res.subscriberCount === 'number') {
        setServerChannels(prev => prev.map(c => c.id === channelId ? { ...c, subscriberCount: res.subscriberCount } : c));
        if (currentUser && currentUser.id === channelId) {
          setCurrentUser(prev => {
            if (!prev) return null;
            const updatedUser = { ...prev, subscribers: res.subscriberCount };
            localStorage.setItem('foros_current_user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }
      }
    } catch (err) {
      console.warn('Subscription sync error:', err);
    }

    const channelName = allChannels.find(c => c.id === channelId)?.name || videos.find(v => v.uploaderId === channelId)?.uploaderName || 'Creator';
    const alert: Notification = {
      id: `sub-${Date.now()}`,
      title: !isSubscribed ? 'Subscribed!' : 'Unsubscribed',
      message: !isSubscribed ? `You subscribed to ${channelName}.` : `You unsubscribed from ${channelName}.`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    saveNotificationsToDisk([alert, ...notifications]);
  };

  // Storage Utilized Calculation: Max 600 GB
  const totalUploadedBytes = videos
    .filter(v => v.uploaderId === currentUser?.id)
    .reduce((sum, v) => sum + v.fileSize, 0);

  const storagePercentage = (totalUploadedBytes / (600 * 1024 * 1024 * 1024)) * 100;

  return (
    <div id="foroslivevideo-root" className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUpload={() => {
          if (!currentUser) setIsAuthOpen(true);
          else setIsUploadOpen(true);
        }}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notifications={notifications}
        onClearNotifications={handleClearNotifications}
        onReadNotification={handleReadNotification}
        onOpenProfile={() => {
          setActiveTab('profile');
          setSelectedVideo(null);
          setSelectedPlaylist(null);
        }}
        onBrandClick={() => {
          setActiveTab('home');
          setSelectedVideo(null);
          setSelectedPlaylist(null);
          setViewingChannelId(null);
          setSearchQuery('');
          setSearchTab('all');
        }}
      />

      {/* Main Container */}
      <div className="flex flex-1 relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedVideo(null); // Return from player if navigates away
            setSelectedPlaylist(null);
          }}
          playlistCount={playlists.filter(pl => pl.userId === currentUser?.id).length}
          scheduledCount={videos.filter(v => v.uploaderId === currentUser?.id && v.status === 'scheduled').length}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {selectedVideo ? (
            /* --- DETAILED VIDEO PLAYBACK OVERLAY VIEW --- */
            <div className="space-y-4">
              <button
                id="back-to-feed-btn"
                onClick={() => {
                  setSelectedVideo(null);
                  setActiveTab('home');
                  setSelectedPlaylist(null);
                  setViewingChannelId(null);
                  setSearchQuery('');
                  setSearchTab('all');
                }}
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-xs cursor-pointer mb-2 transition-all"
              >
                <Undo className="w-4 h-4" />
                Back to Home
              </button>
              
              <VideoPlayer
                video={selectedVideo}
                currentUser={currentUser}
                comments={comments}
                playlists={playlists}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onLikeVideo={handleLikeVideo}
                onIncrementShare={handleIncrementShare}
                onIncrementView={handleIncrementView}
                onOpenPlaylistModal={handleOpenPlaylistModal}
                suggestedVideos={videos.filter(v => v.id !== selectedVideo.id && v.status === 'public')}
                onSelectVideo={(v) => setSelectedVideo(v)}
                onSelectChannel={(channelId) => {
                  setViewingChannelId(channelId);
                  setSearchTab('channels');
                  setSelectedVideo(null);
                }}
                onEditVideo={(v) => {
                  setEditingVideo(v);
                  setIsEditOpen(true);
                }}
                onDeleteVideo={handleDeleteVideo}
                isSubscribed={subscriptions.includes(selectedVideo.uploaderId)}
                subscriberCount={allChannels.find(c => c.id === selectedVideo.uploaderId)?.subscriberCount ?? 0}
                onToggleSubscription={handleToggleSubscription}
                onExit={() => {
                  setSelectedVideo(null);
                  setActiveTab('home');
                  setSelectedPlaylist(null);
                  setViewingChannelId(null);
                  setSearchQuery('');
                  setSearchTab('all');
                }}
              />

              {/* Floating Back/Exit Button for quick navigation on mobile or scrolled viewports */}
              <button
                id="floating-exit-video-btn"
                onClick={() => {
                  setSelectedVideo(null);
                  setActiveTab('home');
                  setSelectedPlaylist(null);
                  setViewingChannelId(null);
                  setSearchQuery('');
                  setSearchTab('all');
                }}
                title="Exit Video & Return to Home Feed"
                className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs px-4.5 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer border border-rose-500/30"
              >
                <X className="w-4 h-4 text-white" />
                <span>Exit Video</span>
              </button>
            </div>
          ) : activeTab === 'home' ? (
            /* --- TAB: HOME VIDEO FEED --- */
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 id="home-feed-title" className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                    Explore Live Videos
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Watch trending releases, tech tutorials, and curated high-definition live feeds.
                  </p>
                  
                  {searchQuery && (
                    <div className="flex items-center gap-2 mt-3 animate-fade-in">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-100">
                        <span>Showing results for: "{searchQuery}"</span>
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="p-0.5 hover:bg-violet-150 rounded-full transition-colors cursor-pointer"
                          title="Clear Search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Result Category Segment Controller Tabs */}
              <div className="flex border-b border-slate-200 gap-6">
                <button
                  onClick={() => { setSearchTab('all'); setViewingChannelId(null); }}
                  className={`pb-3 text-sm font-extrabold transition-all relative cursor-pointer ${
                    searchTab === 'all' && !viewingChannelId
                      ? 'text-violet-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>All ({filteredVideos.length + (q ? filteredChannels.length : 0)})</span>
                  {searchTab === 'all' && !viewingChannelId && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full animate-fade-in" />
                  )}
                </button>
                <button
                  onClick={() => { setSearchTab('videos'); setViewingChannelId(null); }}
                  className={`pb-3 text-sm font-extrabold transition-all relative cursor-pointer ${
                    searchTab === 'videos' && !viewingChannelId
                      ? 'text-violet-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Videos ({filteredVideos.length})</span>
                  {searchTab === 'videos' && !viewingChannelId && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full animate-fade-in" />
                  )}
                </button>
                <button
                  onClick={() => { setSearchTab('channels'); setViewingChannelId(null); }}
                  className={`pb-3 text-sm font-extrabold transition-all relative cursor-pointer ${
                    searchTab === 'channels' && !viewingChannelId
                      ? 'text-violet-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Channels ({filteredChannels.length})</span>
                  {searchTab === 'channels' && !viewingChannelId && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full animate-fade-in" />
                  )}
                </button>
              </div>

              {viewingChannelId ? (
                /* --- CHANNEL PROFILE DETAILS VIEW --- */
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
                  {/* Channel Banner */}
                  <div className="h-32 sm:h-36 rounded-xl bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-purple-500/15 border border-slate-100 relative overflow-hidden flex items-center p-6">
                    <button
                      onClick={() => {
                        setViewingChannelId(null);
                        setChannelSearchQuery('');
                        setActiveTab('home');
                        setSearchQuery('');
                        setSearchTab('all');
                      }}
                      className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all border border-slate-100 cursor-pointer"
                    >
                      <Undo className="w-3.5 h-3.5" />
                      <span>Back to Home</span>
                    </button>
                  </div>

                  {/* Channel Identity Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-[-40px] px-2 relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                      {/* Avatar initials */}
                      <div className={`w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-black uppercase ${
                        allChannels.find(c => c.id === viewingChannelId)?.avatarColor || 'bg-violet-600'
                      }`}>
                        {(allChannels.find(c => c.id === viewingChannelId)?.name || 'CH').substring(0, 2)}
                      </div>

                      <div className="pb-1">
                        <h3 className="text-xl font-extrabold text-slate-800">
                          {allChannels.find(c => c.id === viewingChannelId)?.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-extrabold mt-1">
                          {formatViews(allChannels.find(c => c.id === viewingChannelId)?.subscriberCount || 1200)} subscribers • {videos.filter(v => v.uploaderId === viewingChannelId && (v.status === 'public' || v.uploaderId === currentUser?.id)).length} uploads
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleSubscription(viewingChannelId!)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                        subscriptions.includes(viewingChannelId!)
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : 'bg-violet-600 hover:bg-violet-700 text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{subscriptions.includes(viewingChannelId!) ? 'Subscribed' : 'Subscribe'}</span>
                    </button>
                  </div>

                  {/* Channel Sub-navigation Tab Menu */}
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-px">
                    <button
                      id="channel-tab-uploads"
                      onClick={() => setChannelSubTab('videos')}
                      className={`px-4 py-2 text-xs font-bold transition-all border-b-2 relative cursor-pointer ${
                        channelSubTab === 'videos'
                          ? 'text-violet-600 border-violet-600 font-extrabold'
                          : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                    >
                      Uploads
                    </button>
                    <button
                      id="channel-tab-playlists"
                      onClick={() => setChannelSubTab('playlists')}
                      className={`px-4 py-2 text-xs font-bold transition-all border-b-2 relative cursor-pointer ${
                        channelSubTab === 'playlists'
                          ? 'text-violet-600 border-violet-600 font-extrabold'
                          : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                    >
                      Playlists
                    </button>
                  </div>

                  {channelSubTab === 'videos' ? (
                    /* Videos Strictly from this Uploader */
                    <div id="channel-uploads-container" className="pt-2 space-y-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Channel Videos</h4>
                        {/* Channel Video Search input */}
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="Search in this channel..."
                            value={channelSearchQuery}
                            onChange={(e) => setChannelSearchQuery(e.target.value)}
                            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 font-medium"
                          />
                          {channelSearchQuery && (
                            <button
                              onClick={() => setChannelSearchQuery('')}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const channelVideos = videos.filter(v => 
                          v.uploaderId === viewingChannelId && 
                          (v.status === 'public' || v.uploaderId === currentUser?.id) &&
                          (!channelSearchQuery.trim() || 
                           v.title.toLowerCase().includes(channelSearchQuery.toLowerCase()) || 
                           v.description.toLowerCase().includes(channelSearchQuery.toLowerCase()))
                        );

                        if (channelVideos.length === 0) {
                          return (
                            <div className="text-center py-12 text-slate-400">
                              <Film className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                              <p className="text-xs font-semibold">
                                {channelSearchQuery ? `No videos match "${channelSearchQuery}" in this channel.` : 'No public videos have been uploaded by this channel yet.'}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {channelVideos.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedVideo(item);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                              >
                                <div className="aspect-video relative overflow-hidden bg-slate-100">
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/85 px-1.5 py-0.5 rounded text-[10px] font-black text-white font-mono tracking-wider">
                                    {item.duration}
                                  </div>
                                </div>

                                <div className="p-4">
                                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-violet-600 transition-colors">
                                    {item.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-bold mt-2 font-mono">
                                    {formatViews(item.views)} views • {timeAgo(item.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* Playlists Strictly from this Uploader */
                    <div id="channel-playlists-container" className="pt-2 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Created Playlists</h4>
                      </div>

                      {(() => {
                        const channelPlaylists = playlists.filter(pl => 
                          pl.userId === viewingChannelId && 
                          (!pl.isPrivate || pl.userId === currentUser?.id)
                        );

                        if (channelPlaylists.length === 0) {
                          return (
                            <div className="text-center py-16 bg-slate-50 border border-slate-100/50 rounded-2xl p-8 max-w-md mx-auto">
                              <FolderHeart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                              <h4 className="text-sm font-bold text-slate-700">No playlists created by this channel</h4>
                              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                                This creator hasn't published any public playlists yet. Stay tuned!
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {channelPlaylists.map((pl) => (
                              <div
                                key={pl.id}
                                id={`channel-playlist-card-${pl.id}`}
                                onClick={() => {
                                  setSelectedPlaylist(pl);
                                  setActiveTab('playlists');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group cursor-pointer"
                              >
                                <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                                  <FolderHeart className="w-5 h-5" />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  pl.isPrivate 
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100/60' 
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100/60'
                                }`}>
                                  {pl.isPrivate ? 'Private' : 'Public'}
                                </span>
                              </div>
                            </div>
                                  <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-violet-600 transition-colors">{pl.name}</h3>
                                  <p className="text-xs text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                                    {pl.description || 'No description provided.'}
                                  </p>
                                </div>

                                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  <span>{pl.videoIds.length} videos</span>
                                  <span className="text-violet-600 group-hover:translate-x-1 transition-transform">View →</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : searchTab === 'channels' ? (
                /* --- CHANNELS DIRECTORY ROW GRID --- */
                <div className="space-y-4 animate-fade-in">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Channels Directory</span>
                  {filteredChannels.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-base font-bold text-slate-700">No channels found</h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                        We couldn't find any creator channel matching "{searchQuery}". Try another search term!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group"
                        >
                          <div
                            onClick={() => setViewingChannelId(channel.id)}
                            className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base uppercase shrink-0 transition-transform group-hover:scale-105 shadow-sm ${channel.avatarColor}`}>
                              {channel.name.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-slate-800 truncate group-hover:text-violet-600 transition-colors">
                                {channel.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-bold mt-0.5 font-mono">
                                {formatViews(channel.subscriberCount)} subscribers • {channel.videoCount} videos
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleSubscription(channel.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all shadow-xs cursor-pointer ${
                              subscriptions.includes(channel.id)
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white'
                            }`}
                          >
                            {subscriptions.includes(channel.id) ? 'Subscribed' : 'Subscribe'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* --- VIDEOS OR ALL TAB --- */
                <div className="space-y-6">
                  {/* When searching and on 'All' tab, show matching Channel Spotlight Cards if any match */}
                  {searchTab === 'all' && q.length > 0 && filteredChannels.length > 0 && (
                    <div className="space-y-3 pb-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-violet-600" />
                          <span>Matching Channels ({filteredChannels.length})</span>
                        </span>
                        {filteredChannels.length > 3 && (
                          <button
                            onClick={() => setSearchTab('channels')}
                            className="text-xs font-bold text-violet-600 hover:text-violet-700 cursor-pointer"
                          >
                            View All {filteredChannels.length} Channels →
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredChannels.slice(0, 3).map((channel) => (
                          <div
                            key={channel.id}
                            className="bg-white border-2 border-violet-100/80 hover:border-violet-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                          >
                            <div
                              onClick={() => setViewingChannelId(channel.id)}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base uppercase shrink-0 transition-transform group-hover:scale-105 shadow-sm ${channel.avatarColor}`}>
                                {channel.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-extrabold text-slate-800 truncate group-hover:text-violet-600 transition-colors">
                                  {channel.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5 font-mono">
                                  {formatViews(channel.subscriberCount)} subs • {channel.videoCount} videos
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => setViewingChannelId(channel.id)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer text-center"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleToggleSubscription(channel.id)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all shadow-xs cursor-pointer text-center ${
                                  subscriptions.includes(channel.id)
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                                }`}
                              >
                                {subscriptions.includes(channel.id) ? 'Subscribed' : 'Subscribe'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Language Filter Pills (only shown when not actively searching) */}
                  {!q && (
                    <div className="flex flex-wrap items-center gap-2 pb-2">
                      <span className="text-xs font-extrabold text-slate-400 mr-2 uppercase tracking-wider">Languages:</span>
                      {[
                        { value: 'All', label: 'All Videos' },
                        { value: 'Tamil', label: 'Tamil (தமிழ்)' },
                        { value: 'English', label: 'English' },
                        { value: 'Hindi', label: 'Hindi (हिन्दी)' },
                        { value: 'Spanish', label: 'Spanish (Español)' },
                        { value: 'Telugu', label: 'Telugu (తెలుగు)' }
                      ].map((pill) => (
                        <button
                          key={pill.value}
                          onClick={() => setLanguageFilter(pill.value)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer ${
                            languageFilter === pill.value
                              ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Heading for videos when search is active */}
                  {q && (
                    <div className="flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Matching Videos ({filteredVideos.length})
                      </span>
                    </div>
                  )}

                  {filteredVideos.length === 0 ? (
                    filteredChannels.length > 0 && q ? (
                      <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl p-6 text-slate-400">
                        <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No direct video title match, but matching channels are shown above! Click on a channel to explore its uploads.</p>
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                        <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-base font-bold text-slate-700">No results found</h3>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                          {q 
                            ? `We couldn't find any videos or channels matching "${searchQuery}". Try another creator or keyword!` 
                            : 'No videos available. Upload your first video to start the stream!'}
                        </p>
                        {q && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 cursor-pointer transition-colors"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {filteredVideos.map((item) => (
                        <div
                          key={item.id}
                          id={`video-card-${item.id}`}
                          className="bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                        >
                          {/* Thumbnail wrapper */}
                          <div 
                            onClick={() => setSelectedVideo(item)}
                            className="relative aspect-video bg-slate-950 cursor-pointer overflow-hidden"
                          >
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                            />
                            <span className="absolute bottom-2.5 right-2.5 bg-black/75 text-[10px] font-black text-white px-2 py-0.5 rounded-sm">
                              {item.duration}
                            </span>

                            {/* Private indicator badge */}
                            {item.status === 'private' && (
                              <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Private
                              </span>
                            )}

                            {/* Scheduled indicator badge */}
                            {item.status === 'scheduled' && (
                              <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Scheduled
                              </span>
                            )}
                          </div>

                          {/* Card Details */}
                          <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <h3 
                                onClick={() => setSelectedVideo(item)}
                                className="text-sm font-bold text-slate-800 hover:text-violet-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                              >
                                {item.title}
                              </h3>
                              <p 
                                onClick={() => { setViewingChannelId(item.uploaderId); setSearchTab('channels'); }}
                                className="text-[11px] text-slate-400 hover:text-violet-600 transition-colors font-semibold truncate cursor-pointer"
                                title="View Channel"
                              >
                                {item.uploaderName}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                              <span>{formatViews(item.views)} views</span>
                              <span>•</span>
                              <span>{timeAgo(item.createdAt)}</span>
                              
                              <div className="flex items-center gap-1">
                                {/* Multi-quality download directly button */}
                                <button
                                  id={`card-download-btn-${item.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDownloadTargetVideo(item);
                                  }}
                                  className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors cursor-pointer"
                                  title="Download Video (Multi-Quality)"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {/* Save directly button */}
                                <button
                                  onClick={() => handleOpenPlaylistModal(item.id)}
                                  className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors cursor-pointer"
                                  title="Save to Playlist"
                                >
                                  <FolderHeart className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'playlists' ? (
            /* --- TAB: PLAYLIST MANAGEMENT --- */
            <div className="space-y-6">
              {/* Back to Home & Breadcrumb Row */}
              <div className="flex items-center justify-between bg-slate-50/60 p-2 rounded-xl border border-slate-100/50 animate-fade-in">
                <button
                  id="playlists-back-home"
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedVideo(null);
                    setSelectedPlaylist(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all border border-slate-100 shadow-xs cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-violet-600" />
                  Back to Home
                </button>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pr-2">Curated Collections</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 id="playlists-page-title" className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                    Your Curated Playlists
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Organize, sequence, and play through custom selections of public video resources.
                  </p>
                </div>
                <button
                  id="create-new-playlist-btn"
                  onClick={() => {
                    if (!currentUser) setIsAuthOpen(true);
                    else {
                      setPlaylistVideoTarget(undefined);
                      setIsPlaylistOpen(true);
                    }
                  }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Playlist
                </button>
              </div>

              {selectedPlaylist ? (
                /* Detail playlist viewer */
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="space-y-2 flex-1 min-w-0">
                      <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="text-xs text-violet-600 hover:text-violet-800 font-bold mb-2 flex items-center gap-1 cursor-pointer"
                      >
                        ← Back to Playlists
                      </button>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg md:text-xl font-extrabold text-slate-800">{selectedPlaylist.name}</h3>
                        {selectedPlaylist.userId === currentUser?.id && (
                          <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100/60 p-0.5 rounded-lg shadow-2xs">
                            <button
                              onClick={() => {
                                setEditingPlaylist(selectedPlaylist);
                                setIsEditPlaylistOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-white rounded-md transition-all cursor-pointer"
                              title="Edit Playlist"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-all cursor-pointer"
                              title="Delete Playlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium whitespace-pre-wrap">{selectedPlaylist.description || 'No description provided.'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total videos: {selectedPlaylist.videoIds.length}</p>
                    </div>

                    {selectedPlaylist.videoIds.length > 0 && (
                      <button
                        onClick={() => {
                          // Play the first video in the playlist
                          const firstVideo = videos.find(v => v.id === selectedPlaylist.videoIds[0]);
                          if (firstVideo) setSelectedVideo(firstVideo);
                        }}
                        className="w-full md:w-auto px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Play All Video Queue
                      </button>
                    )}
                  </div>

                  {/* Playlist queue list */}
                  <div className="space-y-3">
                    {selectedPlaylist.videoIds.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-12 bg-white rounded-xl border border-dashed">No videos saved in this playlist yet. Add videos from the Home feed!</p>
                    ) : (
                      selectedPlaylist.videoIds.map((vId, idx) => {
                        const v = videos.find(videoItem => videoItem.id === vId);
                        if (!v) return null;
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all shadow-xs"
                          >
                            <div 
                              onClick={() => setSelectedVideo(v)}
                              className="flex gap-4 items-center min-w-0 cursor-pointer"
                            >
                              <span className="text-xs font-extrabold text-slate-300 w-4">{idx + 1}</span>
                              <div className="w-20 aspect-video rounded-md overflow-hidden bg-slate-900 shrink-0">
                                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate">{v.title}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">{v.uploaderName} • {v.duration}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleVideoInPlaylist(selectedPlaylist.id, v.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove from Playlist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Playlist grid list */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const visiblePlaylists = playlists.filter(pl => !pl.isPrivate || pl.userId === currentUser?.id);
                    if (visiblePlaylists.length === 0) {
                      return (
                        <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                          <FolderHeart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-base font-bold text-slate-700">No Playlists created</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                            Begin creating and organizing custom video categories with your uploader account!
                          </p>
                        </div>
                      );
                    }

                    return visiblePlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        id={`playlist-card-${pl.id}`}
                        className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mb-1">
                                <FolderHeart className="w-5 h-5" />
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                pl.isPrivate 
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100/60' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100/60'
                              }`}>
                                {pl.isPrivate ? 'Private' : 'Public'}
                              </span>
                            </div>
                            {pl.userId === currentUser?.id && (
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100/60 shadow-2xs shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPlaylist(pl);
                                    setIsEditPlaylistOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-white rounded-md transition-all cursor-pointer"
                                  title="Edit Playlist Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlaylist(pl.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-all cursor-pointer"
                                  title="Delete Playlist"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{pl.name}</h3>
                          <p className="text-xs text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                            {pl.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                            {pl.videoIds.length} videos
                          </span>
                          <button
                            id={`view-playlist-${pl.id}`}
                            onClick={() => setSelectedPlaylist(pl)}
                            className="text-xs text-violet-600 hover:text-violet-800 font-bold"
                          >
                            View Playlist →
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === 'creator-hub' ? (
            /* --- TAB: CREATOR HUB & SANDBOX CONTROL PANEL --- */
            <div className="space-y-8 animate-fade-in">
              {/* Back to Home & Breadcrumb Row */}
              <div className="flex items-center justify-between bg-slate-50/60 p-2 rounded-xl border border-slate-100/50">
                <button
                  id="creator-back-home"
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedVideo(null);
                    setSelectedPlaylist(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all border border-slate-100 shadow-xs cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-violet-600" />
                  Back to Home
                </button>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pr-2">Creator Platform</span>
              </div>

              <div>
                <h2 id="creator-hub-title" className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                  Creator Management Hub
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Monitor upload quotas, manage scheduled publishing timelines, and review video metrics analytics.
                </p>
              </div>

              {/* Account Stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Videos Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Videos</span>
                    <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
                      <Film className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-800">
                      {videos.filter((v) => v.uploaderId === currentUser?.id).length}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Uploaded to uploader storage</p>
                  </div>
                </div>

                {/* Simulated Subscribers Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscribers</span>
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-800">
                      {currentUser ? currentUser.subscribers.toLocaleString() : '0'}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Active platform subscribers</p>
                  </div>
                </div>

                {/* Storage Quota Card (600 GB maximum upload limit requirement) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Storage Quota</span>
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <HardDrive className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-base font-extrabold text-slate-800">
                        {formatFileSize(totalUploadedBytes)}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">of 600.0 GB Limit</span>
                    </div>
                    {/* Storage Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${Math.max(1, Math.min(100, storagePercentage))}%` }} 
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      {(600 - (totalUploadedBytes / (1024 * 1024 * 1024))).toFixed(2)} GB storage remaining
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Timeline Schedulers Panel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />
                      Timeline Schedulers & Pending Uploads
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Automated publishing queues. Scheduled videos automatically unlock when the system clock matches or exceeds uploader selections.
                    </p>
                  </div>
                </div>

                {/* Queue display list */}
                {videos.filter((v) => v.uploaderId === currentUser?.id && v.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">No videos currently scheduled for future release.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Toggle Scheduled in the Visibility settings when uploading video files.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {videos
                      .filter((v) => v.uploaderId === currentUser?.id && v.status === 'scheduled')
                      .map((v) => (
                        <div
                          key={v.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl gap-3"
                        >
                          <div className="flex gap-3.5 items-center">
                            <div className="w-16 aspect-video bg-slate-900 rounded-md overflow-hidden shrink-0 shadow-xs">
                              <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{v.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Release: {new Date(v.scheduledTime!).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => {
                                // Force instant publishing for this specific video in the sandbox!
                                const updated = videos.map((videoItem) => 
                                  videoItem.id === v.id ? { ...videoItem, status: 'public' as const } : videoItem
                                );
                                saveVideosToDisk(updated);
                                // Add notification
                                const alert: Notification = {
                                  id: `n-manual-pub-${Date.now()}`,
                                  title: 'Video Released Manually',
                                  message: `"${v.title}" has been manually bypassed and made Public.`,
                                  type: 'success',
                                  timestamp: new Date().toISOString(),
                                  read: false
                                };
                                saveNotificationsToDisk([alert, ...notifications]);
                              }}
                              className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Publish Now
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(v.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Uploads and visibility manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800">Your Uploaded Videos Catalogue</h3>
                
                {videos.filter((v) => v.uploaderId === currentUser?.id).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">You haven't uploaded any videos yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                          <th className="py-3 px-4">Video Info</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Performance Metrics</th>
                          <th className="py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {videos
                          .filter((v) => v.uploaderId === currentUser?.id)
                          .map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 flex items-center gap-3">
                                <div className="w-14 aspect-video bg-slate-900 rounded overflow-hidden shrink-0">
                                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="max-w-[180px] truncate">
                                  <p className="font-bold text-slate-800 truncate">{v.title}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(v.fileSize)}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                  v.status === 'public' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : v.status === 'private' 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {v.status === 'public' && <Globe className="w-3 h-3" />}
                                  {v.status === 'private' && <Lock className="w-3 h-3" />}
                                  {v.status === 'scheduled' && <Clock className="w-3 h-3" />}
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-500">
                                <div className="flex gap-4">
                                  <span>👁 {formatViews(v.views)}</span>
                                  <span>👍 {formatViews(v.likes)}</span>
                                  <span>↪ {formatViews(v.shares)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleDeleteVideo(v.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete Video Catalogue item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'copyright' ? (
            /* --- TAB: COPYRIGHT REGISTER & DUPLICATE PREVENTION PANEL --- */
            <div className="space-y-6">
              {/* Back to Home & Breadcrumb Row */}
              <div className="flex items-center justify-between bg-slate-50/60 p-2 rounded-xl border border-slate-100/50 animate-fade-in">
                <button
                  id="copyright-back-home"
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedVideo(null);
                    setSelectedPlaylist(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all border border-slate-100 shadow-xs cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-violet-600" />
                  Back to Home
                </button>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pr-2">Copyright Protection</span>
              </div>

              <div>
                <h2 id="copyright-hub-title" className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                  Copyright Central Registry
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Learn about ForosLiveVideo's automated copy preventer system and check the master fingerprint ledger database.
                </p>
              </div>

              {/* Informative description banner */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold">Preventing Duplicate Video Re-uploads</h3>
                  <p className="text-xs text-violet-100 leading-relaxed font-semibold max-w-xl">
                    ForosLiveVideo uses high-speed cryptographic SHA-256 visual hashing to scan each file's metadata, keyframe indices, and audio-visual fingerprints on upload. If an identical file is detected, re-upload is automatically prevented to preserve original creator authority.
                  </p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl shrink-0">
                  <ShieldAlert className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Master Ledger List */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800">Master Video Fingerprint Ledger</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Video Name</th>
                        <th className="py-3 px-4">Original Channel</th>
                        <th className="py-3 px-4">SHA-256 Digital Fingerprint</th>
                        <th className="py-3 px-4">Protected Since</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {videos.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700">{v.title}</td>
                          <td className="py-3 px-4 font-semibold text-slate-500">{v.uploaderName}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-rose-600">
                            {v.fileHash || 'unhashed-stock-video'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-semibold">{new Date(v.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* --- TAB: PROFILE DASHBOARD (My Videos & Watch History) --- */
            <div className="space-y-6">
              {/* Back to Home & Breadcrumb Row */}
              <div className="flex items-center justify-between bg-slate-50/60 p-2 rounded-xl border border-slate-100/50 animate-fade-in">
                <button
                  id="profile-back-home"
                  onClick={() => {
                    setActiveTab('home');
                    setSelectedVideo(null);
                    setSelectedPlaylist(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all border border-slate-100 shadow-xs cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-violet-600" />
                  Back to Home
                </button>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pr-2">My Account Overview</span>
              </div>

              {!currentUser ? (
                <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs space-y-5 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto shadow-xs">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Access Your Profile</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                      Please log in or register a new uploader account to view your uploaded videos catalogue, customize settings, and track watch history.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Sign In or Create Account
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {/* Profile Header Card */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-600 to-indigo-600" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-slate-100 shadow-md shrink-0 border-2 border-slate-100 relative">
                            {isUploadingAvatar && (
                              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white z-10">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                            )}
                            {currentUser.avatarUrl ? (
                              <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.username}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`w-full h-full ${currentUser.avatarColor} text-white font-black text-2xl flex items-center justify-center uppercase`}>
                                {currentUser.username.substring(0, 2)}
                              </div>
                            )}

                            {/* Camera overlay hover trigger */}
                            <label
                              htmlFor="profile-avatar-upload"
                              className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity duration-200"
                            >
                              <Camera className="w-4.5 h-4.5 mb-0.5" />
                              Upload
                            </label>
                          </div>
                          
                          <input
                            id="profile-avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleAvatarUpload(file);
                              }
                            }}
                            disabled={isUploadingAvatar}
                          />
                        </div>
                        <div>
                          <h2 id="profile-display-username" className="text-xl font-extrabold text-slate-800 tracking-tight">{currentUser.username}</h2>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">{currentUser.email}</p>
                          {avatarUploadError ? (
                            <p className="text-rose-500 text-[10px] font-bold mt-1">{avatarUploadError}</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Joined {new Date(currentUser.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          )}
                        </div>
                      </div>

                      {/* Summary Metrics */}
                      <div className="flex flex-wrap gap-4 md:gap-8 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                        <div className="text-center md:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Subscribers</span>
                          <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{formatViews(currentUser.subscribers || 0)}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Videos Published</span>
                          <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                            {videos.filter(v => v.uploaderId === currentUser.id).length}
                          </p>
                        </div>
                        <div className="text-center md:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Playlists Created</span>
                          <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                            {playlists.filter(pl => pl.userId === currentUser.id).length}
                          </p>
                        </div>
                        <div className="text-center md:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Views</span>
                          <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                            {formatViews(videos.filter(v => v.uploaderId === currentUser.id).reduce((sum, v) => sum + v.views, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tab Selector Links */}
                  <div className="flex border-b border-slate-100 gap-1 overflow-x-auto">
                    <button
                      id="profile-tab-my-videos"
                      onClick={() => setProfileSubTab('my-videos')}
                      className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                        profileSubTab === 'my-videos'
                          ? 'border-violet-600 text-violet-600 bg-violet-50/20'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <FileVideo className="w-4 h-4" />
                      <span>My Videos</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                        {videos.filter(v => v.uploaderId === currentUser.id).length}
                      </span>
                    </button>
                    <button
                      id="profile-tab-playlists"
                      onClick={() => setProfileSubTab('playlists')}
                      className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                        profileSubTab === 'playlists'
                          ? 'border-violet-600 text-violet-600 bg-violet-50/20'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <FolderHeart className="w-4 h-4" />
                      <span>My Playlists</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                        {playlists.filter(pl => pl.userId === currentUser.id).length}
                      </span>
                    </button>
                    <button
                      id="profile-tab-watch-history"
                      onClick={() => setProfileSubTab('watch-history')}
                      className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                        profileSubTab === 'watch-history'
                          ? 'border-violet-600 text-violet-600 bg-violet-50/20'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>Watch History</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                        {watchHistory.filter(item => item.userId === currentUser.id).length}
                      </span>
                    </button>
                  </div>

                  {/* Render profile tab sub-content */}
                  {profileSubTab === 'my-videos' ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Your Videos ({videos.filter(v => v.uploaderId === currentUser.id).length})</span>
                        <button
                          onClick={() => setIsUploadOpen(true)}
                          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Publish New Video
                        </button>
                      </div>

                      {videos.filter(v => v.uploaderId === currentUser.id).length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                          <FileVideo className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-base font-bold text-slate-700">No videos published yet</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                            Get started by publishing your first video to your creator catalogue!
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {videos
                            .filter(v => v.uploaderId === currentUser.id)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between animate-fade-in"
                              >
                                <div className="aspect-video relative overflow-hidden bg-slate-100">
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/85 px-1.5 py-0.5 rounded text-[10px] font-black text-white font-mono tracking-wider">
                                    {item.duration}
                                  </div>
                                  <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                                    item.status === 'public'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.status === 'scheduled'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}>
                                    {item.status === 'scheduled' && <Clock className="w-2.5 h-2.5 shrink-0" />}
                                    {item.status}
                                  </span>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                  <div>
                                    <h4 
                                      onClick={() => setSelectedVideo(item)}
                                      className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-tight hover:text-violet-600 cursor-pointer transition-colors"
                                    >
                                      {item.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 font-mono">
                                      {formatViews(item.views)} views • {timeAgo(item.createdAt)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                      {item.description || 'No description provided.'}
                                    </p>
                                  </div>

                                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingVideo(item);
                                          setIsEditOpen(true);
                                        }}
                                        className="px-2.5 py-1 hover:bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-600 transition-colors"
                                      >
                                        Edit Metadata
                                      </button>
                                      <button
                                        onClick={() => handleDeleteVideo(item.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                        title="Delete video catalogue entry"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <button
                                      onClick={() => setSelectedVideo(item)}
                                      className="px-3 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-extrabold rounded-lg transition-colors"
                                    >
                                      Play Now →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : profileSubTab === 'playlists' ? (
                    /* --- MY CREATED PLAYLISTS SECTION --- */
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                          Your Created Playlists ({playlists.filter(pl => pl.userId === currentUser.id).length})
                        </span>
                        <button
                          id="profile-create-playlist-btn"
                          onClick={() => {
                            setPlaylistVideoTarget(undefined);
                            setIsPlaylistOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Playlist
                        </button>
                      </div>

                      {playlists.filter(pl => pl.userId === currentUser.id).length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                          <FolderHeart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-base font-bold text-slate-700">No playlists created yet</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                            Collect and organize your favorite streams and uploads into personalized playlists!
                          </p>
                          <button
                            onClick={() => {
                              setPlaylistVideoTarget(undefined);
                              setIsPlaylistOpen(true);
                            }}
                            className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Create Your First Playlist
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {playlists
                            .filter(pl => pl.userId === currentUser.id)
                            .map((pl) => {
                              const firstVideo = pl.videoIds.length > 0 ? videos.find(v => v.id === pl.videoIds[0]) : null;
                              return (
                                <div
                                  key={pl.id}
                                  id={`profile-playlist-card-${pl.id}`}
                                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between animate-fade-in"
                                >
                                  <div>
                                    {/* Playlist Cover Preview */}
                                    <div 
                                      onClick={() => {
                                        if (firstVideo) {
                                          setSelectedVideo(firstVideo);
                                        } else {
                                          setSelectedPlaylist(pl);
                                          setActiveTab('playlists');
                                        }
                                      }}
                                      className="aspect-video relative overflow-hidden bg-slate-900 cursor-pointer"
                                    >
                                      {firstVideo ? (
                                        <img
                                          src={firstVideo.thumbnailUrl}
                                          alt={pl.name}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
                                          <FolderHeart className="w-10 h-10 opacity-80" />
                                          <span className="text-[11px] font-bold mt-1 opacity-90">Empty Playlist</span>
                                        </div>
                                      )}
                                      <div className="absolute top-2.5 right-2.5 bg-slate-900/85 px-2 py-0.5 rounded text-[10px] font-extrabold text-white font-mono flex items-center gap-1">
                                        <FolderHeart className="w-3 h-3 text-violet-400" />
                                        {pl.videoIds.length} {pl.videoIds.length === 1 ? 'video' : 'videos'}
                                      </div>
                                    </div>

                                    {/* Info Body */}
                                    <div className="p-4 space-y-1.5">
                                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-violet-600 transition-colors">
                                        {pl.name}
                                      </h4>
                                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                        {pl.description || 'No description provided.'}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-semibold pt-1">
                                        Created {new Date(pl.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="p-4 pt-0 border-t border-slate-50 mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedPlaylist(pl);
                                          setActiveTab('playlists');
                                        }}
                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                      >
                                        View Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingPlaylist(pl);
                                          setIsEditPlaylistOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Playlist Details"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePlaylist(pl.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Playlist"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {pl.videoIds.length > 0 && firstVideo && (
                                      <button
                                        onClick={() => setSelectedVideo(firstVideo)}
                                        className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        Play
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* --- WATCH HISTORY SECTION --- */
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Recently Watched ({watchHistory.filter(item => item.userId === currentUser.id).length})</span>
                        {watchHistory.filter(item => item.userId === currentUser.id).length > 0 && (
                          <button
                            id="clear-all-history-btn"
                            onClick={() => {
                              const filtered = watchHistory.filter(item => item.userId !== currentUser.id);
                              setWatchHistory(filtered);
                              localStorage.setItem('foros_watch_history', JSON.stringify(filtered));
                              
                              const alert: Notification = {
                                id: `n-clear-history-${Date.now()}`,
                                title: 'History Cleared',
                                message: 'Your personalized watch history database has been successfully emptied.',
                                type: 'info',
                                timestamp: new Date().toISOString(),
                                read: false
                              };
                              saveNotificationsToDisk([alert, ...notifications]);
                            }}
                            className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Watch History
                          </button>
                        )}
                      </div>

                      {watchHistory.filter(item => item.userId === currentUser.id).length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
                          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-base font-bold text-slate-700">No watch history found</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                            Videos you watch while logged in will accumulate here. Check back after enjoying some streaming content!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {watchHistory
                            .filter(item => item.userId === currentUser.id)
                            .map((item) => {
                              const v = videos.find(video => video.id === item.videoId);
                              if (!v) return null;
                              return (
                                <div
                                  key={item.id}
                                  className="bg-white border border-slate-100 hover:border-slate-200 p-4 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                                >
                                  <div 
                                    onClick={() => setSelectedVideo(v)}
                                    className="flex gap-4 items-center min-w-0 cursor-pointer flex-1"
                                  >
                                    <div className="w-24 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0">
                                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-extrabold text-slate-800 truncate group-hover:text-violet-600 transition-colors">{v.title}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">{v.uploaderName} • {v.duration} • {formatViews(v.views)} views</p>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1.5">
                                        Watched {timeAgo(item.watchedAt)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 self-end sm:self-center">
                                    <button
                                      onClick={() => {
                                        const updated = watchHistory.filter(h => h.id !== item.id);
                                        setWatchHistory(updated);
                                        localStorage.setItem('foros_watch_history', JSON.stringify(updated));
                                      }}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="Remove from history"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setSelectedVideo(v)}
                                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-extrabold transition-colors shadow-xs"
                                    >
                                      Watch Again
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentUser={currentUser}
        onUploadSuccess={handleUploadSuccess}
        existingVideos={videos}
      />

      {/* Playlist Modal */}
      <PlaylistModal
        isOpen={isPlaylistOpen}
        onClose={() => {
          setIsPlaylistOpen(false);
          setPlaylistVideoTarget(undefined);
        }}
        currentUser={currentUser}
        videoId={playlistVideoTarget}
        playlists={playlists}
        onPlaylistCreated={handlePlaylistCreated}
        onToggleVideoInPlaylist={handleToggleVideoInPlaylist}
      />

      {/* Edit Playlist Modal */}
      <EditPlaylistModal
        isOpen={isEditPlaylistOpen}
        onClose={() => {
          setIsEditPlaylistOpen(false);
          setEditingPlaylist(null);
        }}
        playlist={editingPlaylist}
        onPlaylistUpdated={handlePlaylistUpdated}
      />

      {/* Edit Video Modal */}
      <EditModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingVideo(null);
        }}
        video={editingVideo}
        onSave={handleEditVideoSave}
      />

      {/* Video Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-800">
                  Delete Video?
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Are you sure you want to permanently delete this video entry? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Video Preview Snippet */}
            <div className="mx-6 p-3 bg-slate-50/80 border border-slate-100 rounded-xl flex items-center gap-3">
              <div className="w-20 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0">
                <img 
                  src={videoToDelete.thumbnailUrl} 
                  alt={videoToDelete.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-700 truncate">
                  {videoToDelete.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {videoToDelete.uploaderName} • {videoToDelete.duration}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50/50 px-6 py-4 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setVideoToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                No, Keep Video
              </button>
              <button
                onClick={confirmDeleteVideo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Multi-Quality Download Modal */}
      {downloadTargetVideo && (
        <DownloadModal
          video={downloadTargetVideo}
          isOpen={!!downloadTargetVideo}
          onClose={() => setDownloadTargetVideo(null)}
        />
      )}
    </div>
  );
}
