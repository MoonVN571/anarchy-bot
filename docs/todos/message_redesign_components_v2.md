# Kế hoạch thiết kế lại hệ thống tin nhắn (Message Redesign với Discord Components V2 & Server Message Pattern Config)

## 1. Mục tiêu (Objective)
- Chuyển đổi cách hiển thị tin nhắn livechat và sự kiện server từ **Embeds** truyền thống sang **Discord Components V2** (hoặc Webhook avatar/Containers) giúp giao diện tin nhắn hiện đại, trực quan, gọn gàng và sống động hơn.
- Hiển thị đầy đủ thông tin: **Avatar Minecraft của người chơi**, **Username (kèm Rank nếu có)**, **Nội dung tin nhắn (Message)**, **Thời gian (Timestamp)**, và các tag/trạng thái liên quan (Server, loại tin nhắn).
- **Nhận diện và phân loại Server Messages thông minh**: Mở rộng và nâng cấp hệ thống nhận diện tin nhắn server (thông báo hệ thống, restart, broadcast, queue, bảo trì, cảnh báo TPS/Lag, chat anti-spam filter) dựa trên regex pattern engine với file cấu hình riêng biệt (`serverPatterns.json` hoặc Database Model), dễ dàng tùy biến cho từng cụm máy chủ (2Y2C, AnarchyVN, 2b2t,...).

---

## 2. Phân loại tin nhắn & Layout đề xuất

### 2.1. Chat người chơi (Player Chat / Highlight Chat / Whisper / Bot Chat)
- **Hình thức**:
  - **Phương án 1 (Discord Components V2 - Section & Container)**:
    - Sử dụng `Container` chứa `Section` với `Thumbnail` (Avatar player từ `https://mc-heads.net/avatar/<username>/64.png` hoặc Minotar / Cravatar).
    - `TextDisplay` hiển thị `[Rank] Username`: nội dung chat.
    - Màu sắc viền `Container` / `Accent` tương ứng loại chat.
  - **Phương án 2 (Discord Webhook Simulation)**:
    - Gửi qua Webhook với `username` là `[Server] PlayerName` và `avatar_url` lấy trực tiếp skin head của người chơi.
    - Fallback về Components V2 / Text message khi Webhook không khả dụng.

### 2.2. Nhận diện & Hiển thị Server Messages (Server Announcement / Restart / Broadcast / Queue)
- **Hình thức (Components V2 Container Banner)**:
  - **Server Announcement / Broadcast**: Container viền đỏ/vàng cam, icon Loa phóng thanh, trích xuất title và nội dung thông báo.
  - **Restart / Maintenance Countdown**: Container cảnh báo đếm ngược bảo trì / khởi động lại server.
  - **Queue Update / Position Info**: Container thông tin vị trí hàng chờ (Queue position, ETA).
  - **Anti-Spam / System Notices**: Container cảnh báo hệ thống (ví dụ: "Chat chậm lại", "Không thể gửi tin nhắn liên tục").
- **Cơ chế nhận diện động (Pattern Matching Engine)**:
  - Tách biệt logic nhận diện server messages thành module riêng biệt (`serverMessageMatcher.ts`).
  - Cho phép quản lý patterns qua file cấu hình riêng (`src/config/serverPatterns.json`) hoặc qua Database, hỗ trợ scope theo từng server (`global`, `2y2c`, `anarchyvn`,...).

### 2.3. Sự kiện Người chơi & Thế giới (Join / Quit / Death / Achievement)
- **Hình thức (Components V2 Container)**:
  - Viền Container / Banner phân biệt rõ loại sự kiện:
    - **Join / Quit**: Màu Xanh lá / Đỏ kèm avatar đầu người chơi và thời gian.
    - **Death (Tử vong)**: Màu Đỏ đậm, hiển thị victim + killer (kèm avatar 2 bên nếu có PvP).
    - **Achievement (Thành tựu)**: Màu Vàng / Xanh ngọc kèm icon cup/sách.

---

## 3. Các thành phần kỹ thuật cần thực hiện

### 3.1. Cấu hình & Quản lý Server Message Patterns (`src/config/serverPatterns.json`, `src/utils/serverMessageMatcher.ts`)
- **Tạo file cấu hình patterns riêng (`serverPatterns.json`)**:
  ```json
  [
    {
      "id": "server_restart",
      "serverScope": "global",
      "pattern": "^(?:\\[Server\\]|SERVER|HỆ THỐNG)\\s*[:>>]?\\s*(?:Server|Máy chủ)\\s+(?:sẽ khởi động lại|restart) trong (?<time>.+)$",
      "type": "server_restart",
      "color": 0xFF5555,
      "priority": 100
    },
    {
      "id": "server_broadcast",
      "serverScope": "global",
      "pattern": "^(?:\\[Broadcast\\]|THÔNG BÁO|2Y2C >>|ANARCHY >>)\\s*(?<content>.+)$",
      "type": "server_broadcast",
      "color": 0xFFAA00,
      "priority": 90
    },
    {
      "id": "queue_position",
      "serverScope": "global",
      "pattern": "^(?:Vị trí trong hàng chờ|Position in queue):\\s*(?<pos>\\d+)(?:\\s*\\/\\s*(?<total>\\d+))?",
      "type": "queue",
      "color": 0x55FF55,
      "priority": 95
    }
  ]
  ```
- **Xây dựng `ServerMessageMatcher`**:
  - Hỗ trợ match regex có đặt tên group (`?<content>`, `?<time>`, `?<pos>`, `?<target>`).
  - Hỗ trợ reload pattern tự động khi cấu hình thay đổi mà không cần restart bot.

### 3.2. Cập nhật Parser & Data Model (`src/utils/chatParser.ts`, `src/typings/types.ts`)
- Mở rộng `ParsedChatMessage` để trả về đầy đủ metadata:
  - `username`: Tên Minecraft của người chơi (dùng fetch avatar).
  - `targetUser` (nếu là whisper / PvP kill).
  - `avatarUrl`: URL lấy avatar tự động (`https://mc-heads.net/avatar/${username}/64.png`).
  - `rank`: Rank prefix (VIP, MVP, Member, v.v.).
  - `serverMeta`: Metadata từ server message (ví dụ: countdown time, queue position, broadcast title).
  - `message`: Nội dung đã xử lý sạch ký tự màu Minecraft và escape Discord markdown hợp lý.

### 3.3. Cập nhật `LiveChatManager` (`src/structures/LiveChatManager.ts`)
- Thay thế hàm `generateEmbeds()` bằng `generateComponentsV2Payload()` hoặc `sendLiveChatMessage()`.
- Hỗ trợ cơ chế gộp tin nhắn (Batching / Buffering) thông minh với Components V2 hoặc Webhook để tránh chạm Discord Rate Limit.
- Tách luồng xử lý tin nhắn player và tin nhắn server đặc biệt để hiển thị đúng template component.

### 3.4. Module Webhook / Component Builder (`src/utils/messageRenderer.ts`)
- Xây dựng helper function tạo Discord Components V2 payload (Containers, Sections, Text Displays, Thumbnails, Separators).
- Quản lý Webhook tự động (tự tạo / lấy Webhook trong livechat channel để gửi avatar + username chuẩn xác).

---

## 4. Danh sách công việc (Tasks & Checklist)

- [ ] **Nghiên cứu & Chuẩn hóa định dạng Discord Components V2 / Webhook**
  - [ ] Kiểm tra khả năng tương thích Discord.js v14 với Components V2 / Webhook.
  - [ ] Thiết kế mẫu UI (Mockup layout) cho từng loại tin nhắn: Chat, Server Announcements, Restart Countdown, Queue, Join/Quit, Death, Achievement.
- [ ] **Xây dựng hệ thống Server Message Pattern & Config riêng**
  - [ ] Tạo file cấu hình `src/config/serverPatterns.json` chứa các mẫu regex phổ biến cho Anarchy servers.
  - [ ] Viết module `ServerMessageMatcher.ts` để phân loại và trích xuất tham số từ server messages.
  - [ ] Cho phép ghi đè pattern theo từng server IP (`config.serverInfo.ip`).
- [ ] **Nâng cấp `chatParser.ts`**
  - [ ] Tích hợp `ServerMessageMatcher` vào luồng phân tích tin nhắn.
  - [ ] Trích xuất chính xác avatar URL từ username.
  - [ ] Bóc tách killer & victim trong death messages để hiển thị dual-avatar nếu có PvP.
- [ ] **Xây dựng `MessageRenderer` (Component Builder)**
  - [ ] Viết helper build component Container / Section / Thumbnail / Banner.
  - [ ] Viết cơ chế webhook avatar dispatcher (tùy chọn bật/tắt trong config).
- [ ] **Cải tổ `LiveChatManager.ts`**
  - [ ] Xóa bỏ phụ thuộc vào APIEmbed truyền thống.
  - [ ] Tích hợp bộ đệm (Queue / Rate-limit) tương thích với payload mới.
  - [ ] Xử lý gộp tin nhắn liên tiếp từ cùng người chơi / cùng loại sự kiện.
- [ ] **Cấu hình & Tùy biến (`config.json`)**
  - [ ] Thêm tùy chọn `useWebhook`, `avatarProvider` (`mc-heads`, `cravatar`, `minotar`).
  - [ ] Thêm tùy chọn bật/tắt nhận diện server message và lọc thông báo rác.
- [ ] **Kiểm thử & Tinh chỉnh**
  - [ ] Test hiển thị tin nhắn chat thường có avatar & rank.
  - [ ] Test tin nhắn thông báo server (Broadcast, Restart countdown, Queue, Bảo trì).
  - [ ] Test tin nhắn chết, vào/ra server, thành tựu.
  - [ ] Kiểm tra rate limit khi chat spam tốc độ cao.
