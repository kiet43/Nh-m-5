# Live Auction

Sàn đấu giá **thời gian thực** viết bằng Node.js và **WebSocket** (`ws`). Không cần database, không framework frontend: cài xong chạy ngay.

## Tính năng
- Đăng ký / đăng nhập (mật khẩu băm `scrypt` + salt, phiên đăng nhập bằng token, tự đăng nhập lại khi tải trang)
- Đăng sản phẩm: tên, mô tả, **tải lên tối đa 4 ảnh** (tự thu nhỏ ở trình duyệt, server kiểm tra định dạng thật của file), danh mục, giá khởi điểm, bước giá, thời lượng 1 phút – 7 ngày
- **Mua ngay**: người bán đặt giá mua ngay, bấm mua là chốt phiên ngay lập tức
- **Theo dõi** phiên (★) và lọc theo danh mục
- **Mỗi phiên là một phòng chat**: vào phòng để xem giá, chat với mọi người, thấy ai đang ở trong phòng, dòng "đang nhập…"; lượt trả giá, lời MC và thông báo hệ thống hiện xen trong luồng chat. Gõ `@mc câu hỏi` để hỏi MC về đúng phiên đó. Mỗi phòng có link riêng (`/#<id>`) để chia sẻ
- Đặt giá trực tiếp: mọi người thấy giá mới ngay lập tức, không cần tải lại trang
- Đếm ngược đồng bộ theo giờ máy chủ
- Chống bid phút chót (anti-sniping): bid trong 30 giây cuối sẽ cộng thêm 30 giây
- Thông báo cá nhân: bị vượt giá, thắng phiên, bán được hàng, không ai mua
- **MC AI (Gemini)**: bình luận trực tiếp khi có phiên mới, bid, bid phút chót, đếm ngược 30s/10s và gõ búa; khán giả có thể hỏi MC; tuỳ chọn đọc to bằng giọng trình duyệt. Không có khoá API vẫn chạy bằng câu mẫu
- Giao diện rõ ràng: hướng dẫn 3 bước cho người mới, nhãn trạng thái (đang diễn ra / sắp kết thúc / đã kết thúc), cho biết bạn đang dẫn đầu hay bị vượt giá, lý do khi không đặt giá được
- Tìm kiếm, lọc (đang diễn ra / đã kết thúc / của tôi), sắp xếp
- Lịch sử trả giá, huỷ phiên khi chưa có bid, số người đang online
- Tự kết nối lại (exponential backoff), heartbeat ping/pong phát hiện kết nối chết
- Lưu dữ liệu vào `data.json`, khởi động lại không mất phiên
- Giao diện sáng/tối theo hệ thống, dùng được bằng bàn phím, hỗ trợ mobile

## Chạy thử
```bash
npm install
npm start          # http://localhost:3000   (đổi cổng: PORT=8080 npm start)
```
Cần Node.js >= 18.

### Bật MC AI
Lấy khoá tại [Google AI Studio](https://aistudio.google.com/apikey), rồi:
```bash
GEMINI_API_KEY=your_key npm start
# tuỳ chọn: GEMINI_MODEL=gemini-2.5-flash
```
Khoá chỉ nằm ở server, không gửi xuống trình duyệt. Tin nhắn MC bị giới hạn tần suất (bid thường tối đa 1 lần / 5 giây) để tiết kiệm quota; lỗi hoặc quá thời gian 8 giây sẽ tự dùng câu mẫu. Mở 2 tab với 2 tài khoản khác nhau để thấy bid cập nhật tức thì.

## Giao thức WebSocket
Mọi tin nhắn là JSON có trường `t` (loại).

| Client → Server | Trường | Mô tả |
|---|---|---|
| `register` / `login` | `username`, `password` | Tạo tài khoản / đăng nhập |
| `resume` / `logout` | `token` | Khôi phục / kết thúc phiên |
| `create` | `title, desc, image, startPrice, increment, minutes` | Đăng đấu giá |
| `bid` | `id, amount` | Đặt giá |
| `cancel` | `id` | Huỷ phiên chưa có bid |
| `buynow` | `id` | Mua ngay theo giá người bán đặt |
| `join` | `id` | Vào phòng của một phiên (không cần đăng nhập để xem) |
| `leave` | | Rời phòng |
| `chat` | `text` | Nhắn trong phòng hiện tại (cần đăng nhập) |
| `typing` | | Báo đang nhập |
| `watch` | `id` | Bật/tắt theo dõi |
| `askmc` | `q` | Hỏi MC AI (8 giây / lần) |

| Server → Client | Mô tả |
|---|---|
| `hello` | Giờ máy chủ + toàn bộ phiên khi kết nối |
| `auction` | Một phiên được tạo/cập nhật (broadcast) |
| `online` | Số kết nối hiện tại |
| `auth`, `error` | Kết quả đăng nhập / lỗi |
| `room` | Dữ liệu phòng + 60 dòng gần nhất khi vào phòng |
| `feed` | Dòng mới trong phòng: `k` = `msg` / `bid` / `mc` / `sys` |
| `presence`, `typing` | Danh sách người trong phòng, ai đang nhập |
| `mc` | Lời MC `{text, ai}` (broadcast hoặc trả riêng khi hỏi) |
| `outbid`, `won`, `sold`, `unsold` | Thông báo riêng cho người dùng |

## Bảo mật & giới hạn hiện tại
- Upload ảnh qua `POST /upload` (cần đăng nhập): giới hạn 3 MB, 12 ảnh/phút/người, kiểm tra chữ ký file (JPG/PNG/GIF/WebP) thay vì tin đuôi file, tên file ngẫu nhiên; ảnh lưu trong `uploads/`
- Mọi dữ liệu được kiểm tra phía server; giao diện dựng bằng DOM API (không `innerHTML`) để chống XSS
- Giới hạn kích thước tin nhắn (10 KB) và tốc độ (40 tin / 10 giây / kết nối)
- Chưa có thanh toán thật, ví tiền hay xác minh email — đây là bản demo mã nguồn mở
- Dùng HTTPS/WSS khi triển khai (đặt sau Nginx/Caddy); `data.json` phù hợp quy mô nhỏ

## Hướng phát triển (PR rất được hoan nghênh)
Redis pub/sub để chạy nhiều instance, SQLite/Postgres, ví tiền, chat theo phiên, thông báo email, test tự động, i18n.

## Đóng góp
Fork → tạo nhánh → mở Pull Request. Bug hoặc ý tưởng: mở Issue.

## Giấy phép
MIT
