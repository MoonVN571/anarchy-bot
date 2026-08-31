# Kế hoạch & Checklist: Bot Dashboard, Tablist Scoreboard & Coordinates HUD

Tài liệu này theo dõi lộ trình và chi tiết kỹ thuật cho hệ thống hiển thị vị trí bot, Tablist server thời gian thực, Caching engine và lệnh Discord Livechat.

---

## 1. Tổng quan Trạng thái Triển khai (Overview)

| Module | Phạm vi Triển khai | Trạng thái |
| :--- | :--- | :--- |
| **Canvas Image Renderer** | Render HUD Tọa độ & Tablist Card qua `@napi-rs/canvas` | 🚀 Đã tích hợp |
| **Smart Caching Engine** | Cache Avatar buffers (TTL 10m) & Image buffers (TTL 2-4s) qua Redis (L2) + Memory (L1) | 🚀 Đã cấu hình |
| **Discord Livechat Commands** | Lệnh `>pos`, `>tab`, `>status` trên kênh Livechat (100% Unicode emojis) | 🚀 Đã tích hợp |
| **Predefined Color Palette** | Render Components V2 & HUD dựa trên `messageColors`, không tạo màu mới | 🚀 Đã chuẩn hóa |
| **Backend Web Dashboard** | REST API & Web UI (Glassmorphism Dark Dashboard) | ⏳ Kế hoạch giai đoạn sau |

---

## 2. Checklist Chi tiết các Giai đoạn

### Giai đoạn 1: Canvas Rendering Engine & Multi-Tier Caching (`@napi-rs/canvas`)
- [x] **Khởi tạo Canvas Service (`src/services/CanvasRendererService.ts`)**:
  - [x] Tích hợp thư viện `@napi-rs/canvas` để vẽ ảnh trực quan với hiệu năng cao.
  - [x] Giải mã màu sắc và text Minecraft từ `bot.tablist.header/footer`.
- [x] **Hệ thống Caching Đa tầng (Multi-tier Caching)**:
  - [x] **L1 In-Memory Cache**: Truy xuất đệm cực nhanh trong RAM.
  - [x] **L2 Redis Cache**: Đồng bộ và lưu trữ Buffer qua Redis (`RedisManager`).
  - [x] **Avatar Cache**: Cache Buffer ảnh đại diện skin theo `username` (TTL 10 phút, tự động dọn dẹp).
  - [x] **Tablist Card Cache**: Cache Buffer ảnh bảng Tablist đã render (TTL 4 giây), trả về ngay lập tức khi nhiều người gõ lệnh cùng lúc.
  - [x] **Coords HUD Cache**: Cache Buffer ảnh tọa độ bot (TTL 2 giây hoặc khi bot chưa di chuyển quá 0.5 blocks).
- [x] **Render Tablist Scoreboard Card**:
  - [x] Header & Footer của server với text sạch.
  - [x] Bố cục lưới người chơi (Grid 1 - 4 cột tùy số lượng online).
  - [x] Hiển thị Avatar Head của từng player (`mc-heads.net` kèm fallback `minotar.net`).
  - [x] Hiển thị Tên người chơi và cột sóng Ping (Xanh lá < 80ms, Vàng < 180ms, Đỏ >= 180ms).
  - [x] Tổng số người chơi online / Server host.
- [x] **Render Bot Coordinates & Status HUD Card**:
  - [x] Tọa độ X, Y, Z nổi bật.
  - [x] Tọa độ quy đổi Nether (`X/8`, `Z/8`) khi ở Overworld hoặc ngược lại (`X*8`, `Z*8`) khi ở Nether.
  - [x] La bàn chỉ hướng nhìn (Yaw / Pitch / Facing: North `[-Z]`, South `[+Z]`, East `[+X]`, West `[-X]`).
  - [x] Thanh tim Máu (Health bar: 0 - 20) & Thanh Đùi gà Thức ăn (Hunger bar: 0 - 20).
  - [x] Huy hiệu Dimension (Overworld `[🍀 Overworld]`, Nether `[🔥 The Nether]`, End `[🌌 The End]`) và Server Status (`🟢 Main Server` / `🟡 In Queue`).

---

### Giai đoạn 2: Lệnh Discord Livechat Channel (100% Unicode Emojis & Predefined Colors)
- [x] **Lệnh Tra cứu Tọa độ (`CoordsCommand.ts`)**:
  - [x] Nhận diện các alias: `pos`, `coords`, `vitri`, `toado` (với tiền tố `>` hoặc `!`).
  - [x] Tạo ảnh HUD tọa độ qua `CanvasRendererService` và đính kèm vào tin nhắn Discord (`AttachmentBuilder`).
  - [x] Hỗ trợ phản hồi in-game qua Minecraft whisper (`!pos`, `!coords`).
- [x] **Lệnh Tra cứu Tablist (`TablistCommand.ts`)**:
  - [x] Nhận diện các alias: `tab`, `tablist`, `players`, `list` (với tiền tố `>` hoặc `!`).
  - [x] Tạo ảnh Tablist Scoreboard qua `CanvasRendererService` và đính kèm vào tin nhắn Discord.
  - [x] Hỗ trợ phản hồi in-game qua Minecraft whisper (`!tab`, `!players`).
- [x] **Lệnh Xem Trạng thái Bot (`BotStatusCommand.ts`)**:
  - [x] Nhận diện các alias: `status`, `bot`, `botinfo` (với tiền tố `>` hoặc `!`).
  - [x] Sử dụng Components V2 Container với màu chuẩn từ `messageColors` (`0x2ecc71` / `0xf39c12`).
  - [x] Hiển thị Uptime, RAM usage, Server hiện tại, Ping, thời gian kết nối.
- [x] **Chính sách Không dùng Custom Discord Emojis**:
  - [x] 100% các lệnh sử dụng Unicode Emojis tiêu chuẩn (`✅`, `❌`, `📍`, `👥`, `❤️`, `🍖`, `🧭`, `📊`, `🔥`, `🌌`, `🍀`).
  - [x] Không phụ thuộc vào custom bot emoji IDs (`<:name:id>`).
- [x] **Đăng ký Quản lý Lệnh**:
  - [x] Đăng ký đầy đủ trong `CommandManager.ts` và `src/commands/index.ts`.
  - [x] Cập nhật hướng dẫn lệnh trong `HelpCommand.ts`.

---

### Giai đoạn 3: Type Safety & Loại bỏ `any`
- [ ] **Rà soát Type Safety toàn bộ hệ thống**:
  - [ ] Khai báo interface tường minh cho tất cả các đối tượng sự kiện và cấu hình.
  - [ ] Sử dụng types chuẩn từ `mineflayer` (`Bot`, `Player`), `prismarine-chat` (`ChatMessage`), `@napi-rs/canvas` (`SKRSContext2D`, `Canvas`).
  - [ ] Không sử dụng ép kiểu `any` lỏng lẻo ở các tầng logic nghiệp vụ chính.

---

### Giai đoạn 4: Backend REST API & Web Dashboard (Kế hoạch làm sau)
- [ ] **Backend API Endpoints (`src/backend/`)**:
  - [ ] `GET /api/bot/:id/status`: Trạng thái bot, uptime, server, RAM.
  - [ ] `GET /api/bot/:id/coords`: Dữ liệu tọa độ, dimension, health, food dạng JSON.
  - [ ] `GET /api/bot/:id/tablist`: Danh sách người chơi online, ping, UUID dạng JSON.
  - [ ] `GET /api/bot/:id/tablist/image`: Trả về trực tiếp ảnh render Tablist qua HTTP ETag cache.
  - [ ] `GET /api/bot/:id/coords/image`: Trả về trực tiếp ảnh HUD tọa độ.
  - [ ] `GET /api/bot/:id/stream`: Server-Sent Events (SSE) để cập nhật tọa độ liên tục.
- [ ] **Giao diện Web Dashboard (`public/`)**:
  - [ ] Giao diện Dark Cyberpunk / Glassmorphism.
  - [ ] La bàn tương tác trực quan 360 độ theo Yaw/Pitch của bot.
  - [ ] Bảng tìm kiếm và lọc danh sách người chơi online.
  - [ ] Nút sao chép tọa độ 1 chạm và phím tắt chuyển đổi server.
