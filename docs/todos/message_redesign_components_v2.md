# Kế hoạch thiết kế lại hệ thống tin nhắn (Message Redesign & Discord Components V2 Checklist)

## 1. Mục tiêu (Objectives)
- [x] Đánh giá hiện trạng hiển thị tin nhắn qua Embeds truyền thống.
- [x] Chuyển đổi cách hiển thị tin nhắn livechat và sự kiện server sang **Discord Components V2** (Containers, Sections, Text Displays, Separators) kết hợp **Canvas Image Rendering (`@napi-rs/canvas`)**.
- [x] **Bảng màu định sẵn & Màu mặc định cho Reply Message**:
  - [x] Render Containers/Sections livechat hoàn toàn dựa trên bảng màu chuẩn hóa `messageColors` có sẵn trong `src/utils/chatParser.ts`, **không tạo thêm mã màu mới** hay hardcode mã màu tùy ý.
  - [x] Thêm cấu hình **Màu mặc định cho Reply Message của Bot** (`defaultReplyColor: 0x3498db` hoặc cấu hình qua `botConfig.json`) cho các phản hồi lệnh và tin nhắn thông báo chung.
- [x] **Chính sách Tắt Ping khi Reply (`allowedMentions: { repliedUser: false }`)**:
  - [x] Bắt buộc tất cả các phản hồi lệnh (`message.reply`) đều cấu hình `allowedMentions: { repliedUser: false }` để không làm phiền hoặc ping người dùng liên tục.
- [x] **Hệ thống Caching đa tầng (Multi-tier Caching)**: Sử dụng Redis Caching (L2) kết hợp In-Memory Cache (L1) để cache Avatar Buffers và Rendered Images, giảm thiểu tối đa CPU load và network I/O.
- [x] **Type Safety tuyệt đối**: Loại bỏ triệt để các kiểu dữ liệu `any`, áp dụng type interface chặt chẽ cho toàn bộ module.
- [x] **Chính sách Không dùng Custom Discord Emojis**: Sử dụng 100% Unicode emojis tiêu chuẩn (`✅`, `❌`, `❤️`, `🍖`, `🔥`, `🌌`, `🍀`,...), không sử dụng custom bot emojis dạng `<:name:id>` để tránh lỗi phân quyền hoặc hiển thị sai trên các server khác nhau.

---

## 2. Checklist Quy chuẩn Bảng màu Predefined & Reply Config

Tất cả các Container và Section Components V2 sử dụng các giá trị hằng số từ bảng màu sau:

| Loại tin nhắn (`MessageType`) | Màu Accent Hex | Mã Số Nguyên | Ý nghĩa hiển thị |
| :--- | :--- | :--- | :--- |
| `Default Reply (Mặc định)` | `#3498db` | `0x3498db` | Màu mặc định cho reply message & thông báo bot |
| `MessageType.Chat` | `#979797` | `0x979797` | Chat thông thường của người chơi |
| `MessageType.HighlightChat` | `#2ea711` | `0x2ea711` | Chat Greentext bắt đầu bằng `>` |
| `MessageType.BotChat` | `#5865f2` | `0x5865f2` | Tin nhắn do chính Bot gửi |
| `MessageType.Whisper` | `#fd00ff` | `0xfd00ff` | Thì thầm (Whisper / Msg) |
| `MessageType.Server` | `#3498db` | `0x3498db` | Tin nhắn hệ thống / Server broadcast |
| `MessageType.Queue` | `#f1c40f` | `0xf1c40f` | Vị trí hàng chờ (Queue position) |
| `MessageType.Dead` | `#db2d2d` | `0xdb2d2d` | Thông báo tử vong (PvP / Mob / Fall) |
| `MessageType.Achievement` | `#9b59b6` | `0x9b59b6` | Thành tựu / Tiến trình (Advancement) |
| `MessageType.Join` | `#2ecc71` | `0x2ecc71` | Người chơi tham gia máy chủ `[+]` |
| `MessageType.Quit` | `#e67e22` | `0xe67e22` | Người chơi rời máy chủ `[-]` |

---

## 3. Checklist Phân loại Tin nhắn & Layout Components V2

### 3.1. Chat Người chơi (Player Chat / Highlight Chat / Whisper / Bot Chat)
- [x] **Player Chat Container**:
  - [x] `ContainerBuilder` với `accentColor: messageColors.chat` (`0x979797`) hoặc `messageColors.highlightChat` (`0x2ea711`).
  - [x] `SectionBuilder` chứa nội dung tin nhắn và `ThumbnailBuilder` (Skin Head Avatar từ `https://mc-heads.net/avatar/<username>/64.png`).
  - [x] `SeparatorBuilder` và `TextDisplayBuilder` hiển thị Discord Timestamp `<t:timestamp:F>`.
- [x] **Whisper Container**:
  - [x] `accentColor: messageColors.whisper` (`0xfd00ff`).
  - [x] Hiển thị rõ người gửi và người nhận thì thầm.
- [x] **Batching / Buffering Chat**:
  - [x] Gom các tin nhắn chat liên tiếp vào một Container duy nhất phân tách bởi Separators khi có lưu lượng chat cao.

### 3.2. Sự kiện Thế giới & Người chơi (Join / Quit / Death / Achievement)
- [x] **Join Event Container**:
  - [x] `accentColor: messageColors.join` (`0x2ecc71`).
  - [x] Avatar Skin Head người chơi, Rank (nếu có) và thông báo `[+] Player đã tham gia server`.
- [x] **Quit Event Container**:
  - [x] `accentColor: messageColors.quit` (`0xe67e22`).
  - [x] Avatar Skin Head người chơi và thông báo `[-] Player đã rời server`.
- [x] **PvP Death Event Container (Dual Head)**:
  - [x] `accentColor: messageColors.dead` (`0xdb2d2d`).
  - [x] Section 1: Kẻ hạ gục (Killer) kèm Avatar Head và thông tin vũ khí.
  - [x] Section 2: Nạn nhân (Victim) kèm Avatar Head và nội dung sự kiện.
- [x] **Mob / Environmental Death Event Container**:
  - [x] `accentColor: messageColors.dead` (`0xdb2d2d`).
  - [x] Avatar Head của nạn nhân kèm chi tiết quái vật hoặc nguyên nhân tử vong (rơi từ trên cao, dung nham, hư vô).
- [x] **Achievement Event Container**:
  - [x] `accentColor: messageColors.achievement` (`0x9b59b6`).
  - [x] Avatar Head của người chơi đạt thành tựu kèm tên thành tựu.

### 3.3. Tin nhắn Hệ thống & Hàng chờ (Server / Queue)
- [x] **Server Announcement / Broadcast**:
  - [x] `accentColor: messageColors.server` (`0x3498db`).
  - [x] Trích xuất tiêu đề thông báo và nội dung sạch đã loại bỏ ký tự màu Minecraft.
- [x] **Queue Position Notice**:
  - [x] `accentColor: messageColors.queue` (`0xf1c40f`).
  - [x] Hiển thị vị trí hiện tại trong hàng chờ và thời gian ước tính (ETA).

---

## 4. Checklist Kỹ thuật: Caching, Mention Control & Type Safety

### 4.1. Quy chuẩn Phản hồi Tin nhắn (No Ping Policy)
- [x] Mọi lệnh phản hồi (`message.reply`) đều cấu hình `allowedMentions: { repliedUser: false }`.
- [x] Hỗ trợ cấu hình `defaultReplyColor` trong `botConfig.json` (ví dụ: `"defaultReplyColor": 3447003`).

### 4.2. Kiến trúc Caching Đa tầng (Multi-tier Caching)
- [x] **L1 In-Memory Fast Cache**:
  - [x] Lưu trữ trực tiếp trong bộ nhớ RAM của ứng dụng (`Map<string, CacheEntry>`).
  - [x] Truy xuất tức thì với độ trễ ~0ms.
- [x] **L2 Redis Cache**:
  - [x] Lưu trữ phân tán qua Redis (`RedisManager.getBuffer` / `RedisManager.setBuffer`).
  - [x] Key format chuẩn: `anarchy:cache:avatar:<username>`, `anarchy:cache:tablist:<host>`, `anarchy:cache:coords:<host>`.
  - [x] TTL cấu hình rõ ràng: Avatar (10 phút), Rendered Images (2 - 4 giây).
- [x] **Cơ chế Fallback thông minh**:
  - [x] Tự động chuyển sang L1 In-Memory nếu Redis tạm thời mất kết nối.
  - [x] Tự động ghi lại vào Redis khi kết nối Redis được khôi phục.

### 4.3. Rà soát & Loại bỏ Kiểu `any` (Zero `any` Policy)
- [x] Khai báo interface chặt chẽ cho toàn bộ dữ liệu Parser: `ParsedChatMessage`, `QueueEventData`, `ServerBroadcastData`, `AdvancementEventData`.
- [x] Sử dụng types từ `@napi-rs/canvas` (`SKRSContext2D`, `Canvas`, `Image`).
- [x] Sử dụng types từ `prismarine-chat` (`ChatMessage`, `JsonMsg`).
- [x] Sử dụng types từ `discord.js` (`ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `ThumbnailBuilder`, `SeparatorBuilder`).

---

## 5. Checklist Kiểm thử & Đánh giá

- [x] **Kiểm tra hiển thị Discord**:
  - [x] Xác nhận mọi tin nhắn livechat đều hiển thị đúng màu từ bảng `messageColors`.
  - [x] Kiểm tra phản hồi lệnh `message.reply` không ping người dùng (`repliedUser: false`).
  - [x] Kiểm tra hiển thị Avatar Head chuẩn xác từ `mc-heads.net` (kèm fallback `minotar.net`).
  - [x] Không có custom emoji `<:name:id>` nào bị lỗi hình ảnh hoặc thiếu quyền.
- [x] **Kiểm tra tải & Caching**:
  - [x] Kiểm tra Redis keys được tạo và hết hạn đúng TTL.
  - [x] Tốc độ phản hồi tin nhắn trong điều kiện chat liên tục không bị nghẽn luồng.
