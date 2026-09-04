# Kế hoạch & Checklist: Hệ Thống Hộp Thư Offline (Cross-Platform Offline Mailbox)

Tài liệu này chi tiết hóa toàn bộ kiến trúc, cơ chế hoạt động và danh sách công việc (Checklist / TODO) cho tính năng gửi tin nhắn Offline xuyên nền tảng (**Discord $\leftrightarrow$ Minecraft In-Game**) dành cho bot Anarchy.

---

## 1. Tổng quan Tính Năng (Feature Overview)

| Hạng mục | Mô tả chi tiết |
| :--- | :--- |
| **Mục đích** | Cho phép người dùng Discord hoặc người chơi in-game gửi tin nhắn/lời nhắn cho một người chơi đang Offline. Bot sẽ lưu trữ và tự động chuyển phát ngay khi người nhận online. |
| **Cú pháp In-game** | `!send <tên_player> <nội_dung>`, `!mail <player> <msg>`, `!msg <player> <msg>`. |
| **Cú pháp Discord** | `>send <tên_player> <nội_dung>`, `/send player:<tên> message:<nội_dung>`, `>mail <player> <msg>`. |
| **Điều kiện Gửi** | **Seen Validation**: Bot bắt buộc phải **đã từng thấy** người nhận trên máy chủ (`PlayerModel.findOne({ username: recipient })`). Nếu chưa từng thấy sẽ từ chối gửi. |
| **Biên nhận Giao thư** | Tự động báo cho người gửi khi người nhận đã vào server và đọc thư (qua In-game whisper, thông báo Discord hoặc lưu biên nhận offline). |
| **Lưu trữ CSDL** | MongoDB (`MailModel`) kèm TTL tự động dọn dẹp tin cũ sau 14 ngày. |
| **Trạng thái** | ⏳ Kế hoạch (Chờ triển khai) |

> [!IMPORTANT]
> **Quy chuẩn Định dạng In-Game (Không sử dụng Emoji)**:
> Minecraft không hỗ trợ font hiển thị Unicode Emoji mặc định (sẽ bị lỗi ô vuông `□`).
> Toàn bộ phản hồi in-game (whisper/chat) **tuyệt đối không chứa emoji**, chỉ sử dụng các tag tiền tố chuẩn như: `[Mailbox]`, `[JoinDate]`, `[Seen]`, `[Ping]`, `[Server TPS]`, `[Tu sat]`, `[Discord]`. Emoji chỉ dùng riêng trên giao diện Discord (Container V2).

---

## 2. Luồng Xử Lý Chi Tiết (Workflows)

### 2.1. Gửi Tin Nhắn Từ Discord (`>send` hoặc `/send`)
1. Người dùng chạy lệnh: `>send <tên_player> <nội_dung>` hoặc `/send player:<tên_player> message:<nội_dung>`.
2. Bot kiểm tra tính hợp lệ:
   - **Kiểm tra Seen**: Tìm kiếm người nhận trong CSDL `PlayerModel.findOne({ server: serverHost, username: recipient.toLowerCase() })`.
   - Nếu **chưa từng thấy**: Phản hồi lỗi: `❌ Người chơi **[tên_player]** chưa từng xuất hiện trên server này!`.
   - Nếu **đã từng thấy**: Lưu bản ghi vào MongoDB (`MailModel`) với trạng thái `isDelivered: false`, `senderPlatform: "discord"`, `senderId: message.author.id`.
3. Phản hồi xác nhận:
   - `✉️ Đã lưu thư gửi đến **[tên_player]**! Thư sẽ được tự động chuyển cho người chơi ngay khi họ vào server.`

---

### 2.2. Gửi Tin Nhắn Từ In-game Minecraft (`!send` / `!mail`)
1. Người chơi whisper hoặc chat: `!send <tên_player> <nội_dung>`.
2. Bot kiểm tra tính hợp lệ:
   - **Kiểm tra Seen**: Truy vấn `PlayerModel`. Nếu không tìm thấy $\rightarrow$ Whisper: `[Hộp thư] Người chơi "${recipient}" chưa từng xuất hiện trên server!`.
   - Nếu tìm thấy $\rightarrow$ Lưu vào MongoDB: `sender: cleanSender`, `senderPlatform: "minecraft"`, `isDelivered: false`.
3. Whisper xác nhận cho người gửi:
   - `[Hộp thư] Đã gửi tin nhắn đến "${recipientDisplayName}". Họ sẽ nhận được ngay khi đăng nhập!`

---

### 2.3. Tự Động Chuyển Phát Khi Người Nhận Online (Auto-Delivery Engine)
1. Lắng nghe các sự kiện nhận diện người chơi online:
   - Sự kiện `playerJoined` hoặc join chat: `+ <Player> đã tham gia server`.
   - Quét Tablist server (`bot.tablist`).
2. Khi phát hiện người chơi `X` online trên server:
   - Truy vấn MongoDB: `MailModel.find({ server: serverHost, receiver: lowerUser, isDelivered: false })`.
3. Nếu có thư chưa đọc:
   - Đợi 3 giây sau khi người chơi vào game để tránh trôi tin nhắn.
   - Bot whisper lần lượt từng thư (cách nhau 300ms):
     - `[Hộp thư] Bạn có {N} tin nhắn chưa đọc!`
     - `[Hộp thư từ ${sender} (${timeAgo})]: "${message}"`
   - Đánh dấu bản ghi: `isDelivered: true`, `deliveredAt: new Date()`.

---

### 2.4. Cơ Chế Báo Biên Nhận Cho Người Gửi (Delivery Receipt to Sender)
Ngay khi người nhận online và nhận được tin nhắn:
1. **Nếu người gửi đang Online in-game**:
   - Bot whisper ngay cho người gửi: `[Hộp thư] Người chơi "${recipient}" vừa vào server và đã nhận được tin nhắn của bạn!`.
2. **Nếu người gửi gửi từ Discord**:
   - Bot gửi thông báo phản hồi trên Discord (qua DM hoặc tag tại kênh gửi): `✅ [Hộp thư] Người chơi **${recipient}** đã online và nhận được tin nhắn từ bạn!`.
3. **Nếu người gửi đang Offline in-game**:
   - Bot lưu biên nhận `deliveryNotified: false`; ngay khi người gửi đăng nhập online trở lại, bot whisper:
     `[Hộp thư] "${recipient}" đã nhận được tin nhắn bạn gửi lúc ${timeAgo}!`.
   - Đánh dấu `deliveryNotified: true`.

---

### 2.5. Tra Cứu & Quản Lý Hộp Thư
* **In-game**:
  - `!mail inbox` / `!mail read`: Xem các tin nhắn gần nhất đã nhận.
  - `!mail clear`: Xóa toàn bộ tin nhắn đã đọc.
* **Discord**:
  - `>mail list` / `/mail list`: Xem danh sách các thư đã gửi đang chờ giao.
  - `>mail cancel <id>` / `/mail cancel id:<id>`: Hủy thư chưa kịp giao.

---

## 3. Thiết Kế CSDL (MongoDB Schema)

```typescript
// src/database/models/MailModel.ts
import { Schema, model, Document } from "mongoose";

export interface IMail extends Document {
  server: string;                     // Host server (vd: 2y2c.org, anarchyvn)
  sender: string;                     // Tên người gửi (Minecraft name hoặc Discord tag)
  senderPlatform: "discord" | "minecraft";
  senderId?: string;                  // Discord User ID (nếu gửi từ Discord)
  receiver: string;                   // Tên Minecraft người nhận (lowercase)
  receiverDisplayName: string;        // Tên hiển thị người nhận
  message: string;                    // Nội dung tin nhắn
  isDelivered: boolean;               // Trạng thái đã giao tới in-game
  deliveredAt?: Date;                 // Thời gian người nhận đã nhận được
  deliveryNotified: boolean;          // Đã báo cho người gửi biết hay chưa
  createdAt: Date;                    // Thời gian gửi
}

const MailSchema = new Schema<IMail>(
  {
    server: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    senderPlatform: { type: String, enum: ["discord", "minecraft"], required: true },
    senderId: { type: String, default: null },
    receiver: { type: String, required: true, lowercase: true, trim: true, index: true },
    receiverDisplayName: { type: String, required: true },
    message: { type: String, required: true, maxlength: 256 },
    isDelivered: { type: Boolean, default: false, index: true },
    deliveredAt: { type: Date, default: null },
    deliveryNotified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// TTL index: tự động xóa thư sau 14 ngày
MailSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });
MailSchema.index({ server: 1, receiver: 1, isDelivered: 1 });
MailSchema.index({ server: 1, sender: 1, deliveryNotified: 1 });

export const MailModel = model<IMail>("Mail", MailSchema);
```

---

## 4. Checklist Công Việc Triển Khai (TODO)

### Giai đoạn 1: Database & Service Layer
- [ ] **Tạo Model CSDL (`src/database/models/MailModel.ts`)**:
  - [ ] Khởi tạo Schema Mongoose với các index tối ưu (`server`, `receiver`, `isDelivered`, TTL 14 ngày).
- [ ] **Xây dựng `MailService.ts` (`s../../services/MailService.ts`)**:
  - [ ] Hàm `sendMail(options)`: Kiểm tra `PlayerModel` (Seen validation), rate limit và lưu thư.
  - [ ] Hàm `getPendingMails(server, receiver)`: Lấy danh sách thư chưa giao.
  - [ ] Hàm `markAsDelivered(mailIds)`: Cập nhật trạng thái đã giao và kích hoạt thông báo cho người gửi.
  - [ ] Hàm `checkDeliveryReceipts(server, sender)`: Lấy và xóa biên nhận cho người gửi khi online.

### Giai đoạn 2: In-Game Delivery Listener & Biên Nhận
- [ ] **Tích hợp Bộ Lắng Nghe Giao Thư (`src/events/mineflayer/PlayerJoined.ts` & `MessageStr.ts`)**:
  - [ ] Bắt sự kiện người chơi tham gia server.
  - [ ] Gọi `MailService.getPendingMails()`.
  - [ ] Gửi whisper in-game lần lượt với khoảng trễ 300ms.
  - [ ] Kích hoạt thông báo biên nhận giao thư cho người gửi.

### Giai đoạn 3: Discord Commands & LiveChat Integration
- [ ] **Lớp `SendCommand.ts` (`src/commands/SendCommand.ts`)**:
  - [ ] Hỗ trợ `!send`, `!mail`, `!msg` in-game.
  - [ ] Hỗ trợ `>send`, `>mail`, `/send` trên Discord.
  - [ ] Phản hồi thông báo đã gửi thành công hoặc từ chối nếu chưa từng thấy player.
- [ ] **Subcommands Quản Lý Hộp Thư**:
  - [ ] `!mail inbox`, `!mail clear` in-game.
  - [ ] `>mail list`, `>mail cancel` trên Discord.
