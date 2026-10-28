import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

const sampleRooms = [
  { id: 'A1B2C3', title: 'Bộ sưu tập cổ điển', host: 'Hoàng', status: 'live', itemCount: 4 },
  { id: 'F9D4Q7', title: 'Đồng hồ Nhật Bản', host: 'Linh', status: 'setup', itemCount: 2 },
  { id: 'K9P2M1', title: 'Máy ảnh 70s', host: 'Minh', status: 'ended', itemCount: 3 },
];

const sampleItems = [
  {
    id: 1,
    name: 'Vintage Seiko Automatic',
    tagline: 'Đồng hồ cơ Nhật 1970, đã bảo dưỡng toàn bộ',
    startPrice: 500000,
    duration: 45,
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 2,
    name: 'Polaroid SX-70',
    tagline: 'Máy ảnh cổ điển đã test, kèm hộp phim mới',
    startPrice: 1200000,
    duration: 60,
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
];

const sampleBidders = [
  { name: 'Huy', amount: 2800000 },
  { name: 'Lan', amount: 2400000 },
  { name: 'Tùng', amount: 2100000 },
];

const sampleFeed = [
  { name: 'Huy', amount: 2800000, ts: Date.now() - 30000 },
  { name: 'Lan', amount: 2400000, ts: Date.now() - 50000 },
  { name: 'Tùng', amount: 2100000, ts: Date.now() - 70000 },
];

const formatMoney = (value = 0) => Number(value).toLocaleString('vi-VN') + '₫';

function App() {
  const wsRef = useRef(null);
  const [rooms, setRooms] = useState(sampleRooms);
  const [view, setView] = useState('landing');
  const [currentTab, setCurrentTab] = useState('create');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [items, setItems] = useState(sampleItems);
  const [auction, setAuction] = useState({
    name: 'Vintage Seiko Automatic',
    tagline: 'Đồng hồ cơ Nhật 1970, đã bảo dưỡng toàn bộ',
    currentBid: 500000,
    highestBidder: 'Chưa có ai đặt giá',
    duration: 45,
    timeLeft: 42,
    bidCount: 3,
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  });
  const [bidders, setBidders] = useState(sampleBidders);
  const [feed, setFeed] = useState(sampleFeed);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    tagline: '',
    startPrice: 500000,
    duration: 45,
  });

  const connectSocket = (roomId) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}?room=${roomId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'error') {
        setMessage(payload.message || 'Lỗi từ server');
        return;
      }

      if (payload.type === 'roomState' || payload.type === 'auctionUpdate') {
        const room = payload.room || {};
        setRoomInfo({
          id: room.id,
          title: room.title,
          host: room.host,
          status: room.status,
        });
        setItems(room.items || []);
        setAuction((prev) => ({
          ...prev,
          name: (room.items && room.items[0] && room.items[0].name) || prev.name,
          tagline: (room.items && room.items[0] && room.items[0].tagline) || prev.tagline,
          currentBid: room.currentBid ?? prev.currentBid,
          highestBidder: room.highestBidder ?? prev.highestBidder,
          duration: (room.items && room.items[0] && room.items[0].duration) || prev.duration,
          timeLeft: (room.items && room.items[0] && room.items[0].duration) || prev.timeLeft,
          bidCount: prev.bidCount,
          imageUrl: (room.items && room.items[0] && room.items[0].imageUrl) || prev.imageUrl,
          gradient: (room.items && room.items[0] && room.items[0].gradient) || prev.gradient,
        }));
      }
    };
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms`);
      const data = await res.json();
      if (Array.isArray(data) && data.length) setRooms(data);
    } catch {
      setRooms(sampleRooms);
    }
  };

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setMessage('Tên phòng không được để trống');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, host: name || 'Host' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo phòng');

      setRoomInfo({ id: data.id, title: data.title, host: data.host, status: 'setup' });
      setView('room');
      setMessage(`Phòng ${data.title} được tạo thành công`);
      setTitle('');
      setJoinCode(data.id);
      connectSocket(data.id);
      await fetchRooms();
    } catch (error) {
      setMessage(error.message || 'Không thể tạo phòng');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();
    const code = joinCode.trim();
    if (!code) {
      setMessage('Vui lòng nhập mã phòng');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/rooms/${code.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể vào phòng');
      setRoomInfo({ id: data.id, title: data.title, host: data.host, status: data.status || 'setup' });
      setItems(data.items || []);
      setView('room');
      setMessage(`Đang vào phòng ${data.title}`);
      connectSocket(data.id);
    } catch (error) {
      setMessage(error.message || 'Mã phòng không tồn tại');
    } finally {
      setLoading(false);
    }
  };

  const refreshRoom = async (roomId) => {
    if (!roomId) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) return;
      setRoomInfo({ id: data.id, title: data.title, host: data.host, status: data.status || 'setup' });
      setItems(data.items || []);
    } catch {
      // ignore
    }
  };

  const handleAddItem = async (event) => {
    event.preventDefault();
    if (!itemForm.name.trim() || !roomInfo?.id) return;

    try {
      const formData = new FormData();
      formData.append('name', itemForm.name);
      formData.append('tagline', itemForm.tagline);
      formData.append('startPrice', String(itemForm.startPrice));
      formData.append('duration', String(itemForm.duration));

      const res = await fetch(`${API_URL}/api/rooms/${roomInfo.id}/items`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể thêm món');

      setItemForm({ name: '', tagline: '', startPrice: 500000, duration: 45 });
      await refreshRoom(roomInfo.id);
      setMessage('✓ Đã thêm món');
    } catch (error) {
      setMessage(error.message || 'Không thể thêm món');
    }
  };

  const startAuction = async () => {
    if (!roomInfo?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomInfo.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể bắt đầu');
      setRoomInfo((prev) => ({ ...prev, status: 'running' }));
      setMessage('Đấu giá đã bắt đầu');
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'start', roomId: roomInfo.id }));
      }
    } catch (error) {
      setMessage(error.message || 'Không thể bắt đầu');
    }
  };

  const bidNow = () => {
    if (!roomInfo?.id || !wsRef.current) return;

    const amount = Number(auction.currentBid || 0) + 500000;
    const bidderName = name || 'Khách mới';
    wsRef.current.send(JSON.stringify({ type: 'bid', name: bidderName, amount }));
    setAuction((prev) => ({
      ...prev,
      currentBid: amount,
      highestBidder: bidderName,
      bidCount: prev.bidCount + 1,
    }));
  };

  const roomStats = useMemo(() => ({
    sold: 3,
    revenue: 8900000,
  }), []);

  return (
    <div className="auction-app">
      {!roomInfo || view === 'landing' ? (
        <LandingScreen
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          name={name}
          setName={setName}
          title={title}
          setTitle={setTitle}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          rooms={rooms}
          loading={loading}
          message={message}
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          onOpenRoom={(room) => {
            setRoomInfo({ id: room.id, title: room.title, host: room.host, status: room.status || 'setup' });
            setView('room');
            connectSocket(room.id);
          }}
        />
      ) : (
        <RoomScreen
          roomInfo={roomInfo}
          items={items}
          auction={auction}
          bidders={bidders}
          feed={feed}
          roomStats={roomStats}
          onBack={() => {
            if (wsRef.current) wsRef.current.close();
            wsRef.current = null;
            setView('landing');
          }}
          onStart={startAuction}
          onBid={bidNow}
          onAddItem={handleAddItem}
          itemForm={itemForm}
          setItemForm={setItemForm}
          setRoomInfo={setRoomInfo}
        />
      )}
    </div>
  );
}

function LandingScreen({
  currentTab,
  setCurrentTab,
  name,
  setName,
  title,
  setTitle,
  joinCode,
  setJoinCode,
  rooms,
  loading,
  message,
  onCreate,
  onJoin,
  onOpenRoom,
}) {
  return (
    <div className="screen landing-screen">
      <div className="blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div className="landing-content">
        <div className="brand">
          <div className="brand-icon">◆</div>
          <div className="brand-text">
            <span>Auction</span>
            <span>House</span>
          </div>
        </div>

        <h1 className="landing-title">
          Tạo <span className="gradient-text">phòng đấu giá</span> realtime ngay hôm nay
        </h1>

        <p className="landing-sub">
          Host tạo món, người tham gia bid theo thời gian thực, cùng bảng xếp hạng và anti-sniping.
        </p>

        <div className="landing-card">
          <div className="tabs">
            <button type="button" className={`tab ${currentTab === 'create' ? 'active' : ''}`} onClick={() => setCurrentTab('create')}>
              Tạo phòng
            </button>
            <button type="button" className={`tab ${currentTab === 'join' ? 'active' : ''}`} onClick={() => setCurrentTab('join')}>
              Tham gia
            </button>
          </div>

          {currentTab === 'create' ? (
            <form onSubmit={onCreate}>
              <div className="field">
                <label>Tên hiển thị</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" />
              </div>

              <div className="field">
                <label>Tên phòng</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bộ sưu tập cổ điển" />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo phòng →'}
              </button>
            </form>
          ) : (
            <form onSubmit={onJoin}>
              <div className="field">
                <label>Tên hiển thị</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" />
              </div>

              <div className="field">
                <label>Mã phòng</label>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="VD: A1B2C3" />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang vào...' : 'Vào phòng'}
              </button>
            </form>
          )}

          <div className="rooms-header">
            <span>Phòng đang mở</span>
            <button type="button" className="refresh-btn" aria-label="refresh rooms">
              ↻
            </button>
          </div>

          <ul className="rooms-list">
            {rooms.length ? rooms.map((room) => (
              <li key={room.id} className="room-item" onClick={() => onOpenRoom(room)}>
                <div className="room-item-icon">{room.status === 'live' ? '🔴' : room.status === 'ended' ? '✅' : '⚙️'}</div>
                <div className="room-item-body">
                  <div className="room-item-title">{room.title}</div>
                  <div className="room-item-meta">
                    <span>👤 {room.host}</span>
                    <span>{room.status === 'live' ? 'LIVE' : room.status === 'ended' ? 'Đã kết thúc' : 'Đang chuẩn bị'}</span>
                  </div>
                </div>
                <div className="room-item-online">{room.itemCount} món</div>
              </li>
            )) : <li className="rooms-empty">Chưa có phòng nào. Hãy tạo phòng đầu tiên!</li>}
          </ul>
        </div>

        {message ? <div className="notice-box">{message}</div> : null}
        <div className="landing-footer">Built with React + Express · WebSocket ready</div>
      </div>
    </div>
  );
}

function RoomScreen({
  roomInfo,
  items,
  auction,
  bidders,
  feed,
  roomStats,
  onBack,
  onStart,
  onBid,
  onAddItem,
  itemForm,
  setItemForm,
  setRoomInfo,
}) {
  const isSetup = roomInfo.status === 'setup';

  return (
    <div className="screen room-screen">
      <header className="topbar">
        <div className="topbar-brand">Auction House</div>
        <div className="topbar-right">
          <div className="room-chip">
            <span className="dot" />
            <span>{roomInfo.title}</span>
          </div>
          <div className="online-chip">
            <span className="online-dot" />
            <span>{bidders.length} người</span>
          </div>
          <button type="button" className="icon-btn" onClick={onBack}>🏠</button>
        </div>
      </header>

      <div className="room-grid">
        <section className="main-panel">
          {isSetup ? (
            <div className="setup-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Chuẩn bị phòng</p>
                  <h2>{roomInfo.title}</h2>
                </div>
                <button type="button" className="btn-primary" onClick={onStart}>🚀 Bắt đầu đấu giá</button>
              </div>

              <form className="item-form" onSubmit={onAddItem}>
                <div className="field-row">
                  <input
                    value={itemForm.name}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Tên món đấu giá"
                  />
                  <input
                    value={itemForm.startPrice}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, startPrice: e.target.value }))}
                    type="number"
                    placeholder="Giá khởi điểm"
                  />
                </div>

                <div className="field-row">
                  <input
                    value={itemForm.tagline}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Mô tả ngắn"
                  />
                  <input
                    value={itemForm.duration}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, duration: e.target.value }))}
                    type="number"
                    placeholder="Thời lượng (s)"
                  />
                </div>

                <button type="submit" className="btn-secondary">+ Thêm món</button>
              </form>

              <div className="setup-list">
                {items.map((item, index) => (
                  <div className="setup-item" key={item.id ?? index}>
                    <div className="setup-thumb" style={{ background: item.gradient }}>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : '📦'}
                    </div>
                    <div className="setup-content">
                      <div className="setup-name">{index + 1}. {item.name}</div>
                      <div className="setup-meta">
                        <span>💰 {formatMoney(item.startPrice)}</span>
                        <span>⏱ {item.duration}s</span>
                      </div>
                      <div className="setup-tagline">{item.tagline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="auction-panel">
              <div className="product-hero" style={{ background: auction.gradient }}>
                <div className="timer-box">
                  <span className="timer-label">Còn lại</span>
                  <strong>{auction.timeLeft}s</strong>
                </div>
                <div className="product-glyph">📦</div>
              </div>

              <div className="auction-meta">
                <span className="item-badge">{roomInfo.id}</span>
                <span className="status-live">LIVE</span>
              </div>

              <h2 className="auction-title">{auction.name}</h2>
              <p className="auction-tagline">{auction.tagline}</p>

              <div className="price-row">
                <div>
                  <span className="price-label">Giá hiện tại</span>
                  <div className="price-value">{formatMoney(auction.currentBid)}</div>
                </div>
                <div>
                  <span className="price-label">Người đang dẫn đầu</span>
                  <div className="price-leader">{auction.highestBidder}</div>
                </div>
              </div>

              <div className="bid-actions">
                <button type="button" className="quick-bid" onClick={onBid}>+500k</button>
                <button type="button" className="quick-bid" onClick={onBid}>+1M</button>
                <button type="button" className="quick-bid" onClick={onBid}>+2M</button>
              </div>

              <button type="button" className="btn-primary full" onClick={onBid}>Đặt giá ngay</button>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <div className="panel-card">
            <div className="panel-head">Bảng xếp hạng</div>
            <ul className="leaderboard">
              {bidders.map((bidder, index) => (
                <li key={`${bidder.name}-${index}`}>
                  <span className="medal">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                  <div className="leader-name">{bidder.name}</div>
                  <div className="leader-amount">{formatMoney(bidder.amount)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card">
            <div className="panel-head">Live feed</div>
            <ul className="feed-list">
              {feed.map((entry, index) => (
                <li key={`${entry.name}-${index}`}>
                  <span>{entry.name}</span>
                  <strong>{formatMoney(entry.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card stats-card">
            <div className="panel-head">Thống kê</div>
            <div className="stat-row">
              <span>Đã bán</span>
              <strong>{roomStats.sold}</strong>
            </div>
            <div className="stat-row">
              <span>Doanh thu</span>
              <strong>{formatMoney(roomStats.revenue)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;

function LandingScreen({
  currentTab,
  setCurrentTab,
  name,
  setName,
  title,
  setTitle,
  joinCode,
  setJoinCode,
  rooms,
  loading,
  message,
  onCreate,
  onJoin,
  onOpenRoom,
}) {
  return (
    <div className="screen landing-screen">
      <div className="blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div className="landing-content">
        <div className="brand">
          <div className="brand-icon">◆</div>
          <div className="brand-text">
            <span>Auction</span>
            <span>House</span>
          </div>
        </div>

        <h1 className="landing-title">
          Tạo <span className="gradient-text">phòng đấu giá</span> realtime ngay hôm nay
        </h1>

        <p className="landing-sub">
          Host tạo món, người tham gia bid theo thời gian thực, cùng bảng xếp hạng và anti-sniping.
        </p>

        <div className="landing-card">
          <div className="tabs">
            <button type="button" className={`tab ${currentTab === 'create' ? 'active' : ''}`} onClick={() => setCurrentTab('create')}>
              Tạo phòng
            </button>
            <button type="button" className={`tab ${currentTab === 'join' ? 'active' : ''}`} onClick={() => setCurrentTab('join')}>
              Tham gia
            </button>
          </div>

          {currentTab === 'create' ? (
            <form onSubmit={onCreate}>
              <div className="field">
                <label>Tên hiển thị</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" />
              </div>

              <div className="field">
                <label>Tên phòng</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bộ sưu tập cổ điển" />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo phòng →'}
              </button>
            </form>
          ) : (
            <form onSubmit={onJoin}>
              <div className="field">
                <label>Tên hiển thị</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" />
              </div>

              <div className="field">
                <label>Mã phòng</label>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="VD: A1B2C3" />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang vào...' : 'Vào phòng'}
              </button>
            </form>
          )}

          <div className="rooms-header">
            <span>Phòng đang mở</span>
            <button type="button" className="refresh-btn" aria-label="refresh rooms">
              ↻
            </button>
          </div>

          <ul className="rooms-list">
            {rooms.length ? rooms.map((room) => (
              <li key={room.id} className="room-item" onClick={() => onOpenRoom(room)}>
                <div className="room-item-icon">{room.status === 'live' ? '🔴' : room.status === 'ended' ? '✅' : '⚙️'}</div>
                <div className="room-item-body">
                  <div className="room-item-title">{room.title}</div>
                  <div className="room-item-meta">
                    <span>👤 {room.host}</span>
                    <span>{room.status === 'live' ? 'LIVE' : room.status === 'ended' ? 'Đã kết thúc' : 'Đang chuẩn bị'}</span>
                  </div>
                </div>
                <div className="room-item-online">{room.itemCount} món</div>
              </li>
            )) : <li className="rooms-empty">Chưa có phòng nào. Hãy tạo phòng đầu tiên!</li>}
          </ul>
        </div>

        {message ? <div className="notice-box">{message}</div> : null}
        <div className="landing-footer">Built with React + Express · WebSocket ready</div>
      </div>
    </div>
  );
}

function RoomScreen({
  roomInfo,
  items,
  auction,
  bidders,
  feed,
  roomStats,
  onBack,
  onStart,
  onBid,
  onAddItem,
  itemForm,
  setItemForm,
  setRoomInfo,
}) {
  const isSetup = roomInfo.status === 'setup';
  const isRunning = roomInfo.status === 'running';

  return (
    <div className="screen room-screen">
      <header className="topbar">
        <div className="topbar-brand">Auction House</div>
        <div className="topbar-right">
          <div className="room-chip">
            <span className="dot" />
            <span>{roomInfo.title}</span>
          </div>
          <div className="online-chip">
            <span className="online-dot" />
            <span>{bidders.length} người</span>
          </div>
          <button type="button" className="icon-btn" onClick={onBack}>🏠</button>
        </div>
      </header>

      <div className="room-grid">
        <section className="main-panel">
          {isSetup ? (
            <div className="setup-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Chuẩn bị phòng</p>
                  <h2>{roomInfo.title}</h2>
                </div>
                <button type="button" className="btn-primary" onClick={onStart}>🚀 Bắt đầu đấu giá</button>
              </div>

              <form className="item-form" onSubmit={onAddItem}>
                <div className="field-row">
                  <input
                    value={itemForm.name}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Tên món đấu giá"
                  />
                  <input
                    value={itemForm.startPrice}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, startPrice: e.target.value }))}
                    type="number"
                    placeholder="Giá khởi điểm"
                  />
                </div>

                <div className="field-row">
                  <input
                    value={itemForm.tagline}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Mô tả ngắn"
                  />
                  <input
                    value={itemForm.duration}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, duration: e.target.value }))}
                    type="number"
                    placeholder="Thời lượng (s)"
                  />
                </div>

                <button type="submit" className="btn-secondary">+ Thêm món</button>
              </form>

              <div className="setup-list">
                {items.map((item, index) => (
                  <div className="setup-item" key={item.id ?? index}>
                    <div className="setup-thumb" style={{ background: item.gradient }}>
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : '📦'}
                    </div>
                    <div className="setup-content">
                      <div className="setup-name">{index + 1}. {item.name}</div>
                      <div className="setup-meta">
                        <span>💰 {formatMoney(item.startPrice)}</span>
                        <span>⏱ {item.duration}s</span>
                      </div>
                      <div className="setup-tagline">{item.tagline}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="auction-panel">
              <div className="product-hero" style={{ background: auction.gradient }}>
                <div className="timer-box">
                  <span className="timer-label">Còn lại</span>
                  <strong>{auction.timeLeft}s</strong>
                </div>
                <div className="product-glyph">📦</div>
              </div>

              <div className="auction-meta">
                <span className="item-badge">{roomInfo.id}</span>
                <span className="status-live">LIVE</span>
              </div>

              <h2 className="auction-title">{auction.name}</h2>
              <p className="auction-tagline">{auction.tagline}</p>

              <div className="price-row">
                <div>
                  <span className="price-label">Giá hiện tại</span>
                  <div className="price-value">{formatMoney(auction.currentBid)}</div>
                </div>
                <div>
                  <span className="price-label">Người đang dẫn đầu</span>
                  <div className="price-leader">{auction.highestBidder}</div>
                </div>
              </div>

              <div className="bid-actions">
                <button type="button" className="quick-bid" onClick={onBid}>+500k</button>
                <button type="button" className="quick-bid" onClick={onBid}>+1M</button>
                <button type="button" className="quick-bid" onClick={onBid}>+2M</button>
              </div>

              <button type="button" className="btn-primary full" onClick={onBid}>Đặt giá ngay</button>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <div className="panel-card">
            <div className="panel-head">Bảng xếp hạng</div>
            <ul className="leaderboard">
              {bidders.map((bidder, index) => (
                <li key={`${bidder.name}-${index}`}>
                  <span className="medal">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                  <div className="leader-name">{bidder.name}</div>
                  <div className="leader-amount">{formatMoney(bidder.amount)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card">
            <div className="panel-head">Live feed</div>
            <ul className="feed-list">
              {feed.map((entry, index) => (
                <li key={`${entry.name}-${index}`}>
                  <span>{entry.name}</span>
                  <strong>{formatMoney(entry.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel-card stats-card">
            <div className="panel-head">Thống kê</div>
            <div className="stat-row">
              <span>Đã bán</span>
              <strong>{roomStats.sold}</strong>
            </div>
            <div className="stat-row">
              <span>Doanh thu</span>
              <strong>{formatMoney(roomStats.revenue)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
