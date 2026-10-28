🔨 Auction House
Đấu giá realtime — host tự tạo vật phẩm, upload ảnh, chọn thời gian, mời bạn bè.
## ✨ Tính năng
- **Tạo & quản lý phòng** — đặt tên, sinh mã 6 ký tự, host token bảo mật
- **Host tự thêm món** — ảnh (≤5MB), tên, mô tả, giá khởi điểm, thời gian riêng (10–300s)
- **Preset demo** — 1 click thêm 3 món mẫu để test nhanh
- **Xóa món** — trước khi bắt đầu, tự xóa ảnh
- **3 trạng thái** — `setup` → `running` → `finished`
- **Anti-sniping** — bid trong 5s cuối tự cộng +10s
- **Host controls** — Skip món, Kết thúc sớm, Xóa phòng
- **Statistics** — sau khi xong: số món bán, doanh thu, danh sách người thắng
- **Real-time** — leaderboard, live feed, online count, timer bar
- **Sound** — beep khi có bid, cảnh báo 10s cuối (bật/tắt được)
- **Điều hướng** — 🏠 topbar, ESC, đóng overlay, quay về landing
- **Nhớ host** — localStorage, host quay lại vẫn giữ quyền
- **Auto cleanup** — xóa phòng + ảnh sau 2h không hoạt động
- **UI premium** — dark theme, glassmorphism, animation mượt, responsive
## 🚀 Chạy

```bash
git clone https://github.com/<you>/auction-house.git
cd auction-house
npm install
npm start
