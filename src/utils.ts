import { Video, Comment, Playlist } from './types';

// Real SHA-256 hashing of the first 1MB of a file for instant, accurate copyright checks
export async function calculateFileHash(file: File): Promise<string> {
  try {
    const slice = file.slice(0, 1024 * 1024); // Hash first 1MB for speed
    const arrayBuffer = await slice.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    // Fallback hash based on file metadata if SubtleCrypto isn't available
    console.warn('SubtleCrypto not available, using metadata fallback for hash.', error);
    let hash = 0;
    const str = `${file.name}_${file.size}_${file.lastModified}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `meta-${Math.abs(hash).toString(16)}`;
  }
}

// Format numbers like 1,234,567 into "1.2M" or "12.3K"
export function formatViews(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Format bytes into GB, MB, KB
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate human-friendly time ago
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m uploader ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Curated stock videos to populate the initial feed
export const INITIAL_VIDEOS: Video[] = [
  {
    id: 'stock-1',
    title: 'Surfing the Majestic Ocean Waves',
    description: 'A breathtaking capture of professional surfers conquering massive barrels in the pristine waters of Tahiti. Experience the raw power and beauty of the sea in crystal clear high-definition.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-43028-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1280&h=720&q=80',
    uploaderId: 'system-creator',
    uploaderName: 'OceanPulse',
    views: 1420500,
    likes: 85200,
    shares: 4120,
    fileHash: 'copyright-ocean-waves-preset-hash-01',
    fileSize: 45000000, // 45MB
    status: 'public',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '0:30',
    isStock: true
  },
  {
    id: 'stock-2',
    title: 'Ethereal Forest Canopy Under Sunrise',
    description: 'Immerse yourself in nature with this soothing morning walk through an ancient red cedar forest as the first rays of sunlight filter through the canopy.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1280&h=720&q=80',
    uploaderId: 'system-creator-2',
    uploaderName: 'GreenwoodWanderer',
    views: 683000,
    likes: 42300,
    shares: 1280,
    fileHash: 'copyright-forest-stream-preset-hash-02',
    fileSize: 32000000, // 32MB
    status: 'public',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '0:14',
    isStock: true
  },
  {
    id: 'stock-3',
    title: 'Cosmic Journey: Exploring the Abyss',
    description: 'A sci-fi CGI representation of deep space exploration, displaying nebulas, distant galaxies, and celestial dust in a hypnotic, meditative loop.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-space-1611-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&h=720&q=80',
    uploaderId: 'system-creator-3',
    uploaderName: 'AstroMedia',
    views: 295400,
    likes: 19800,
    shares: 3100,
    fileHash: 'copyright-deep-space-preset-hash-03',
    fileSize: 58000000, // 58MB
    status: 'public',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    duration: '0:22',
    isStock: true
  },
  {
    id: 'stock-4',
    title: 'Warm Summer Pool Splashes',
    description: 'Relaxing lifestyle visuals of refreshing blue swimming pool water during a hot midsummer afternoon. Perfect background vibes.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-womans-feet-splashing-in-a-swimming-pool-43003-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1280&h=720&q=80',
    uploaderId: 'system-creator',
    uploaderName: 'OceanPulse',
    views: 125000,
    likes: 7400,
    shares: 480,
    fileHash: 'copyright-pool-splash-preset-hash-04',
    fileSize: 18000000, // 18MB
    status: 'public',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '0:12',
    isStock: true
  },
  {
    id: 'stock-5',
    title: 'Curious Cat Staring Into Your Soul',
    description: 'A close-up high frame rate portrait of a beautiful, curious domestic cat inspecting the camera lens with wide, playful eyes.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-curious-cat-looking-at-camera-41724-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1280&h=720&q=80',
    uploaderId: 'system-creator-4',
    uploaderName: 'PawsomeTV',
    views: 2054000,
    likes: 149000,
    shares: 12500,
    fileHash: 'copyright-curious-cat-preset-hash-05',
    fileSize: 12000000, // 12MB
    status: 'public',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '0:07',
    isStock: true
  }
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comment-1',
    videoId: 'stock-1',
    userId: 'user-bob',
    username: 'BobTheSurfer',
    avatarColor: 'bg-teal-500',
    text: 'This video is insane! The camera quality inside that barrel is unmatched. Feels like I am right there on the board.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comment-2',
    videoId: 'stock-1',
    userId: 'user-alice',
    username: 'AliceAdventures',
    avatarColor: 'bg-rose-500',
    text: 'Wow, the colors in this are spectacular. The grading is top tier! Keep uploading content like this.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comment-3',
    videoId: 'stock-2',
    userId: 'user-charlie',
    username: 'Charlie_Nature_Lover',
    avatarColor: 'bg-emerald-500',
    text: 'Absolute bliss. I put this on repeat in the background while studying. Incredibly calming.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-nature',
    userId: 'system-creator',
    name: 'Serene Nature Escapes',
    description: 'A curated list of peaceful landscapes, ocean waves, and quiet forest streams designed to help you decompress.',
    videoIds: ['stock-2', 'stock-1', 'stock-4'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];
