const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('OK'); }
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file === '/') file = '/index.html';
  const resolved = path.resolve(path.join(PUBLIC_DIR, file));
  if (!resolved.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(resolved, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ============ CONSTANTS ============
const GRAVITY = 0.5;
const JUMP_VELOCITY = -10;
const MOVE_SPEED = 4;
const MAX_FALL = 12;
const PLAYER_W = 24;
const PLAYER_H = 32;
const TICK_MS = 1000 / 60;
const WORLD_W = 900;
const WORLD_H = 600;

const LEVEL = {
  platforms: [
    { x: 0,   y: 560, w: 900, h: 40 },   // ground
    { x: 200, y: 480, w: 500, h: 20 },   // platform 1
    { x: 300, y: 370, w: 300, h: 20 },   // platform 2 (win)
  ],
  spawns: { X: { x: 230, y: 528 }, O: { x: 646, y: 528 } },
  flag:   { x: 435, y: 330, w: 30,  h: 40 },
};

// ============ HELPERS ============
function overlap(a, b, buf = 0) {
  const aw = a.w || PLAYER_W, ah = a.h || PLAYER_H;
  const bw = b.w || PLAYER_W, bh = b.h || PLAYER_H;
  return a.x < b.x + bw + buf && a.x + aw > b.x - buf &&
         a.y < b.y + bh + buf && a.y + ah > b.y - buf;
}

function makePlayer(spawn) {
  return { x: spawn.x, y: spawn.y, vx: 0, vy: 0,
    onGround: false, onPlayer: null, jumpHeld: false,
    touchedFlag: false, prevX: spawn.x, prevY: spawn.y };
}

// ============ ROOMS ============
const rooms = new Map();
let roomCounter = 0;

function makeRoom() {
  const room = {
    id: 'R' + (++roomCounter),
    players: { X: null, O: null },
    spectators: [],
    state: {
      players: { X: makePlayer(LEVEL.spawns.X), O: makePlayer(LEVEL.spawns.O) },
      input: { X: { left: false, right: false, jump: false }, O: { left: false, right: false, jump: false } },
      winner: false,
    },
    interval: null,
  };
  rooms.set(room.id, room);
  return room;
}

function findRoom() {
  for (const r of rooms.values()) if (!r.players.X || !r.players.O) return r;
  return makeRoom();
}

function resetRoom(room) {
  const s = room.state;
  s.players.X = makePlayer(LEVEL.spawns.X);
  s.players.O = makePlayer(LEVEL.spawns.O);
  s.input.X = { left: false, right: false, jump: false };
  s.input.O = { left: false, right: false, jump: false };
  s.winner = false;
}

function ensureLoop(room) {
  if (room.interval) return;
  room.interval = setInterval(() => tick(room), TICK_MS);
}

function stopLoop(room) {
  if (room.interval) { clearInterval(room.interval); room.interval = null; }
}

// ============ PHYSICS TICK ============
function tick(room) {
  const st = room.state;
  const { players, input } = st;

  // Apply input
  for (const sym of ['X', 'O']) {
    const p = players[sym], inp = input[sym];
    p.vx = 0;
    if (inp.left) p.vx = -MOVE_SPEED;
    if (inp.right) p.vx = MOVE_SPEED;
    if (inp.jump && !p.jumpHeld && (p.onGround || p.onPlayer)) p.vy = JUMP_VELOCITY;
    p.jumpHeld = inp.jump;
    p.prevX = p.x; p.prevY = p.y;
    p.onGround = false;
  }

  // Physics
  for (const sym of ['X', 'O']) {
    const p = players[sym];
    const other = players[sym === 'X' ? 'O' : 'X'];

    // Horizontal
    p.x += p.vx;
    for (const plat of LEVEL.platforms) {
      if (overlap(p, plat)) {
        if (p.vx > 0) p.x = plat.x - PLAYER_W;
        else if (p.vx < 0) p.x = plat.x + plat.w;
        p.vx = 0;
      }
    }
    // Player horizontal collision (only if real overlap, not stacking)
    if (overlap(p, other)) {
      const vOv = Math.min(p.y + PLAYER_H, other.y + PLAYER_H) - Math.max(p.y, other.y);
      if (vOv > PLAYER_H * 0.5) {
        if (p.vx > 0) p.x = other.x - PLAYER_W;
        else if (p.vx < 0) p.x = other.x + PLAYER_W;
        p.vx = 0;
      }
    }
    if (p.x < 0) p.x = 0;
    if (p.x + PLAYER_W > WORLD_W) p.x = WORLD_W - PLAYER_W;

    // Vertical
    p.vy += GRAVITY;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    p.y += p.vy;
    p.onPlayer = null;
    for (const plat of LEVEL.platforms) {
      if (overlap(p, plat)) {
        if (p.vy > 0) { p.y = plat.y - PLAYER_H; p.vy = 0; p.onGround = true; }
        else if (p.vy < 0) { p.y = plat.y + plat.h; p.vy = 0; }
      }
    }
  }

  // Player-on-player stacking (with buffer for touching)
  for (const sym of ['X', 'O']) {
    const p = players[sym];
    const otherSym = sym === 'X' ? 'O' : 'X';
    const other = players[otherSym];
    if (overlap(p, other, 4) && p.vy >= 0 && p.y < other.y) {
      p.y = other.y - PLAYER_H;
      p.vy = 0;
      p.onPlayer = otherSym;
    }
  }

  // Respawn if fell
  for (const sym of ['X', 'O']) {
    const p = players[sym];
    if (p.y > WORLD_H + 100) {
      p.x = LEVEL.spawns[sym].x;
      p.y = LEVEL.spawns[sym].y;
      p.vx = 0; p.vy = 0;
    }
  }

  // Flag check
  if (!st.winner) {
    for (const sym of ['X', 'O']) {
      const p = players[sym];
      if (!p.touchedFlag && overlap(p, LEVEL.flag)) {
        p.touchedFlag = true;
        broadcastChat(room, 'Hệ thống', `🚩 ${sym} đã chạm cờ!`);
      }
    }
    if (players.X.touchedFlag && players.O.touchedFlag) {
      st.winner = true;
      broadcastChat(room, 'Hệ thống', '🎉 CẢ HAI ĐÃ CHẠM CỜ — CHIẾN THẮNG!');
    }
  }

  broadcastState(room);
}

// ============ BROADCAST ============
function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }

function broadcastState(room) {
  const st = room.state;
  const msg = JSON.stringify({
    type: 'state',
    players: {
      X: { x: st.players.X.x, y: st.players.X.y, touchedFlag: st.players.X.touchedFlag },
      O: { x: st.players.O.x, y: st.players.O.y, touchedFlag: st.players.O.touchedFlag },
    },
    winner: st.winner,
    playerInfo: {
      X: room.players.X ? { id: room.players.X.id, name: room.players.X.name } : null,
      O: room.players.O ? { id: room.players.O.id, name: room.players.O.name } : null,
    },
    spectatorCount: room.spectators.length,
    inProgress: !!(room.players.X && room.players.O),
  });
  for (const s of ['X', 'O']) if (room.players[s]) try { room.players[s].send(msg); } catch {}
  for (const s of room.spectators) try { s.send(msg); } catch {}
}

function broadcastChat(room, name, text, extra = {}) {
  const msg = JSON.stringify({ type: 'chat', name, text, ts: Date.now(), ...extra });
  for (const s of ['X', 'O']) if (room.players[s]) try { room.players[s].send(msg); } catch {}
  for (const s of room.spectators) try { s.send(msg); } catch {}
}

// ============ WEBSOCKET ============
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.id = crypto.randomBytes(4).toString('hex');
  ws.name = 'Player-' + ws.id.slice(0, 4);
  ws.symbol = null;
  ws.room = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const room = findRoom();
  ws.room = room;

  let symbol = null;
  if (!room.players.X)      { symbol = 'X'; room.players.X = ws; }
  else if (!room.players.O) { symbol = 'O'; room.players.O = ws; }
  else                      { room.spectators.push(ws); }
  ws.symbol = symbol;

  ensureLoop(room);

  send(ws, { type: 'welcome', id: ws.id, symbol, name: ws.name, level: LEVEL });
  broadcastChat(room, 'Hệ thống', `${ws.name} đã vào (${symbol ? 'Người chơi ' + symbol : 'Khán giả'})`);
  broadcastState(room);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const room = ws.room;
    if (!room) return;

    switch (msg.type) {
      case 'input':
        if (ws.symbol && room.state.input[ws.symbol]) {
          room.state.input[ws.symbol] = {
            left: !!msg.left, right: !!msg.right, jump: !!msg.jump,
          };
        }
        break;
      case 'chat': {
        const text = String(msg.text || '').slice(0, 300).trim();
        if (text) broadcastChat(room, ws.name, text, { self: ws.id });
        break;
      }
      case 'setName': {
        const name = String(msg.name || '').trim().slice(0, 20);
        if (name && name !== ws.name) {
          const old = ws.name; ws.name = name;
          broadcastChat(room, 'Hệ thống', `${old} → ${name}`);
          broadcastState(room);
        }
        break;
      }
      case 'reset':
        if (ws.symbol) {
          resetRoom(room);
          broadcastChat(room, 'Hệ thống', `🔄 ${ws.name} đã reset game`);
          broadcastState(room);
        }
        break;
    }
  });

  ws.on('close', () => {
    const room = ws.room;
    if (!room) return;
    if (room.players.X === ws) room.players.X = null;
    if (room.players.O === ws) room.players.O = null;
    room.spectators = room.spectators.filter(s => s !== ws);
    ws.room = null;

    broadcastChat(room, 'Hệ thống', `${ws.name} đã rời phòng`);
    resetRoom(room);

    if (!room.players.X && room.spectators.length) {
      const s = room.spectators.shift();
      s.symbol = 'X'; room.players.X = s;
      send(s, { type: 'role', symbol: 'X' });
    }
    if (!room.players.O && room.spectators.length) {
      const s = room.spectators.shift();
      s.symbol = 'O'; room.players.O = s;
      send(s, { type: 'role', symbol: 'O' });
    }

    if (!room.players.X && !room.players.O && room.spectators.length === 0) {
      stopLoop(room);
      rooms.delete(room.id);
    } else {
      broadcastState(room);
    }
  });
});

// Ping keepalive (quan trọng cho public deployment)
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

httpServer.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
});
