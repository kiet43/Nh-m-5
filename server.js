const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 8);
      cb(null, crypto.randomBytes(10).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ nhận file ảnh'));
  },
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const GAP = 8;
const ANTI_SNIPE_WINDOW = 5000; // 5s
const ANTI_SNIPE_EXTEND = 10000; // +10s
const MAX_FEED = 40;
const MAX_NAME = 30;
const MAX_ITEMS = 20;
const ROOM_TTL = 2 * 60 * 60 * 1000; // 2 giờ

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
];

const PRESETS = [
  { name: 'Vintage Seiko Automatic', tagline: 'Đồng hồ cơ Nhật 1970, đã bảo dưỡng toàn bộ', startPrice: 500000, duration: 45 },
  { name: 'Polaroid SX-70', tagline: 'Máy ảnh cổ điển đã test, kèm hộp phim mới', startPrice: 1200000, duration: 60 },
  { name: 'Leica M3 (1954)', tagline: 'Huyền thoại kèm Summicron 50mm, đã CLA', startPrice: 2800000, duration: 90 },
];

const rooms = new Map();

// ---------- helpers ----------
const biddersArray = room => [...room.bidders.entries()]
  .map(([name, amount]) => ({ name, amount }))
  .sort((a, b) => b.amount - a.amount);

function roomBroadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const c of room.clients) if (c.readyState === 1) c.send(data);
}

function setupSnapshot(room) {
  return {
    type: 'setupState',
    status: room.status,
    title: room.title,
    host: room.host,
    online: room.clients.size,
    items: room.items.map(i => ({
      name: i.name,
      tagline: i.tagline,
      startPrice: i.startPrice,
      duration: i.duration,
      imageUrl: i.imageUrl,
      gradient: i.gradient,
    })),
  };
}

function auctionSnapshot(room, extra = {}) {
  return {
    bidders: biddersArray(room),
    online: room.clients.size,
    itemIndex: room.currentIndex + 1,
    totalItems: room.items.length,
    bidFeed: room.bidFeed,
    bidCount: room.bidCount,
    roomTitle: room.title,
    roomHost: room.host,
    ...extra,
  };
}

function startNext(room) {
  room.currentIndex++;
  room.bidders.clear();
  room.bidFeed = [];
  room.bidCount = 0;

  if (room.currentIndex >= room.items.length) {
    room.status = 'finished';
    room.auction = null;
    roomBroadcast(room, { type: 'finished', stats: room.stats });
    return;
  }

  const it = room.items[room.currentIndex];
  room.auction = {
    name: it.name,
    tagline: it.tagline,
    imageUrl: it.imageUrl,
    gradient: it.gradient,
    currentBid: it.startPrice,
    highestBidder: null,
    duration: it.duration,
    endsAt: Date.now() + it.duration * 1000,
  };

  roomBroadcast(room, auctionSnapshot(room, {
    type: 'state',
    auction: room.auction,
    timeLeft: it.duration,
    duration: it.duration,
  }));

  room.timer = setTimeout(() => endAuction(room), it.duration * 1000);
}

function endAuction(room) {
  if (!room.auction) return;
  const a = room.auction;

  if (a.highestBidder) {
    room.stats.sold.push({
      name: a.name,
      imageUrl: a.imageUrl,
      winner: a.highestBidder,
      price: a.currentBid,
    });
    room.stats.totalRevenue += a.currentBid;
    room.stats.byBidder[a.highestBidder] = (room.stats.byBidder[a.highestBidder] || 0) + 1;
  }

  roomBroadcast(room, auctionSnapshot(room, {
    type: 'ended',
    name: a.name,
    imageUrl: a.imageUrl,
    winner: a.highestBidder,
    price: a.currentBid,
    nextIn: GAP,
  }));
  room.auction = null;
  room.gapTimer = setTimeout(() => startNext(room), GAP * 1000);
}

function getRoom(id) { return rooms.get(id) || null; }

function sendInitialState(ws, room) {
  if (room.status === 'setup') {
    ws.send(JSON.stringify(setupSnapshot(room)));
  } else if (room.status === 'running' && room.auction) {
    ws.send(JSON.stringify(auctionSnapshot(room, {
      type: 'state',
      auction: room.auction,
      timeLeft: Math.max(0, Math.ceil((room.auction.endsAt - Date.now()) / 1000)),
      duration: room.auction.duration,
    })));
  } else if (room.status === 'running') {
    ws.send(JSON.stringify({
      type: 'waiting',
      online: room.clients.size,
      nextIn: GAP,
      roomTitle: room.title,
    }));
  } else {
    ws.send(JSON.stringify({ type: 'finished', stats: room.stats }));
  }
}

function cleanupRoomFiles(room) {
  room.items.forEach(it => {
    if (it.imageUrl) {
      const p = path.join(__dirname, 'public', it.imageUrl);
      fs.unlink(p, () => {});
    }
  });
}

// ---------- REST API ----------
app.post('/api/rooms', (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 50);
  const host = String(req.body.host || '').trim().slice(0, MAX_NAME);
  if (!title) return res.status(400).json({ error: 'Tên phòng không được trống' });

  let id;
  do { id = crypto.randomBytes(3).toString('hex'); } while (rooms.has(id));

  const hostToken = crypto.randomBytes(16).toString('hex');
  const room = {
    id, title,
    host: host || 'Ẩn danh',
    hostToken,
    createdAt: Date.now(),
    status: 'setup',
    items: [],
    clients: new Set(),
    bidders: new Map(),
    bidFeed: [],
    bidCount: 0,
    currentIndex: -1,
    auction: null,
    timer: null,
    gapTimer: null,
    stats: { sold: [], totalRevenue: 0, byBidder: {} },
  };
  rooms.set(id, room);
  res.json({ id, hostToken, title: room.title, host: room.host });
});

app.get('/api/rooms', (req, res) => {
  const list = [...rooms.values()].map(r => {
    let status = 'setup';
    if (r.status === 'running') status = r.auction ? 'live' : 'waiting';
    else if (r.status === 'finished') status = 'ended';
    return {
      id: r.id, title: r.title, host: r.host,
      online: r.clients.size, status,
      itemIndex: r.currentIndex + 1,
      totalItems: r.items.length,
      currentItem: r.auction?.name || null,
      createdAt: r.createdAt,
    };
  }).sort((a, b) =>
    (b.status === 'live' ? 1 : 0) - (a.status === 'live' ? 1 : 0) ||
    b.online - a.online ||
    b.createdAt - a.createdAt
  );
  res.json(list);
});

app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

app.post('/api/rooms/:id/items', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (room.status !== 'setup') return res.status(400).json({ error: 'Phòng đã bắt đầu' });
  if (room.items.length >= MAX_ITEMS) return res.status(400).json({ error: `Tối đa ${MAX_ITEMS} món` });

  upload.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Chỉ host mới thêm được' });

    const name = String(req.body.name || '').trim().slice(0, 100);
    const tagline = String(req.body.tagline || '').trim().slice(0, 200);
    const startPrice = Math.max(0, Math.floor(Number(req.body.startPrice) || 0));
    const duration = Math.max(10, Math.min(300, Math.floor(Number(req.body.duration) || 60)));

    if (!name) return res.status(400).json({ error: 'Tên món không được trống' });

    const item = {
      name, tagline, startPrice, duration,
      imageUrl: req.file ? '/uploads/' + req.file.filename : null,
      gradient: GRADIENTS[room.items.length % GRADIENTS.length],
    };
    room.items.push(item);
    roomBroadcast(room, setupSnapshot(room));
    res.json({ ok: true, item });
  });
});

app.delete('/api/rooms/:id/items/:idx', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (room.status !== 'setup') return res.status(400).json({ error: 'Phòng đã bắt đầu' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });

  const idx = Number(req.params.idx);
  if (idx < 0 || idx >= room.items.length) return res.status(404).json({ error: 'Không tìm thấy' });
  const [removed] = room.items.splice(idx, 1);
  if (removed.imageUrl) {
    fs.unlink(path.join(__dirname, 'public', removed.imageUrl), () => {});
  }
  roomBroadcast(room, setupSnapshot(room));
  res.json({ ok: true });
});

app.post('/api/rooms/:id/preset', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });
  if (room.status !== 'setup') return res.status(400).json({ error: 'Phòng đã bắt đầu' });

  PRESETS.forEach(p => {
    if (room.items.length >= MAX_ITEMS) return;
    room.items.push({
      ...p,
      imageUrl: null,
      gradient: GRADIENTS[room.items.length % GRADIENTS.length],
    });
  });
  roomBroadcast(room, setupSnapshot(room));
  res.json({ ok: true });
});

app.post('/api/rooms/:id/start', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });
  if (room.status !== 'setup') return res.status(400).json({ error: 'Phòng đã bắt đầu rồi' });
  if (room.items.length === 0) return res.status(400).json({ error: 'Thêm ít nhất 1 món đã' });

  room.status = 'running';
  room.currentIndex = -1;
  room.stats = { sold: [], totalRevenue: 0, byBidder: {} };
  roomBroadcast(room, { type: 'started' });
  setTimeout(() => startNext(room), 300);
  res.json({ ok: true });
});

app.post('/api/rooms/:id/skip', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });
  if (room.status !== 'running' || !room.auction) return res.status(400).json({ error: 'Không có phiên đang chạy' });

  clearTimeout(room.timer);
  const a = room.auction;
  room.auction = null;
  roomBroadcast(room, auctionSnapshot(room, {
    type: 'skipped',
    name: a.name,
    nextIn: GAP,
  }));
  room.gapTimer = setTimeout(() => startNext(room), GAP * 1000);
  res.json({ ok: true });
});

app.post('/api/rooms/:id/end', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });
  if (room.status !== 'running') return res.status(400).json({ error: 'Phòng không ở trạng thái đấu giá' });

  clearTimeout(room.timer);
  clearTimeout(room.gapTimer);

  // Nếu món hiện tại có winner thì tính
  if (room.auction && room.auction.highestBidder) {
    const a = room.auction;
    room.stats.sold.push({
      name: a.name, imageUrl: a.imageUrl,
      winner: a.highestBidder, price: a.currentBid,
    });
    room.stats.totalRevenue += a.currentBid;
    room.stats.byBidder[a.highestBidder] = (room.stats.byBidder[a.highestBidder] || 0) + 1;
  }

  room.auction = null;
  room.status = 'finished';
  roomBroadcast(room, { type: 'finished', stats: room.stats });
  res.json({ ok: true });
});

app.delete('/api/rooms/:id', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (req.body.hostToken !== room.hostToken) return res.status(403).json({ error: 'Không có quyền' });

  clearTimeout(room.timer);
  clearTimeout(room.gapTimer);
  cleanupRoomFiles(room);

  roomBroadcast(room, { type: 'error', message: 'Host đã xóa phòng', fatal: true });
  room.clients.forEach(c => { try { c.close(); } catch {} });
  rooms.delete(req.params.id);
  res.json({ ok: true });
});

// ---------- WebSocket ----------
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const roomId = (url.searchParams.get('room') || '').slice(0, 30);
  const hostToken = url.searchParams.get('host');

  const room = getRoom(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Phòng không tồn tại hoặc đã đóng', fatal: true }));
    return ws.close();
  }

  ws.isHost = !!(hostToken && room.hostToken === hostToken);
  ws.room = room;
  room.clients.add(ws);

  sendInitialState(ws, room);
  roomBroadcast(room, { type: 'online', online: room.clients.size });

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'bid') return;

    if (room.status !== 'running' || !room.auction) {
      return ws.send(JSON.stringify({ type: 'error', message: 'Chưa có phiên đấu giá' }));
    }

    const name = String(msg.name || '').trim().slice(0, MAX_NAME);
    const amount = Math.floor(Number(msg.amount));

    if (!name) return ws.send(JSON.stringify({ type: 'error', message: 'Vui lòng nhập tên' }));
    if (!amount || amount <= room.auction.currentBid) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: `Giá phải cao hơn ${room.auction.currentBid.toLocaleString('vi-VN')}₫`,
      }));
    }

    room.auction.currentBid = amount;
    room.auction.highestBidder = name;
    room.bidders.set(name, amount);
    room.bidCount++;

    // Anti-sniping: bid trong 5s cuối → cộng thêm 10s
    const now = Date.now();
    let extended = false;
    if (room.auction.endsAt - now < ANTI_SNIPE_WINDOW) {
      room.auction.endsAt += ANTI_SNIPE_EXTEND;
      extended = true;
      clearTimeout(room.timer);
      room.timer = setTimeout(() => endAuction(room), room.auction.endsAt - now);
    }

    const entry = { id: crypto.randomBytes(4).toString('hex'), name, amount, ts: now };
    room.bidFeed.unshift(entry);
    if (room.bidFeed.length > MAX_FEED) room.bidFeed.pop();

    roomBroadcast(room, auctionSnapshot(room, {
      type: 'bidUpdate',
      currentBid: amount,
      highestBidder: name,
      timeLeft: Math.max(0, Math.ceil((room.auction.endsAt - now) / 1000)),
      extended,
      newBid: entry,
    }));
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    roomBroadcast(room, { type: 'online', online: room.clients.size });
  });
});

// ---------- background cleanup ----------
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (room.clients.size > 0) continue;
    if (now - room.createdAt > ROOM_TTL) {
      clearTimeout(room.timer);
      clearTimeout(room.gapTimer);
      cleanupRoomFiles(room);
      rooms.delete(id);
      console.log(`[cleanup] room ${id} (inactive ${Math.round((now - room.createdAt) / 60000)}m)`);
    }
  }
}, 10 * 60 * 1000); // mỗi 10 phút

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`→ http://localhost:${PORT}`));
