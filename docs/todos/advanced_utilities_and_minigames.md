# Kế hoạch & Checklist: Bộ Tiện Ích Mở Rộng, Minigames Thuần Việt & Bảo Mật Ghi Chú (In-Game Only)

Tài liệu này chi tiết hóa toàn bộ kiến trúc, cơ chế hoạt động, cú pháp và danh sách công việc (Checklist / TODO) cho các tính năng tiện ích mở rộng (Extended Utilities), Minigames truyền thống Việt Nam và cơ chế lọc tọa độ nhạy cảm trong hệ thống LiveChat.

> [!IMPORTANT]
> **Phạm Vi Hoạt Động (Scope): IN-GAME ONLY**
> Toàn bộ các lệnh tiện ích mở rộng (`!grass`, `!stalk`, `!time`, `!note`), hệ thống kinh tế ảo (`!work`, `!bal`, `!pay`, `!rich`), minigames cá cược (`!cf`, `!tx`, `!bc`, `!xs`), và minigames phát sóng (Quick Math, Word Scramble, Fast Typer) **CHỈ HOẠT ĐỘNG TRỰC TIẾP TRONG MINECRAFT** (thông qua public chat hoặc whisper với bot). Không tạo các lệnh Discord tương ứng để giữ tính nguyên bản và tránh spam trên Discord.

---

## 1. Danh Sách Tính Năng & Yêu Cầu Chi Tiết (In-Game Only)

### 1.1. Cảnh Báo "Chạm Cỏ" Hài Hước (Playtime Health & Anti-NoLife Warning)
* **Mô tả**: Tự động theo dõi thời gian online liên tục của từng người chơi trong phiên (session). Khi người chơi online chạm các mốc như **2 tiếng**, **4 tiếng**, **6 tiếng**, bot sẽ whisper lời cảnh báo hài hước, nhắc nhở nghỉ ngơi, uống nước hoặc "ra ngoài chạm cỏ" (touch grass).
* **Cấu hình câu thoại cứng (Hardcoded Message Templates trong code/constants - Không emoji)**:
  - **Mốc 2 tiếng (2h online liên tục)**:
    - `[Cảnh báo sức khỏe] Bạn đã cày liên tục 2 tiếng rồi! Ra ngoài chạm cỏ (touch grass), uống miếng nước đi bro. (Dùng !grass off để tắt)`
    - `[Nhắc nhở] Cảnh báo: Cột sống của bạn đang gào thét sau 2 tiếng cày Minecraft liên tục! Hãy đứng dậy vươn vai nhé. (Dùng !grass off để tắt)`
    - `[Nhắc nhở] Đã 2 tiếng trôi qua! Mắt bạn có mỏi không? Chớp mắt và nhìn ra xa 20 giây nào. (Dùng !grass off để tắt)`
  - **Mốc 4 tiếng (4h online liên tục)**:
    - `[Cảnh báo No-Life] 4 tiếng online không nghỉ ngơi?! Não bộ cần nạp oxy và nước, mau đứng dậy đi lại chút đi. (Dùng !grass off để tắt)`
    - `[Cảnh báo No-Life] Bạn đã cày thông 4 tiếng! Coi chừng biến thành Zombie trong game luôn đó bạn ơi. (Dùng !grass off để tắt)`
  - **Mốc 6 tiếng (6h+ online liên tục)**:
    - `[Báo động Đỏ] 6 tiếng liên tục không rời máy tính! Bạn đang hủy diệt sức khỏe của mình đó, mau đi nghỉ ngơi đi! (Dùng !grass off để tắt)`
* **Cơ chế theo dõi phiên (Redis Session Tracking - Siêu nhẹ)**:
  - Tận dụng `RedisManager.ts` đã có sẵn cơ chế session (`startTime`, `lastPing`).
  - Lưu thêm `lastWarnedHour` vào Redis session hash của player. Khi người chơi offline hoặc hết session, Redis tự động giải phóng/hết hạn. Không cần tạo collection MongoDB riêng cho session.
* **Tùy chọn Bật / Tắt theo người chơi (Player Toggle Setting)**:
  - `!grass off` hoặc `!touchgrass off`: Tắt hoàn toàn cảnh báo này cho bản thân.
  - `!grass on` hoặc `!touchgrass on`: Bật lại cảnh báo.
  - Phản hồi: `[Nhắc nhở] Đã TẮT cảnh báo online liên tục / chạm cỏ cho bạn.`
  - Lưu trữ: trường `healthWarning: { type: Boolean, default: true }` trong `PlayerModel` (kèm cache Redis để truy xuất tức thì).

---

### 1.2. Lệnh Theo Dõi Người Chơi `!stalk` (Player Stalk Watcher - Ingame Whisper)
* **Cú pháp (In-game Chat / Whisper)**:
  - `!stalk <tên_player>`: Bật theo dõi người chơi.
  - `!unstalk <tên_player>`: Hủy theo dõi.
  - `!stalk list`: Xem danh sách đang theo dõi.
* **Cơ chế**:
  - Khi mục tiêu vừa vào server $\rightarrow$ Bot whisper ngay cho người stalk: `[Stalk Alert] Mục tiêu "${target}" vừa đăng nhập vào server!`
  - Khi mục tiêu thoát server $\rightarrow$ Bot whisper: `[Stalk Alert] Mục tiêu "${target}" vừa rời khỏi server.`
  - Lưu trữ CSDL: `StalkModel` (MongoDB) liên kết `server`, `watcher` (lowercase), `target` (lowercase).

---

### 1.3. Lệnh Thông Tin Giờ Thế Giới & Thời Tiết `!time` (Ingame Only)
* **Cú pháp**: `!time` (In-game).
* **Thông tin hiển thị**:
  - **Giờ in-game**: Quy đổi từ `bot.time.timeOfDay` (0 - 24000 ticks) sang định dạng 24h (vd: `06:00` Bình minh, `12:00` Trưa, `18:30` Hoàng hôn, `00:00` Nửa đêm).
  - **Trạng thái**: Đếm ngược bao lâu nữa trời tối (có thể ngủ) hoặc bao lâu nữa trời sáng.
  - **Chu kỳ mặt trăng (Moon Phase)**: Trăng tròn (Full Moon), Trăng khuyết, Trăng non (hỗ trợ canh Slime spawn ở Swamp).
  - **Tuổi thế giới**: Số ngày đã trôi qua trong world (`bot.time.age / 24000`).
  - **Thời tiết**: Trời quang (Clear), Mưa (Raining), hoặc Bão sấm sét (Thunderstorm).

---

### 1.4. Bộ Minigames Giải Trí Thuần Việt (Vietnamese Minigames Engine - Ingame Only)
Hệ thống kinh tế ảo nhẹ (Economy Point / Coins) và các trò chơi đa dạng:

#### A. Khởi Nghiệp & Quản Lý Tài Chính
* **Vốn Khởi Nghiệp 1 Lần (Initial Starter Money)**:
  - Khi người chơi mới lần đầu tương tác với hệ thống kinh tế (hoặc qua `!bal`, `!claim`, `!starter`, `!work`), bot tự động cấp phát ngay **500 xu** khởi nghiệp (ghi nhận `claimedStarter: true` trong CSDL, chỉ nhận 1 lần duy nhất).
  - Phản hồi: `[Kinh Tế] Chào mừng tân thủ! Bạn đã nhận được 500 xu vốn khởi nghiệp. Dùng !work hoặc !minigames để gia tăng tài sản!`
* **`!work`**: Mỗi 15 phút người chơi có thể gõ để nhận từ 50 - 250 Xu ảo (kèm thông điệp hài hước: "Bạn đi đào than thuê", "Bạn đi câu cá ở spawn", "Bạn loot được rương kho báu").
* **`!bal` / `!balance` / `!coins`**: Xem số dư xu cá nhân.
* **`!pay <player> <số_xu>`**: Chuyển xu cho người chơi khác.
* **Lệnh Quản Trị Kinh Tế (Developer Only - Config: `"MoonVN"`, `"Moonu"`)**:
  - `!addcoin <player> <số_xu>` / `!givecoin`: Cộng xu trực tiếp cho người chơi.
  - `!setcoin <player> <số_xu>` / `!datxu`: Thiết lập số dư xu chính xác cho người chơi.
  - `!subcoin <player> <số_xu>` / `!takecoin` / `!truxu`: Trừ bớt xu của người chơi.

#### B. Hệ Thống Bảng Xếp Hạng Đa Dạng (`!top` / `!leaderboard`)
Hệ thống vinh danh các người chơi xuất sắc nhất trên máy chủ:
* **`!top` / `!top help`**: Xem danh mục các bảng xếp hạng có thể tra cứu.
* **`!top bal` / `!top coin` / `!rich`**: Bảng xếp hạng Top 5 đại gia sở hữu nhiều xu nhất server.
  - Ví dụ: `[Top Đại Gia] 1. mo0n (150,000 xu) | 2. steve (82,500 xu) | 3. alex (45,000 xu)`
* **`!top win` / `!top thang`**: Top 5 cao thủ thắng cược minigames nhiều nhất (`totalWon`).
* **`!top loss` / `!top thua`**: Top 5 người thua cược nhiều nhất (`totalLost`).
* **`!top work` / `!top chamchi`**: Top 5 người chăm chỉ làm việc cày cuốc nhất server (`workCount`).
* **`!top jackpot` / `!top xs`**: Top những người từng trúng hũ Jackpot xổ số lớn nhất trong lịch sử.
* **`!top play` / `!top playtime`**: Top 5 người có thời gian online server lâu nhất (`PlayerModel.playtime`).
* **`!top kill` / `!top pvp`**: Top 5 sát thủ hạ gục nhiều người nhất (`PlayerModel.kills`).
* **`!top death` / `!top chet`**: Top 5 người chết nhiều nhất server (`PlayerModel.deaths`).

#### C. Minigame Cá Cược Cá Nhân (Casino / Bet Games)
* **Tung Đồng Xu (`!coinflip` / `!cf <ngua|sap> <so_xu>`)**:
  - Cú pháp: `!cf ngua 100` / `!cf sap 50`.
  - Thắng nhận x2 tiền cược.
* **Tài Xỉu (`!taixiu` / `!tx <tai|xiu> <so_xu>`)**:
  - Lắc 3 xúc xắc 6 mặt (tổng 3 - 18).
  - **Xỉu**: 4 đến 10 (Thắng x2).
  - **Tài**: 11 đến 17 (Thắng x2).
  - **Bão** (1-1-1, 2-2-2,... 6-6-6): Nhà cái ăn hết.
* **Bầu Cua Tôm Cá (`!baucua` / `!bc <linh_vat> <so_xu>`)**:
  - Linh vật: `bau` (Bầu), `cua` (Cua), `tom` (Tôm), `ca` (Cá), `ga` (Gà), `nai` (Nai).
  - Lắc 3 xúc xắc hình 6 con vật. Trúng 1 con x1, 2 con x2, 3 con x3.

#### C. Lệnh Xổ Số & Quay Hũ Jackpot 18h Hàng Ngày (`!lottery` / `!xoso` / `!xs`)
* **Cơ chế hoạt động**:
  - Giá vé: 50 xu / vé. 80% doanh thu bán vé được cộng dồn trực tiếp vào **Hũ Thưởng Jackpot Chung**.
  - **Khung giờ quay thưởng**: **Đúng 18:00 (6:00 PM) hàng ngày theo giờ Việt Nam (UTC+7)**.
  - **Lệnh tra cứu (`!xs` / `!xoso` / `!lottery`)**:
    - Hiển thị: Giá trị Hũ Jackpot hiện tại, tổng số vé đã bán trong ngày, số vé của bạn, và đếm ngược thời gian đến lượt quay 18h00.
    - Ví dụ: `[Xổ Số] Hũ Jackpot: 15,200 xu | Đã bán: 84 vé | Vé của bạn: 5 vé | Quay thưởng lúc 18:00 hôm nay (còn 2h 15p)!`
  - **Lệnh mua vé (`!xs buy <số_lượng>` / `!xs mua <số_lượng>`)**:
    - Ví dụ: `!xs buy 5` $\rightarrow$ Mua 5 vé với giá 250 xu.
  - **Quy trình quay thưởng lúc 18:00**:
    - Tự động kích hoạt lúc 18:00:00 (Scheduler / Cron).
    - **Trường hợp có người mua vé**: Hệ thống bốc ngẫu nhiên 1 vé may mắn từ danh sách vé đã mua, trao toàn bộ hũ Jackpot cho người thắng, và phát thông báo toàn server:
      - `[Xổ Số] KẾT QUẢ QUAY THƯỞNG 18:00: Chúc mừng <Player> đã trúng Hũ Jackpot trị giá 15,200 xu!`
      - Reset kỳ mới với Jackpot khởi điểm tài trợ (vd: 1,000 xu).
    - **Trường hợp không có ai mua vé**: Hũ thưởng được giữ nguyên và cộng dồn sang ngày hôm sau (Roll-over Jackpot) để hũ tiếp tục tăng trưởng.

#### D. Minigame Phát Sóng Tương Tác Chat Toàn Server (Interactive Chat Broadcast Minigames)
* Tự động phát động định kỳ hoặc xen kẽ trong Auto Messages để kích thích tương tác toàn bộ người chơi:
  1. **Tính Nhanh (Quick Math)**:
     - Bot chat: `[Minigame] Ai tính nhanh nhất: 67 + 85 = ? (Thưởng 150 xu)`
     - Người đầu tiên chat đúng đáp án `152` trong chat chung sẽ nhận thưởng ngay lập tức.
  2. **Xáo Chữ Minecraft (Word Scramble)**:
     - Bot chat: `[Minigame] Sắp xếp lại từ Minecraft sau: "K-I-M-C-Ư-Ơ-N-G" (Thưởng 200 xu)`
     - Người đầu tiên chat `kim cương` hoặc `kimcuong` thắng cuộc.
  3. **Gõ Nhanh (Fast Typer)**:
     - Bot chat: `[Minigame] Ai gõ nhanh nhất cụ thể: "anarchy-vietnam-2026" (Thưởng 100 xu)`
     - Người đầu tiên gõ chính xác nhận thưởng.
  4. **Cơ chế quản lý phiên Minigame**:
     - Thời gian trả lời: 45 giây.
     - Nếu có người thắng: `[Minigame] Chúc mừng <Player> đã trả lời đúng nhanh nhất (Đáp án: ...) và nhận được 150 xu!`
     - Nếu hết giờ không ai trả lời đúng: `[Minigame] Đã hết thời gian! Đáp án chính xác là: ...`

---

### 1.5. Nâng Cấp Auto Message: Dynamic Time (VN / In-Game) & World Placeholders
Bổ sung các placeholder thời gian thực (chuẩn múi giờ Việt Nam UTC+7) và thế giới vào hệ thống AutoMessage (`AutoMessageService.ts`):
* **Thời gian thực tế Việt Nam (UTC+7)**:
  - `{real_time_vn}` / `{real_time}`: Giờ thực tế VN (vd: `17:15:30`).
  - `{real_date_vn}` / `{real_date}`: Ngày thực tế VN (vd: `04/09/2026`).
  - `{real_datetime_vn}`: Ngày giờ đầy đủ (vd: `17:15:30 04/09/2026`).
* **Thời gian & Môi trường In-game Minecraft**:
  - `{ingame_time}`: Giờ trong game định dạng 24h (vd: `14:30`, `06:00`).
  - `{day_night}`: Trạng thái ngày/đêm (`Ban ngày` / `Ban đêm`).
  - `{moon_phase}`: Chu kỳ mặt trăng (`Trăng tròn`, `Trăng khuyết`, `Trăng non`...).
  - `{world_day}`: Số ngày tuổi của thế giới (vd: `Ngày 1250`).
  - `{weather}`: Thời tiết hiện tại (`Trời quang`, `Trời mưa`, `Bão sấm sét`).
  - `{players_online}`: Số lượng người chơi đang online.
* **Bộ danh sách thông điệp quảng cáo ưu tiên tính năng mới (`src/config/appConfig.ts`)**:
  1. `> [Server] Bây giờ là {real_time_vn} (VN) | In-game: {ingame_time} ({day_night}) - {weather}. {players_online} người chơi đang online!`
  2. `> [Xổ Số 18:00] Mua vé số săn Hũ Jackpot mỗi ngày với "!xs buy <số_vé>". Quay thưởng tự động vào đúng 18:00 hàng ngày!`
  3. `> [Minigames] Thử vận may với "!cf" (Tung xu), "!tx" (Tài Xỉu), "!bc" (Bầu Cua) hoặc chăm chỉ cày cuốc với "!work"!`
  4. `> [Tân Thủ] Nhận ngay 500 xu khởi nghiệp miễn phí khi gõ "!bal" hoặc "!work" lần đầu tiên!`
  5. `> [Bảng Xếp Hạng] Xem top đại gia và cao thủ cày cuốc server bằng lệnh "!top bal", "!top win", "!top play"!`
  6. `> [Ghi Chú] Lưu tọa độ base và chia sẻ cho đồng đội an toàn với lệnh "!note" (tự động bảo mật tọa độ trên LiveChat)!`
  7. `> [Stalk] Nhận thông báo whisper khi bạn bè hoặc kẻ thù vào/ra server với lệnh "!stalk <tên_player>"!`
  8. `> [Thời Gian] Xem giờ game 24h, đếm ngược bao lâu nữa trời tối và chu kỳ mặt trăng bằng lệnh "!time"!`
  9. `> [Bot Tip] Dùng "!help" để xem danh sách toàn bộ các lệnh tiện ích và minigame của bot.`
  10. `> [Discord] Tham gia Discord để trò chuyện 2 chiều in-game & nhận thông báo tử nạn tại: bit.ly/mo0nbot2`
  11. `> [Bot Tip] Xem chỉ số K/D của bạn hoặc người chơi khác với lệnh "!kd <tên>" hoặc "!stats <tên>".`
  12. `> [Bot Tip] Tra cứu lần đầu và lần cuối người chơi xuất hiện trên server bằng lệnh "!seen <tên>" hoặc "!joindate <tên>".`

---

### 1.6. Lệnh Ghi Chú, Whitelist Chia Sẻ & Ẩn Tọa Độ LiveChat (`!note` + Advanced Coordinate Filter)
* **Cú pháp cơ bản**:
  - `!note add <nội_dung>`: Lưu ghi chú cá nhân.
  - `!note list`: Xem danh sách ghi chú của bản thân.
  - `!note del <số_thứ_tự>`: Xóa ghi chú.
  - `!note clear`: Xóa toàn bộ ghi chú.
* **Tính Năng Whitelist Chia Sẻ Cho Người Khác (Shared / Whitelisted Notes)**:
  - `!note share <số_thứ_tự> <player1> [player2...]`: Cấp quyền whitelist cho bạn bè / đồng đội xem ghi chú này.
  - `!note unshare <số_thứ_tự> <player>`: Thu hồi quyền xem ghi chú.
  - `!note shared`: Xem danh sách tất cả các ghi chú mà người khác đã chia sẻ cho bạn.
  - `!note view <owner_player> <số_thứ_tự>`: Xem chi tiết nội dung ghi chú được người khác chia sẻ cho bạn (Bot gửi qua whisper).
* **Cơ Chế Bảo Vệ Tọa Độ Nâng Cao (Nhận diện cả dạng viết tắt 40k, 30k, -150k...)**:
  - Khi người chơi chat hoặc whisper ghi chú chứa tọa độ (vd: `40k 30k`, `x: 40k z: -30k`, `40k/30k`, `40k ~ -100k`, `-150k 64 300k`, `150000 -300000`):
  - **Hệ thống regex nhận diện đa tầng**:
    - Tọa độ có nhãn (X/Z, X=, Z=) kèm hậu tố 'k' hoặc số nguyên.
    - Cặp/Bộ ba tọa độ viết tắt 'k' cách nhau bởi khoảng trắng, dấu gạch chéo `/`, dấu phẩy `,`, dấu ngã `~`.
    - Dạng lai giữa số nguyên và số 'k' (vd: `40k -30000`, `150000 -30k`).
  - **Hành vi xử lý:**
    - Bot lưu nội dung gốc an toàn vào MongoDB (`NoteModel`).
    - Trong `MessageStr.ts` & `LiveChatManager.ts`: **Tuyệt đối che dấu toàn bộ bằng `[TỌA ĐỘ ĐÃ ĐƯỢC ẨN]`** trước khi đẩy tin lên LiveChat Discord.

---

### 1.7. Quy Tắc Hiển Thị LiveChat Discord (LiveChat Visibility Rules)
* **1. Lệnh chat công khai (Public Chat Commands)**:
  - Người chơi gõ lệnh trên kênh chat chung (vd: `<Player> !bal`, `<Player> !stats`, `<Player> !tx tai 50`, `<Player> !time`, `<Player> !xs`...):
  - **VẪN HIỂN THỊ BÌNH THƯỜNG** trên LiveChat Discord như mọi tin nhắn chat khác.
* **2. Lệnh thì thầm riêng tư (Whisper Commands to Bot)**:
  - Người chơi whisper riêng cho bot chứa lệnh (vd: `Player whispers to you: !note ...`, `Player whispers to you: !send ...`, `Player whispers to you: !stalk ...`):
  - **ẨN HOÀN TOÀN KHỎI LIVECHAT** nhằm bảo vệ sự riêng tư và bảo mật thông tin/tọa độ của người chơi.
* **3. Phản hồi Whisper của Bot (Bot Outgoing Whisper Replies)**:
  - Các dòng bot whisper trả lời riêng cho người chơi (vd: `You whisper to Player: [Hộp thư] ...`, `[Note] ...`, `[Stalk] ...`):
  - **ẨN HOÀN TOÀN KHỎI LIVECHAT** để tránh spam và giữ kênh chat Discord luôn sạch sẽ.

---

## 2. Thiết Kế CSDL (MongoDB Schemas)

### 2.1. `NoteModel.ts`
```typescript
interface INote {
  server: string;
  username: string; // lowercase
  displayName: string;
  content: string;
  hasCoords: boolean;
  sharedWith: string[]; // Whitelist danh sách người chơi được phép xem
  createdAt: Date;
}
```

### 2.2. `StalkModel.ts`
```typescript
interface IStalk {
  server: string;
  watcher: string; // Tên người theo dõi (lowercase)
  watcherDisplayName: string;
  target: string; // Tên người bị theo dõi (lowercase)
  targetDisplayName: string;
  createdAt: Date;
}
```

### 2.3. `EconomyModel.ts`
```typescript
interface IEconomy {
  server: string;
  username: string; // lowercase
  displayName: string;
  balance: number;
  claimedStarter: boolean; // Đã nhận tiền khởi nghiệp 1 lần
  workCount: number; // Tổng số lần đã gõ !work
  lastWorkedAt?: Date;
  dailyStreak: number;
  totalWon: number;
  totalLost: number;
}
```

### 2.4. `LotteryModel.ts`
```typescript
interface ILotteryTicket {
  username: string;
  displayName: string;
  ticketCount: number;
}

interface ILottery {
  server: string;
  round: number;
  jackpotPool: number; // Tổng xu trong hũ thưởng
  ticketPrice: number; // Mặc định 50 xu
  tickets: ILotteryTicket[];
  lastWinner?: {
    username: string;
    displayName: string;
    amount: number;
    wonAt: Date;
  };
  updatedAt: Date;
}
```

---

## 3. Danh Sách Công Việc Triển Khai (Checklist TODO)

### Giai đoạn 1: Database Models & Services
- [x] Tạo `NoteModel.ts`, `StalkModel.ts`, `EconomyModel.ts`, `LotteryModel.ts` trong `src/database/models/`.
- [x] Xây dựng `EconomyService.ts`: Cấp phát vốn khởi nghiệp 500 xu (1 lần), xử lý cộng/trừ xu, cooldown `!work`, chuyển tiền `!pay`, bảng xếp hạng tài phiệt.
- [x] Xây dựng `LotteryService.ts`: Quản lý mua vé số, dồn hũ Jackpot, và quay thưởng tự động lúc 18:00 hàng ngày.
- [x] Xây dựng `StalkService.ts`: Quản lý danh sách stalk và phát thông báo whisper khi mục tiêu online/offline.
- [x] Xây dựng `NoteService.ts`: Quản lý CRUD ghi chú cá nhân.
- [x] Xây dựng `ChatMinigameService.ts`: Quản lý các minigame phát sóng (Quick Math, Word Scramble, Fast Typer) và trao thưởng.

### Giai đoạn 2: Safety, Anti-Spam & Stealth Filter
- [x] Xây dựng hàm `CoordinateFilter.redactCoords(text)` trong `src/utils/minecraft/coordinateFilter.ts`.
- [x] Tích hợp bộ lọc tọa độ vào `LiveChatManager.ts` và `MessageStr.ts` để chặn lộ tọa độ ghi chú.
- [x] Bổ sung cơ chế đếm thời gian online liên tục vào `PlaytimeTracker.ts` với Redis session hash để kích hoạt cảnh báo sức khỏe sau mỗi 2 tiếng (kèm toggle `!grass on|off`).
- [x] Nâng cấp `AutoMessageService.ts` với dynamic placeholders (giờ thực VN `{real_time_vn}`, `{ingame_time}`, `{moon_phase}`, `{weather}`, `{world_day}`, `{day_night}`).

### Giai đoạn 3: Commands Triển Khai (In-Game Only)
- [x] **Lệnh `TimeCommand.ts`**: Hiển thị giờ game 24h, đếm ngược sáng/tối, chu kỳ mặt trăng, thời tiết.
- [x] **Lệnh `TouchGrassCommand.ts`** (`!grass` / `!touchgrass`): Bật/tắt cảnh báo 2h.
- [x] **Lệnh `StalkCommand.ts`**: Đăng ký và quản lý theo dõi người chơi.
- [x] **Lệnh `NoteCommand.ts`**: Ghi chú cá nhân bảo mật tọa độ.
- [x] **Lệnh `WorkCommand.ts`, `BalanceCommand.ts`, `PayCommand.ts`**: Hệ thống kinh tế xu ảo & vốn khởi nghiệp 500 xu.
- [x] **Lệnh `TopCommand.ts`** (`!top`, `!rich`, `!leaderboard`): Xem các bảng xếp hạng server (top xu, top thắng, top thua, top cày cuốc, top playtime, top kill, top death).
- [x] **Lệnh `LotteryCommand.ts`** (`!lottery` / `!xoso` / `!xs`): Mua vé số, xem hũ Jackpot, quay thưởng 18h.
- [x] **Lệnh Minigames Cá Cược**: `CoinflipCommand.ts`, `TaiXiuCommand.ts`, `BauCuaCommand.ts`.
- [x] Cập nhật `HelpCommand.ts` và `CommandManager.ts`.
