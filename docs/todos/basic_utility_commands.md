# Kế hoạch & Checklist: Bộ Lệnh Cơ Bản & Tiện Ích Bot (Basic Utility Commands)

Tài liệu này theo dõi và ghi nhận toàn bộ hệ thống lệnh điều khiển, tra cứu thông tin người chơi và tiện ích máy chủ cho bot Anarchy:
- Bộ lệnh **Tra cứu Thông tin & Lịch sử Người chơi (`!jd`, `!seen`, `!firstmessage`, `!lastmessage`)**.
- Lệnh **Tiện ích Hệ thống & Discord (`!discord`, `!kill`, `!ping`, `!tps`)**.

*(Lưu ý: Hệ thống Hộp thư Offline `!send` / `>send` đã được tách thành tài liệu chuyên biệt tại [`docs/todos/offline_mailbox_messaging.md`](file:///d:/Workspace/SOURCE/Others/anarchy-bot/docs/todos/offline_mailbox_messaging.md))*

> [!IMPORTANT]
> **Quy chuẩn Định dạng In-Game (Không sử dụng Emoji)**:
> Font renderer của Minecraft client mặc định không hỗ trợ hiển thị Emoji Unicode (bị lỗi ô vuông `□`).
> Tất cả các phản hồi in-game (`executeInGame`, whispers, chat bot) **hoàn toàn không dùng emoji**, sử dụng định dạng thẻ chuẩn: `[JoinDate]`, `[Seen]`, `[FirstMsg]`, `[LastMsg]`, `[Discord]`, `[Tu sat]`, `[Ping]`, `[Server TPS]`, `[Help - ...]`. Emoji chỉ hiển thị trên Discord Container V2.

---

## 1. Phân loại Bộ Lệnh theo Kênh Sử Dụng (Commands Classification)

### 1.1. Nhóm Lệnh In-Game (Minecraft Chat & Whisper)

| Lệnh | Alias | Mục đích & Hành vi Bot | Phân quyền & Cooldown | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **`!joindate`** | `!jd` | Xem ngày giờ đầu tiên người chơi tham gia vào máy chủ | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!seen`** | `!lastseen` | Kiểm tra trạng thái đang Online hay lần cuối cùng nhìn thấy người chơi | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!firstmessage`** | `!fm`, `!firstmsg` | Tra cứu câu tin nhắn đầu tiên của người chơi gửi trên server | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!lastmessage`** | `!lm`, `!lastmsg` | Tra cứu câu tin nhắn gần nhất của người chơi gửi trên server | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!discord`** | `!dc`, `!invite` | Lấy link mời tham gia Discord Server chính thức của Bot (`http://bit.ly/mo0nbot2`) | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!kill`** | `!suicide`, `!die`, `!tusan` | Bot tự động gõ `/kill` để tự sát, thoát bẫy kẹt Portal/Bedrock và hồi sinh về Spawn | **Mọi người chơi** *(Global Cooldown: 60s)* | ✅ Đã hoàn thành |
| **`!ping`** | `!ms`, `!latency` | Kiểm tra độ trễ mạng của bot tới Minecraft Server & Uptime | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |
| **`!tps`** | `!lag`, `!tick` | Đo tốc độ xử lý thực tế của Server (Ticks Per Second - chuẩn 20.0 TPS) | Mọi người chơi *(Cooldown: 3s)* | ✅ Đã hoàn thành |

---

### 1.2. Nhóm Lệnh Discord (Prefix `>` và Slash Commands)

| Lệnh Discord | Prefix | Mục đích & Phản hồi | Phân quyền | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **`/joindate`** | `>joindate <player>`, `>jd` | Trả về Container ngày đầu tiên player vào server | Mọi thành viên | ✅ Đã hoàn thành |
| **`/seen`** | `>seen <player>` | Trả về Container lần cuối player online hoặc trạng thái hiện tại | Mọi thành viên | ✅ Đã hoàn thành |
| **`/firstmessage`**| `>firstmessage <player>`, `>fm` | Trả về câu tin nhắn đầu tiên của player kèm thời gian | Mọi thành viên | ✅ Đã hoàn thành |
| **`/lastmessage`** | `>lastmessage <player>`, `>lm` | Trả về câu tin nhắn gần nhất của player kèm thời gian | Mọi thành viên | ✅ Đã hoàn thành |
| **`/discord`** | `>discord`, `>dc` | Trả về link tham gia Discord Server hoặc Container giới thiệu | Mọi thành viên | ✅ Đã hoàn thành |
| **`/kill`** | `>kill`, `>suicide` | Ra lệnh bot gõ `/kill` in-game để giải cứu bot | Mọi thành viên *(Cooldown: 60s)* | ✅ Đã hoàn thành |
| **`/ping`** | `>ping` | Container V2 hiển thị Bot Ping, Discord Ping và Uptime | Mọi thành viên | ✅ Đã hoàn thành |
| **`/tps`** | `>tps` | Container V2 hiển thị TPS, MSPT và biểu đồ độ ổn định server | Mọi thành viên | ✅ Đã hoàn thành |

---

## 2. Thiết kế Kỹ thuật Chi tiết

### 2.1. Lệnh Tra Cứu Người Chơi (`!jd`, `!seen`, `!firstmessage`, `!lastmessage`)

1. **`!joindate <player>` / `!jd <player>`**:
   - Truy vấn `PlayerModel.findOne({ server, username: target.toLowerCase() })`.
   - Lấy trường `firstSeen`.
   - Phản hồi In-Game: `[JoinDate] ${target} tham gia lần đầu vào: ${formattedDate} (${timeAgo})`.
   - Phản hồi Discord: Container V2 kèm Avatar người chơi và thời gian chi tiết.

2. **`!seen <player>`**:
   - Kiểm tra `player.isOnline` và mốc `lastSeen`.
   - Phản hồi In-Game:
     - Nếu đang Online: `[Seen] ${target} hiện đang ONLINE trên server!`.
     - Nếu Offline: `[Seen] ${target} online lần cuối vào: ${formattedDate} (${timeAgo})`.

3. **`!firstmessage <player>` / `!fm <player>`**:
   - Truy vấn `MessageModel.findOne({ server, username: target.toLowerCase() }).sort({ timestamp: 1 })`.
   - Phản hồi In-Game: `[FirstMsg] ${target} (${timeAgo}): "${message}"`.
   - Phản hồi Discord: Container V2 trích dẫn câu chat đầu tiên.

4. **`!lastmessage <player>` / `!lm <player>`**:
   - Truy vấn `MessageModel.findOne({ server, username: target.toLowerCase() }).sort({ timestamp: -1 })`.
   - Phản hồi In-Game: `[LastMsg] ${target} (${timeAgo}): "${message}"`.
   - Phản hồi Discord: Container V2 trích dẫn câu chat gần nhất.

---

### 2.2. Lệnh Cung Cấp Link Discord Server (`!discord` / `>discord`)
* **Mục đích**: Cung cấp link tham gia Discord Server chính thức của bot cho người chơi in-game.
* **Link Mặc Định**: `http://bit.ly/mo0nbot2` (hoặc cấu hình qua `DISCORD_INVITE_URL`).
* **Phản hồi**:
  - In-Game: `[Discord] Tham gia Discord Server của Bot tại: http://bit.ly/mo0nbot2`.
  - Discord: Container V2 mời người dùng tham gia server.

---

### 2.3. Lệnh Tự Sát Công Cộng (`!kill` / `>kill`)
* **Quy tắc Cooldown (60s)**:
  - Bất kỳ ai cũng có thể gõ `!kill` để giải cứu bot bị kẹt.
  - Global Cooldown: 60 giây giữa mỗi lần bot thực thi `/kill`.
  - Nếu có người gõ trong lúc cooldown: Bot whisper `[Tự sát] Lệnh đang hồi chiêu ({remaining}s), vui lòng đợi!`.
  - Admin/Developer có quyền bypass cooldown.
* **Phản hồi**:
  - Whisper người gọi: `[Tự sát] Bot đã tự sát theo yêu cầu của ${sender} và đang hồi sinh về Spawn!`.
  - Discord LiveChat: Container V2 ghi nhận người thực thi và xác nhận giải cứu bot.

---

### 2.4. Lệnh Kiểm Tra Hệ Thống (`!ping`, `!tps`)
* **`!ping` / `>ping`**: Đo độ trễ Minecraft Ping, WebSocket Ping Discord và thời gian hoạt động liên tục (Uptime).
* **`!tps` / `>tps`**: Đo tốc độ xử lý Ticks Per Second (TPS) thực tế và đánh giá độ mượt máy chủ.

---

## 3. Checklist Công việc Triển khai (TODO)

### Giai đoạn 1: Lệnh Thông Tin & Tra Cứu Người Chơi
- [x] **Lớp `JoinDateCommand.ts` (`src/commands/JoinDateCommand.ts`)**:
  - [x] Xử lý `!jd`, `!joindate` in-game và `>jd`, `>joindate`, `/joindate` trên Discord.
- [x] **Lớp `SeenCommand.ts` (`src/commands/SeenCommand.ts`)**:
  - [x] Xử lý `!seen`, `!lastseen` in-game và `>seen`, `/seen` trên Discord.
- [x] **Lớp `FirstMessageCommand.ts` (`src/commands/FirstMessageCommand.ts`)**:
  - [x] Truy vấn câu tin nhắn đầu tiên từ `MessageModel` (`sort: { timestamp: 1 }`).
  - [x] Xử lý `!fm`, `!firstmessage` in-game và `>fm`, `>firstmessage`, `/firstmessage` trên Discord.
- [x] **Lớp `LastMessageCommand.ts` (`src/commands/LastMessageCommand.ts`)**:
  - [x] Truy vấn câu tin nhắn mới nhất từ `MessageModel` (`sort: { timestamp: -1 }`).
  - [x] Xử lý `!lm`, `!lastmessage` in-game và `>lm`, `>lastmessage`, `/lastmessage` trên Discord.

### Giai đoạn 2: Lệnh Tiện Ích & Discord
- [x] **Lớp `DiscordInviteCommand.ts` (`src/commands/DiscordInviteCommand.ts`)**:
  - [x] Xử lý `!discord`, `!dc` in-game và `>discord`, `/discord` trên Discord.
  - [x] Trả về link máy chủ chính thức `http://bit.ly/mo0nbot2`.

### Giai đoạn 3: Lệnh Hệ Thống (`kill`, `ping`, `tps`)
- [x] **Lớp `KillCommand.ts` (`src/commands/KillCommand.ts`)**:
  - [x] Hỗ trợ `!kill`, `!suicide` in-game và `>kill`, `/kill` trên Discord.
  - [x] Thiết lập bộ đếm Global Cooldown (60s).
- [x] **Lớp `PingCommand.ts` (`src/commands/PingCommand.ts`)**:
  - [x] Hỗ trợ `!ping`, `>ping`, `/ping`.
- [x] **Lớp `TpsCommand.ts` (`src/commands/TpsCommand.ts`)**:
  - [x] Hỗ trợ `!tps`, `>tps`, `/tps`.

### Giai đoạn 4: Đăng Ký Lệnh & Hỗ Trợ Multiline
- [x] Đăng ký toàn bộ commands mới vào `CommandManager.ts` và `InGameCommandManager.ts`.
- [x] Cập nhật danh sách lệnh trong `HelpCommand.ts`.
- [x] Hỗ trợ ngắt đoạn tin nhắn dài & gửi nhiều dòng whisper liên tiếp trong `InGameCommandManager.ts`.
