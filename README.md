# Hệ thống đấu giá trực tiếp

Dự án này xây dựng một nền tảng đấu giá trực tiếp theo thời gian thực, cho phép người dùng xem sản phẩm, đặt giá và theo dõi cập nhật ngay lập tức mà không cần refresh trang. Ứng dụng kết hợp giữa REST API và WebSocket để mô phỏng trải nghiệm đấu giá thực tế.

## 1. Tổng quan

- Backend: Node.js + Express
- Frontend: React + TypeScript + Vite
- Real-time: WebSocket
- CSDL: SQLite
- Giao tiếp: REST API + WebSocket đồng thời

Dự án phù hợp để minh họa sự khác biệt giữa thao tác truyền thống qua HTTP và cập nhật dữ liệu realtime trên client.

## 2. Tính năng

### Người dùng
- Đăng nhập hoặc đăng ký tài khoản người dùng
- Xem danh sách các vật phẩm đang đấu giá
- Chọn sản phẩm để xem chi tiết, giá khởi điểm và giá hiện tại
- Đặt mức giá mới cao hơn giá hiện tại
- Theo dõi lịch sử đặt giá theo thời gian thực
- Nhận thông báo khi có người đặt giá mới
- Kiểm tra trạng thái kết nối WebSocket

### Quản trị viên
- Đăng nhập bằng tài khoản admin
- Quản lý sản phẩm: thêm, sửa và xoá sản phẩm đấu giá
- Theo dõi thống kê tổng sản phẩm, tổng lượt bid và giá cao nhất
- Duy trì giao diện quản trị riêng biệt khỏi giao diện người dùng

### Backend
- Cung cấp API REST để lấy dữ liệu và đặt giá
- Sử dụng WebSocket để broadcast dữ liệu cho tất cả client đang kết nối
- Kiểm tra tính hợp lệ của mức giá (giá mới phải cao hơn giá hiện tại)
- Lưu dữ liệu đấu giá vào SQLite
- Đồng bộ dữ liệu ban đầu khi client nối WebSocket mới

### Quản trị viên (nếu có triển khai mở rộng)
- Xác thực admin bằng username/password
- Chấp nhận giá đấu
- Bật/tắt đồng hồ thời gian đấu giá
- Xem và xóa người tham gia đang online

## 3. Công nghệ sử dụng

- Node.js
- Express
- WebSocket (`ws`)
- SQLite
- React
- TypeScript
- Vite
- Axios
- Styled Components

## 4. Cấu trúc thư mục

```bash
Nh-m-5/
├── backend/
│   ├── data/
│   ├── src/
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── screenshots/
├── README.md
└── .gitignore
```

## 5. Yêu cầu hệ thống

- Node.js >= 20
- npm >= 10

## 6. Hướng dẫn chạy dự án

### Bước 1: Clone dự án

```bash
git clone <repository-url>
cd Nh-m-5
```

### Bước 2: Cài đặt backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend` với nội dung như sau:

```env
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Khởi động backend:

```bash
npm run dev
```

Backend sẽ chạy tại:

- API REST: http://localhost:3000
- WebSocket: ws://localhost:3000

### Bước 3: Cài đặt frontend

Mở terminal mới, sau đó chạy:

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại port mặc định của Vite, thường là:

- http://localhost:5173

## 7. Cách sử dụng

1. Mở giao diện frontend trên trình duyệt.
2. Đăng nhập bằng tài khoản người dùng hoặc tài khoản admin.
3. Chọn một sản phẩm đấu giá.
4. Nhập mức giá mới cao hơn giá hiện tại.
5. Quan sát cập nhật trực tiếp trên giao diện khi có người đặt giá mới.

> Luồng chính: Đăng nhập → Chọn sản phẩm → Đặt mức giá.

### Với admin
- Đăng nhập vào tài khoản admin để truy cập giao diện quản trị.
- Thêm, sửa hoặc xoá sản phẩm đấu giá theo yêu cầu.
- Theo dõi dữ liệu thống kê và trạng thái sản phẩm nhanh chóng.

## 8. API chính

### REST API
- `GET /api/items` - Lấy danh sách sản phẩm
- `GET /api/items/:id` - Lấy chi tiết sản phẩm
- `POST /api/bids` - Đặt giá mới
- `GET /api/history` - Lấy lịch sử đấu giá

### WebSocket
- `INITIAL_DATA` - Gửi dữ liệu ban đầu khi client kết nối
- `NEW_BID` - Thông báo khi có bid mới
- `BID_UPDATE` - Cập nhật giá hiện tại
- `ERROR` - Lỗi hệ thống
- `HEARTBEAT` - Giữ kết nối WebSocket

## 9. Ghi chú

- Dự án này là một demo thực hành về đấu giá thời gian thực.
- Mục tiêu chính là minh họa cách truyền dữ liệu realtime bằng WebSocket thay vì chỉ dùng REST API cơ bản.
- Nếu cần thử nghiệm ở nhiều tài khoản khác nhau, hãy mở nhiều tab hoặc nhiều trình duyệt khác nhau để mô phỏng nhiều người tham gia cùng lúc.


