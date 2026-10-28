# 🔨 Auction House monorepo

Dự án đã được tách thành 2 phần rõ ràng:

- Frontend: React + Vite
- Backend: Express API riêng

## Cấu trúc

```bash
backend/
  server.js
  package.json
  uploads/
frontend/
  src/
  index.html
  package.json
  vite.config.js
package.json
README.md
```

## 🚀 Chạy dự án

```bash
npm install
npm run dev
```

- Frontend chạy tại: http://localhost:5173
- Backend chạy tại: http://localhost:3001

## Build production

```bash
npm run build
```

## API cơ bản

- GET /api/health
- GET /api/rooms
- POST /api/rooms
- GET /api/rooms/:id
- POST /api/rooms/:id/items
- DELETE /api/rooms/:id/items/:itemId
- POST /api/rooms/:id/start
