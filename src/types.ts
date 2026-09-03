export interface User {
  id: string;
  username: string;
  email: string;
  avatarColor: string;
  joinedDate: string;
  subscribers: number;
  avatarUrl?: string;
}

export type VideoStatus = 'public' | 'private' | 'scheduled';

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string; // Object URL for uploaded, or web URL for stock
  thumbnailUrl: string;
  uploaderId: string;
  uploaderName: string;
  views: number;
  likes: number;
  shares: number;
  fileHash: string; // Used for copyright checking
  fileSize: number; // In bytes
  status: VideoStatus;
  scheduledTime?: string; // ISO string or readable format
  createdAt: string;
  duration: string; // e.g., "3:45"
  isStock?: boolean;
  language?: string; // e.g. "Tamil", "English"
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  avatarColor: string;
  text: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  videoIds: string[];
  createdAt: string;
  isPrivate?: boolean;
}

export interface CopyrightRecord {
  id: string;
  fileHash: string;
  originalVideoId: string;
  originalVideoTitle: string;
  originalUploaderName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
  read: boolean;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  videoId: string;
  watchedAt: string;
}

