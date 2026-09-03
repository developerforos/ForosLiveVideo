import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial default seed datasets
const INITIAL_SYSTEM_VIDEOS = [
  {
    id: 'stock-1',
    title: 'Surfing the Majestic Ocean Waves',
    description: 'A breathtaking capture of professional surfers conquering massive barrels in the pristine waters of Tahiti. Experience the raw power and beauty of the sea in crystal clear high-definition.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-43028-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    uploaderId: 'system-creator',
    uploaderName: 'OceanPulse',
    views: 1420500,
    likes: 85200,
    shares: 4120,
    fileHash: 'copyright-ocean-waves-preset-hash-01',
    fileSize: 45000000,
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
    uploaderId: 'system-creator-2',
    uploaderName: 'GreenwoodWanderer',
    views: 683000,
    likes: 42300,
    shares: 1280,
    fileHash: 'copyright-forest-stream-preset-hash-02',
    fileSize: 32000000,
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    uploaderId: 'system-creator-3',
    uploaderName: 'AstroMedia',
    views: 295400,
    likes: 19800,
    shares: 3100,
    fileHash: 'copyright-deep-space-preset-hash-03',
    fileSize: 58000000,
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    uploaderId: 'system-creator',
    uploaderName: 'OceanPulse',
    views: 125000,
    likes: 7400,
    shares: 480,
    fileHash: 'copyright-pool-splash-preset-hash-04',
    fileSize: 18000000,
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    uploaderId: 'system-creator-4',
    uploaderName: 'PawsomeTV',
    views: 2054000,
    likes: 149000,
    shares: 12500,
    fileHash: 'copyright-curious-cat-preset-hash-05',
    fileSize: 12000000,
    status: 'public',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '0:07',
    isStock: true
  }
];

const INITIAL_SYSTEM_CHANNELS = [
  {
    id: 'system-creator',
    name: 'OceanPulse',
    avatarColor: 'bg-emerald-500',
    subscriberCount: 142000,
    videoCount: 2
  },
  {
    id: 'system-creator-2',
    name: 'GreenwoodWanderer',
    avatarColor: 'bg-teal-500',
    subscriberCount: 89000,
    videoCount: 1
  },
  {
    id: 'system-creator-3',
    name: 'AstroMedia',
    avatarColor: 'bg-violet-500',
    subscriberCount: 254000,
    videoCount: 1
  },
  {
    id: 'system-creator-4',
    name: 'PawsomeTV',
    avatarColor: 'bg-rose-500',
    subscriberCount: 412000,
    videoCount: 1
  }
];

const INITIAL_SYSTEM_COMMENTS = [
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

const INITIAL_SYSTEM_PLAYLISTS = [
  {
    id: 'playlist-nature',
    userId: 'system-creator',
    name: 'Serene Nature Escapes',
    description: 'A curated list of peaceful landscapes, ocean waves, and quiet forest streams designed to help you decompress.',
    videoIds: ['stock-2', 'stock-1', 'stock-4'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

interface DatabaseSchema {
  videos: any[];
  channels: any[];
  comments: any[];
  playlists: any[];
  users: any[];
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        videos: INITIAL_SYSTEM_VIDEOS,
        channels: INITIAL_SYSTEM_CHANNELS,
        comments: INITIAL_SYSTEM_COMMENTS,
        playlists: INITIAL_SYSTEM_PLAYLISTS,
        users: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, returning fallback:', err);
    return {
      videos: INITIAL_SYSTEM_VIDEOS,
      channels: INITIAL_SYSTEM_CHANNELS,
      comments: INITIAL_SYSTEM_COMMENTS,
      playlists: INITIAL_SYSTEM_PLAYLISTS,
      users: []
    };
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Multer storage setup for video and image files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 600 * 1024 * 1024 } // 600MB
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static serving of uploaded videos and thumbnails with HTTP Byte Range support for iOS/Android video seek
  app.use('/uploads', express.static(UPLOADS_DIR, {
    maxAge: '1d',
    acceptRanges: true
  }));

  // --- REST API ENDPOINTS ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', server: 'express' });
  });

  // 1. File Upload (video / thumbnail)
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });

  // 2. Videos API
  app.get('/api/videos', (_req, res) => {
    const db = readDb();
    res.json(db.videos);
  });

  app.post('/api/videos', (req, res) => {
    const db = readDb();
    const newVideo = req.body;
    if (!newVideo || !newVideo.title) {
      return res.status(400).json({ error: 'Video title is required' });
    }

    if (!newVideo.id) {
      newVideo.id = `v-user-${Date.now()}`;
    }

    // Insert at front
    db.videos = [newVideo, ...db.videos.filter(v => v.id !== newVideo.id)];

    // Sync uploader channel
    const uploaderId = newVideo.uploaderId || 'anon-creator';
    const uploaderName = newVideo.uploaderName || 'Anonymous Creator';

    const existingChannel = db.channels.find(c => c.id === uploaderId || c.name.toLowerCase() === uploaderName.toLowerCase());
    if (existingChannel) {
      existingChannel.name = uploaderName;
      existingChannel.videoCount = db.videos.filter(v => v.uploaderId === existingChannel.id && (v.status === 'public' || !v.status)).length;
    } else {
      const colors = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-indigo-500', 'bg-teal-500'];
      const colorIndex = Math.abs(uploaderName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % colors.length;
      const matchedUser = db.users.find(u => u.id === uploaderId);
      db.channels.push({
        id: uploaderId,
        name: uploaderName,
        avatarColor: colors[colorIndex],
        subscriberCount: matchedUser ? (matchedUser.subscribers || 0) : 0,
        videoCount: 1
      });
    }

    writeDb(db);
    res.json(newVideo);
  });

  app.put('/api/videos/:id', (req, res) => {
    const db = readDb();
    const index = db.videos.findIndex(v => v.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }

    db.videos[index] = { ...db.videos[index], ...req.body };
    writeDb(db);
    res.json(db.videos[index]);
  });

  app.delete('/api/videos/:id', (req, res) => {
    const db = readDb();
    const video = db.videos.find(v => v.id === req.params.id);
    if (video) {
      if (video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), video.videoUrl);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to unlink video file:', e); }
        }
      }
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
        const thumbPath = path.join(process.cwd(), video.thumbnailUrl);
        if (fs.existsSync(thumbPath)) {
          try { fs.unlinkSync(thumbPath); } catch (e) { console.error('Failed to unlink thumbnail file:', e); }
        }
      }

      db.videos = db.videos.filter(v => v.id !== req.params.id);

      // Recalculate channel video count
      const channel = db.channels.find(c => c.id === video.uploaderId);
      if (channel) {
        channel.videoCount = db.videos.filter(v => v.uploaderId === channel.id && v.status === 'public').length;
      }

      writeDb(db);
    }
    res.json({ success: true });
  });

  // 3. Channels API
  app.get('/api/channels', (_req, res) => {
    const db = readDb();

    // Dynamically derive and enrich channels list with actual video counts
    const channelMap = new Map<string, any>();
    db.channels.forEach(c => {
      channelMap.set(c.id, { ...c, videoCount: 0 });
    });

    db.videos.forEach(v => {
      const existing = channelMap.get(v.uploaderId);
      if (existing) {
        if (v.status === 'public' || !v.status) {
          existing.videoCount += 1;
        }
        existing.name = v.uploaderName;
      } else {
        const colors = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-indigo-500', 'bg-teal-500'];
        const colorIndex = Math.abs(v.uploaderName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % colors.length;
        const matchedUser = db.users.find(u => u.id === v.uploaderId);
        const newChan = {
          id: v.uploaderId,
          name: v.uploaderName,
          avatarColor: colors[colorIndex],
          subscriberCount: matchedUser ? (matchedUser.subscribers || 0) : 0,
          videoCount: (v.status === 'public' || !v.status) ? 1 : 0
        };
        db.channels.push(newChan);
        channelMap.set(v.uploaderId, newChan);
      }
    });

    res.json(Array.from(channelMap.values()));
  });

  app.post('/api/channels', (req, res) => {
    const db = readDb();
    const newChannel = req.body;
    if (!newChannel.id || !newChannel.name) {
      return res.status(400).json({ error: 'Channel id and name required' });
    }

    const idx = db.channels.findIndex(c => c.id === newChannel.id);
    if (idx > -1) {
      db.channels[idx] = { ...db.channels[idx], ...newChannel };
    } else {
      db.channels.push(newChannel);
    }
    writeDb(db);
    res.json(newChannel);
  });

  // Channel Subscribe / Unsubscribe (Real subscriber count tracking)
  app.post('/api/channels/:id/subscribe', (req, res) => {
    const db = readDb();
    const channelId = req.params.id;
    const { action } = req.body; // 'subscribe' | 'unsubscribe'
    
    let channel = db.channels.find(c => c.id === channelId);
    if (!channel) {
      const matchingVideo = db.videos.find(v => v.uploaderId === channelId);
      const uploaderName = matchingVideo ? matchingVideo.uploaderName : 'Creator';
      const colors = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-indigo-500', 'bg-teal-500'];
      const colorIndex = Math.abs(uploaderName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % colors.length;
      const matchedUser = db.users.find(u => u.id === channelId);
      channel = {
        id: channelId,
        name: uploaderName,
        avatarColor: colors[colorIndex],
        subscriberCount: matchedUser ? (matchedUser.subscribers || 0) : 0,
        videoCount: db.videos.filter(v => v.uploaderId === channelId && (v.status === 'public' || !v.status)).length
      };
      db.channels.push(channel);
    }

    if (action === 'unsubscribe') {
      channel.subscriberCount = Math.max(0, (channel.subscriberCount || 1) - 1);
    } else {
      channel.subscriberCount = (channel.subscriberCount || 0) + 1;
    }

    // Also sync the matching registered user's subscriber count
    const user = db.users.find(u => u.id === channelId);
    if (user) {
      user.subscribers = channel.subscriberCount;
    }

    writeDb(db);
    res.json({
      success: true,
      channelId: channel.id,
      subscriberCount: channel.subscriberCount,
      isSubscribed: action !== 'unsubscribe'
    });
  });

  // 4. Comments API
  app.get('/api/comments', (req, res) => {
    const db = readDb();
    const videoId = req.query.videoId as string | undefined;
    if (videoId) {
      res.json(db.comments.filter(c => c.videoId === videoId));
    } else {
      res.json(db.comments);
    }
  });

  app.post('/api/comments', (req, res) => {
    const db = readDb();
    const newComment = req.body;
    if (!newComment.videoId || !newComment.text) {
      return res.status(400).json({ error: 'Comment videoId and text are required' });
    }

    if (!newComment.id) {
      newComment.id = `c-${Date.now()}`;
    }
    if (!newComment.createdAt) {
      newComment.createdAt = new Date().toISOString();
    }

    db.comments = [newComment, ...db.comments];
    writeDb(db);
    res.json(newComment);
  });

  app.put('/api/comments/:id', (req, res) => {
    const db = readDb();
    const commentId = req.params.id;
    const { text } = req.body;
    
    const idx = db.comments.findIndex(c => c.id === commentId);
    if (idx > -1) {
      db.comments[idx].text = text;
      writeDb(db);
      res.json(db.comments[idx]);
    } else {
      res.status(404).json({ error: 'Comment not found' });
    }
  });

  app.delete('/api/comments/:id', (req, res) => {
    const db = readDb();
    const commentId = req.params.id;
    const initialLength = db.comments.length;
    
    db.comments = db.comments.filter(c => c.id !== commentId);
    if (db.comments.length < initialLength) {
      writeDb(db);
      res.json({ success: true, id: commentId });
    } else {
      res.status(404).json({ error: 'Comment not found' });
    }
  });

  // 5. Playlists API
  app.get('/api/playlists', (_req, res) => {
    const db = readDb();
    res.json(db.playlists);
  });

  app.post('/api/playlists', (req, res) => {
    const db = readDb();
    const playlist = req.body;
    if (!playlist.id) {
      playlist.id = `pl-${Date.now()}`;
    }

    const idx = db.playlists.findIndex(p => p.id === playlist.id);
    if (idx > -1) {
      db.playlists[idx] = playlist;
    } else {
      db.playlists = [playlist, ...db.playlists];
    }
    writeDb(db);
    res.json(playlist);
  });

  app.delete('/api/playlists/:id', (req, res) => {
    const db = readDb();
    const initialLen = db.playlists.length;
    db.playlists = db.playlists.filter(p => p.id !== req.params.id);
    writeDb(db);
    res.json({ success: true, deleted: db.playlists.length < initialLen });
  });

  // 6. Users API (Cross-device accounts and creators)
  app.get('/api/users', (_req, res) => {
    const db = readDb();
    res.json(db.users);
  });

  app.post('/api/users', (req, res) => {
    const db = readDb();
    const user = req.body;
    if (!user.email || !user.username) {
      return res.status(400).json({ error: 'User username and email are required' });
    }

    const idx = db.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx > -1) {
      db.users[idx] = { ...db.users[idx], ...user };
    } else {
      db.users.push(user);
    }

    // Also register this user as a creator channel
    const channelIdx = db.channels.findIndex(c => c.id === user.id);
    if (channelIdx > -1) {
      db.channels[channelIdx] = {
        ...db.channels[channelIdx],
        name: user.username,
        avatarUrl: user.avatarUrl
      };
    } else {
      db.channels.push({
        id: user.id,
        name: user.username,
        avatarColor: user.avatarColor || 'bg-violet-600',
        subscriberCount: user.subscribers || 0,
        videoCount: 0,
        avatarUrl: user.avatarUrl
      });
    }

    writeDb(db);
    res.json(user);
  });

  // Vite middleware integration for Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from /dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Full-Stack Express server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
