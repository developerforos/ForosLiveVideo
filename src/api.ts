import { Video, Comment, Playlist, User } from './types';

export interface ChannelInfo {
  id: string;
  name: string;
  avatarColor: string;
  subscriberCount: number;
  videoCount: number;
  avatarUrl?: string;
}

// 1. Video Endpoints
export async function fetchVideos(): Promise<Video[]> {
  try {
    const res = await fetch('/api/videos');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch videos from server, falling back to local storage:', err);
    const local = localStorage.getItem('foros_videos');
    return local ? JSON.parse(local) : [];
  }
}

export async function createVideo(video: Video): Promise<Video> {
  try {
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to post video to server, continuing locally:', err);
    return video;
  }
}

export async function updateVideoOnServer(id: string, partial: Partial<Video>): Promise<void> {
  try {
    await fetch(`/api/videos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial)
    });
  } catch (err) {
    console.warn('Failed to update video on server:', err);
  }
}

export async function deleteVideoOnServer(id: string): Promise<void> {
  try {
    await fetch(`/api/videos/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Failed to delete video on server:', err);
  }
}

// 2. Upload Binary File (Video or Thumbnail) to Server
export async function uploadFileToServer(file: File | Blob, originalName?: string): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file, originalName || (file instanceof File ? file.name : 'upload.bin'));
  
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

// 3. Channel Endpoints
export async function fetchChannels(): Promise<ChannelInfo[]> {
  try {
    const res = await fetch('/api/channels');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch channels from server:', err);
    return [];
  }
}

export async function registerChannel(channel: Partial<ChannelInfo>): Promise<void> {
  try {
    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel)
    });
  } catch (err) {
    console.warn('Failed to register channel on server:', err);
  }
}

// 4. Comments Endpoints
export async function fetchComments(videoId?: string): Promise<Comment[]> {
  try {
    const url = videoId ? `/api/comments?videoId=${encodeURIComponent(videoId)}` : '/api/comments';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch comments from server:', err);
    const local = localStorage.getItem('foros_comments');
    return local ? JSON.parse(local) : [];
  }
}

export async function postCommentToServer(comment: Comment): Promise<Comment> {
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to post comment to server:', err);
    return comment;
  }
}

export async function updateCommentOnServer(commentId: string, text: string): Promise<Comment | null> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to update comment on server:', err);
    return null;
  }
}

export async function deleteCommentFromServer(commentId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (err) {
    console.warn('Failed to delete comment on server:', err);
    return false;
  }
}

// 5. Playlists Endpoints
export async function fetchPlaylists(): Promise<Playlist[]> {
  try {
    const res = await fetch('/api/playlists');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch playlists from server:', err);
    const local = localStorage.getItem('foros_playlists');
    return local ? JSON.parse(local) : [];
  }
}

export async function savePlaylistToServer(playlist: Playlist): Promise<Playlist> {
  try {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlist)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to save playlist to server:', err);
    return playlist;
  }
}

export async function deletePlaylistFromServer(playlistId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (err) {
    console.warn('Failed to delete playlist from server:', err);
    return false;
  }
}

// Subscription Endpoint
export async function toggleSubscriptionOnServer(
  channelId: string, 
  action: 'subscribe' | 'unsubscribe', 
  userId?: string
): Promise<{ channelId: string; subscriberCount: number; isSubscribed: boolean } | null> {
  try {
    const res = await fetch(`/api/channels/${channelId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to toggle subscription on server:', err);
    return null;
  }
}

// 6. Users Endpoints (for cross-device login and creator recognition)
export async function fetchServerUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch users from server:', err);
    const local = localStorage.getItem('foros_users');
    return local ? JSON.parse(local) : [];
  }
}

export async function saveUserToServer(user: User): Promise<User> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to save user to server:', err);
    return user;
  }
}
