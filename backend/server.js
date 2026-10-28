const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, crypto.randomBytes(8).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file ảnh'));
  },
});

const rooms = new Map();

function serializeRoom(room) {
  return {
    id: room.id,
    title: room.title,
    host: room.host,
    status: room.status,
    items: room.items,
    currentBid: room.currentBid ?? 0,
    highestBidder: room.highestBidder ?? 'Chưa có ai đặt giá',
    createdAt: room.createdAt,
    itemCount: room.items.length,
  };
}

function broadcastRoom(roomId, type = 'roomState') {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify({ type, room: serializeRoom(room) });
  room.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

function makeRoom(title, host) {
  const id = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = {
    id,
    title,
    host,
    status: 'setup',
    items: [],
    currentBid: 0,
    highestBidder: 'Chưa có ai đặt giá',
    createdAt: Date.now(),
    clients: new Set(),
  };
  rooms.set(id, room);
  return room;
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, message: 'Auction House API is running' });
});

app.get('/api/rooms', (_, res) => {
  const roomList = [...rooms.values()].map(room => ({
    id: room.id,
    title: room.title,
    host: room.host,
    status: room.status,
    itemCount: room.items.length,
    createdAt: room.createdAt,
  }));

  res.json(roomList);
});

app.post('/api/rooms', (req, res) => {
  const title = String(req.body.title || '').trim();
  const host = String(req.body.host || '').trim() || 'Host';

  if (!title) {
    return res.status(400).json({ error: 'Tên phòng không được để trống' });
  }

  const room = makeRoom(title, host);
  res.status(201).json({ id: room.id, title: room.title, host: room.host });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  res.json(serializeRoom(room));
});

app.post('/api/rooms/:id/items', upload.single('image'), (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (room.status !== 'setup') return res.status(400).json({ error: 'Phòng đã bắt đầu' });

  const name = String(req.body.name || '').trim();
  const tagline = String(req.body.tagline || '').trim();
  const startPrice = Number(req.body.startPrice || 0);
  const duration = Number(req.body.duration || 60);

  if (!name) return res.status(400).json({ error: 'Tên món không được để trống' });

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const item = {
    id: crypto.randomUUID(),
    name,
    tagline,
    startPrice,
    duration,
    imageUrl,
  };

  room.items.push(item);
  broadcastRoom(room.id, 'roomState');
  res.status(201).json({ ok: true, item });
});

app.delete('/api/rooms/:id/items/:itemId', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });

  const itemIndex = room.items.findIndex(item => item.id === req.params.itemId);
  if (itemIndex === -1) return res.status(404).json({ error: 'Không tìm thấy món' });

  const [removed] = room.items.splice(itemIndex, 1);
  if (removed && removed.imageUrl) {
    const absolutePath = path.join(__dirname, removed.imageUrl.replace(/^\//, ''));
    fs.unlink(absolutePath, () => {});
  }

  broadcastRoom(room.id, 'roomState');
  res.json({ ok: true });
});

app.post('/api/rooms/:id/start', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (!room.items.length) return res.status(400).json({ error: 'Phòng chưa có món nào' });

  room.status = 'running';
  room.currentBid = room.items[0].startPrice;
  room.highestBidder = 'Chưa có ai đặt giá';
  broadcastRoom(room.id, 'roomState');
  res.json({ ok: true, roomId: room.id, status: room.status });
});

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = (url.searchParams.get('room') || '').toUpperCase();
  const room = rooms.get(roomId);

  if (!room) {
    socket.send(JSON.stringify({ type: 'error', message: 'Phòng không tồn tại' }));
    socket.close();
    return;
  }

  room.clients.add(socket);
  socket.send(JSON.stringify({ type: 'roomState', room: serializeRoom(room) }));

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'bid') {
        const amount = Number(message.amount || 0);
        const bidderName = String(message.name || 'Khách mới').trim() || 'Khách mới';
        if (!amount || amount <= room.currentBid) {
          socket.send(JSON.stringify({ type: 'error', message: `Giá phải lớn hơn ${room.currentBid.toLocaleString('vi-VN')}₫` }));
          return;
        }

        room.currentBid = amount;
        room.highestBidder = bidderName;
        room.status = 'running';
        broadcastRoom(room.id, 'auctionUpdate');
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Dữ liệu không hợp lệ' }));
    }
  });

  socket.on('close', () => {
    room.clients.delete(socket);
    broadcastRoom(room.id, 'roomState');
  });
});
