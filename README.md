# Co-op Jump

Game platformer co-op 2 người: phối hợp đứng lên đầu nhau để nhảy lên các bệ cao và cả hai cùng chạm cờ để thắng.

## Chạy local

```bash
npm install
npm start
```

Mở http://localhost:3000 trên hai tab để chơi.

## Điều khiển

| Phím | Hành động |
|------|-----------|
| `←` / `A` | Đi trái |
| `→` / `D` | Đi phải |
| `↑` / `W` / `Space` | Nhảy |

Có thể dùng các nút cảm ứng trên điện thoại. Hai người chơi có thể phối hợp qua chat; người thứ ba trở lên vào phòng với tư cách khán giả.

## Docker

```bash
docker build -t coop-jump .
docker run -p 3000:3000 coop-jump
```

Health check: http://localhost:3000/health
