# Kế Hoạch & TODO: Phân Loại Kiến Trúc Services, Utils, Typings (Minecraft vs Discord vs LiveChat vs Core)

> [!NOTE]
> Tài liệu này đóng vai trò là bản đặc tả kiến trúc (Architectural Blueprint) và danh sách nhiệm vụ (TODO Backlog) để tái cấu trúc mã nguồn dự án `anarchy-bot`. Hiện tại tài liệu này ở trạng thái **Lập Kế Hoạch (Planning & Backlog) - Chưa triển khai**.

---

## 1. Mục Tiêu Tái Cấu Trúc (Architecture Goals)

1. **Phân định ranh giới miền rõ ràng (Domain Separation)**:
   - Tách bạch rõ các thành phần thuộc:
     - **Minecraft Game Bot** (Gameplay, Anti-AFK, Auto-Eat, Pathfinding, Highway, Auth, In-Game Events).
     - **Discord Bot** (Slash Commands, Prefix Commands, Component Interactions, Buttons, Modals, Embeds).
     - **LiveChat Bridge** (Cầu nối 2 chiều Minecraft <-> Discord, Canvas Message Rendering, Message Classifier feedback).
     - **Analytics & Pattern Engine** (Death parser, Regex learner, Stats, Playtime tracking).
     - **Core & Shared Utils** (Logger, Time format, Config, Database models, Generic helpers).
     - **Web Backend & Viewer** (Dashboard API, Prismarine Web Viewer).
2. **Loại bỏ phụ thuộc chéo lộn xộn (Circular / Tangled Dependencies)**:
   - Các module hạ tầng (Core/Utils) không được import ngược các module tầng trên (Discord Client / Mineflayer Bot).
   - Sử dụng Event Emitter hoặc Dependency Injection thông qua Manager.
3. **Cấu trúc lại thư mục Typings & Interfaces**:
   - Tách `typings` theo từng domain thay vì gom chung trong 1-2 file lớn, giúp autocomplete và bảo trì type an toàn hơn.
4. **Đảm bảo tính tương thích ngược (Zero Breaking Changes during Migration)**:
   - Sử dụng barrel exports (`index.ts`) tại các thư mục cũ để chuyển tiếp đường dẫn import trước khi dọn dẹp triệt để.

---

## 2. Bảng Phân Loại Toàn Bộ Mã Nguồn Hiện Tại

### 2.1. Phân loại `s../../services/`

| File Hiện Tại | Miền Trách Nhiệm (Domain) | Mục Đích & Chức Năng | Đề Xuất Đường Dẫn Mới |
| :--- | :--- | :--- | :--- |
| `AntiAfkService.ts` | **Minecraft Game** | Chống AFK (nhảy, xoay góc nhìn, di chuyển nhẹ, sneak) | `s../../services/minecraft/AntiAfkService.ts` |
| `AutoEatService.ts` | **Minecraft Game** | Tự động ăn khi độ đói hoặc máu giảm, tìm thức ăn an toàn trong rương/túi | `s../../services/minecraft/AutoEatService.ts` |
| `SmartPathfinderService.ts` | **Minecraft Game** | Tìm đường thông minh bằng `mineflayer-pathfinder`, tránh bẫy/lava | `s../../services/minecraft/SmartPathfinderService.ts` |
| `HighwayNavigationService.ts` | **Minecraft Game** | Di chuyển tự động trên trục đường chính Nether Highway | `s../../services/minecraft/HighwayNavigationService.ts` |
| `AutoMessageService.ts` | **Minecraft Game** | Tự động phát tin nhắn định kỳ / quảng bá trong game | `s../../services/minecraft/AutoMessageService.ts` |
| `DeathParserService.ts` | **Game & Analytics** | Phân tích cú pháp tin nhắn chết in-game, trích xuất killer/victim/weapon, lưu DB | `s../../services/analytics/DeathParserService.ts` |
| `SystemPatternService.ts` | **Game & Analytics** | Quản lý bộ pattern nhận diện tin nhắn server / hệ thống | `s../../services/analytics/SystemPatternService.ts` |
| `MessageClassifierService.ts` | **Bridge & AI** | Phân loại tin nhắn (Chat/System/Death/Spam) + Discord buttons feedback loop | `s../../services/livechat/MessageClassifierService.ts` |
| `PlaytimeTracker.ts` | **Analytics & DB** | Theo dõi và cộng dồn thời gian online của từng người chơi | `s../../services/analytics/PlaytimeTracker.ts` |
| `StatsService.ts` | **Analytics & DB** | Tính toán K/D, bảng xếp hạng Top Kill, Top Playtime, JoinDate | `s../../services/analytics/StatsService.ts` |
| `QuoteService.ts` | **Analytics & DB** | Quản lý, lưu trữ và bốc ngẫu nhiên câu nói của người chơi | `s../../services/analytics/QuoteService.ts` |
| `ViewerManagerService.ts` | **Web / Debug** | Khởi chạy và quản lý Prismarine Web 3D Viewer cho bot | `s../../services/web/ViewerManagerService.ts` |
| `canvas/*` | **Discord LiveChat** | Vẽ hình ảnh tin nhắn Canvas V1/V2 gửi lên kênh LiveChat Discord | `s../../services/livechat/canvas/*` |

---

### 2.2. Phân loại `src/utils/`

| File Hiện Tại | Miền Trách Nhiệm (Domain) | Mục Đích & Chức Năng | Đề Xuất Đường Dẫn Mới |
| :--- | :--- | :--- | :--- |
| `authHandler.ts` | **Minecraft Game** | Tự động xử lý đăng nhập PIN, `/login`, `/register` khi bot vào cụm | `src/utils/minecraft/authHandler.ts` |
| `chatParser.ts` | **Minecraft & LiveChat** | Parse JSON text, mã màu Minecraft (§), trích xuất tiền tố channel/whisper | `src/utils/minecraft/chatParser.ts` |
| `minecraftMobs.ts` | **Minecraft Game** | Từ điển tên quái vật / mob tiếng Việt & tiếng Anh | `src/utils/minecraft/minecraftMobs.ts` |
| `deathRegexLearner.ts` | **AI & Analytics** | Thuật toán học regex tự động từ các tin nhắn chết mới | `src/utils/analytics/deathRegexLearner.ts` |
| `defaultDeathPatterns.ts`| **AI & Analytics** | Tập hợp regex mẫu khởi tạo ban đầu cho cái chết | `src/utils/analytics/defaultDeathPatterns.ts` |
| `defaultSystemPatterns.ts`| **AI & Analytics** | Tập hợp regex mẫu khởi tạo cho tin nhắn hệ thống máy chủ | `src/utils/analytics/defaultSystemPatterns.ts` |
| `serverMessageMatcher.ts`| **AI & Analytics** | So khớp regex tin nhắn server tối ưu | `src/utils/analytics/serverMessageMatcher.ts` |
| `spamDetector.ts` | **LiveChat & Chat** | Bộ lọc tin nhắn lặp, chống flood/spam từ in-game | `src/utils/livechat/spamDetector.ts` |
| `messageRenderer.ts` | **Discord LiveChat** | Canvas vẽ tin nhắn LiveChat dạng v1 (cũ) | `src/utils/livechat/messageRenderer.ts` |
| `messageV2Renderer.ts` | **Discord LiveChat** | Canvas vẽ tin nhắn LiveChat dạng v2 hiện đại | `src/utils/livechat/messageV2Renderer.ts` |
| `timeFormat.ts` | **Core & Shared** | Format thời gian (`formatDuration`, `timeAgo`, `formatDateTime`) | `src/utils/common/timeFormat.ts` |
| `regexUtils.ts` | **Core & Shared** | Utility xử lý regex escape, regex builder chung | `src/utils/common/regexUtils.ts` |

---

### 2.3. Phân loại `src/typings/`

| File Hiện Tại | Miền Trách Nhiệm (Domain) | Chứa Các Kiểu Dữ Liệu | Đề Xuất Cải Tiến |
| :--- | :--- | :--- | :--- |
| `MineflayerEvent.ts` | **Minecraft Game** | Event handler interfaces cho Mineflayer (`spawn`, `chat`, `death`, `kicked`,...) | `src/typings/minecraft/events.types.ts` |
| `DiscordEvent.ts` | **Discord Bot** | Event handler interfaces cho Discord.js (`ready`, `messageCreate`, `interactionCreate`,...) | `src/typings/discord/events.types.ts` |
| `Command.ts` | **Shared / Command Engine**| Interface lệnh cho cả Discord Slash/Prefix và In-game Minecraft command | `src/typingss/command.types.ts` |
| `config.types.ts` | **Core Config** | Type cho cấu hình `config.json` / ENV (Discord, Minecraft, Database, Web) | `src/typings/core/config.types.ts` |
| `env.d.ts` | **Core Config** | Type cho `process.env` | `src/typings/core/env.d.ts` |
| `types.ts` | **General Enums** | `Server`, `DisconnectType`, `ServerIp`, `MineflayerEventName` | Tách ra `src/typings/minecraft/enums.ts` & `src/typings/core/enums.ts` |
| *(Mới cần thêm)* | **LiveChat Bridge** | Type cho LiveChat queue, message envelope, canvas render payload, verification actions | `src/typings/livechat/livechat.types.ts` |
| *(Mới cần thêm)* | **Analytics & Stats** | Type cho Death records, Killer verification, Pattern metadata, Stats summaries | `src/typings/analytics/stats.types.ts` |

---

### 2.4. Phân loại `src/structures/`

| File Hiện Tại | Miền Trách Nhiệm (Domain) | Vai Trò |
| :--- | :--- | :--- |
| `Minecraft.ts` | **Minecraft Core** | Client bọc Mineflayer Bot, quản lý plugins, event emitter in-game |
| `MinecraftBotManager.ts` | **Minecraft Core** | Quản lý vòng đời khởi tạo, reconnect, đa bot Minecraft |
| `Discord.ts` | **Discord Core** | Client bọc Discord.js, load commands, load events, quản lý webhook |
| `LiveChatManager.ts` | **LiveChat Bridge** | Điều phối luồng tin nhắn giữa Minecraft Chat và Discord LiveChat Channel |
| `Logger.ts` | **Core & Shared** | Logger Winston / Chalk ghi log chuẩn màu ra Console & File |

---

## 3. Cấu Trúc Thư Mục Đích Mục Tiêu (Target Architecture)

```
src/
├── backend/                         # Web Dashboard & API
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── services/
│
├── commands/                        # Quản lý Lệnh
│   ├── discord/                     # Lệnh chuyên biệt Discord (Prefix & Slash)
│   ├── ingame/                      # Lệnh chuyên biệt Minecraft In-game chat
│   ├── shared/                      # Lệnh dùng chung cả 2 môi trường (jd, seen, stats,...)
│   ├── CommandManager.ts
│   └── InGameCommandManager.ts
│
├── config/                          # Cấu hình hệ thống & nạp ENV
│
├── database/                        # Database Mongoose
│   ├── models/
│   └── index.ts
│
├── events/                          # Event Listeners
│   ├── discord/                     # (Đổi tên từ events/client)
│   └── mineflayer/                  # Event Mineflayer bot
│
├── interactions/                    # Discord Components
│   ├── buttons/
│   ├── modals/
│   └── selectMenus/
│
├── redis/                           # Cache & PubSub (nếu có)
│
├── services/                        # 🌟 Dịch vụ Nghiệp Vụ (Services)
│   ├── minecraft/                   # Nghiệp vụ In-Game & Gameplay
│   │   ├── AntiAfkService.ts
│   │   ├── AutoEatService.ts
│   │   ├── AutoMessageService.ts
│   │   ├── HighwayNavigationService.ts
│   │   ├── SmartPathfinderService.ts
│   │   └── index.ts
│   ├── livechat/                    # Cầu nối LiveChat & Canvas Renderer
│   │   ├── canvas/
│   │   │   ├── core/
│   │   │   ├── features/
│   │   │   └── CanvasRendererService.ts
│   │   ├── MessageClassifierService.ts
│   │   └── index.ts
│   ├── analytics/                   # Thống kê, Phân tích & AI Pattern
│   │   ├── DeathParserService.ts
│   │   ├── SystemPatternService.ts
│   │   ├── PlaytimeTracker.ts
│   │   ├── StatsService.ts
│   │   ├── QuoteService.ts
│   │   └── index.ts
│   ├── web/                         # Dịch vụ hỗ trợ Web Dashboard / Viewer
│   │   ├── ViewerManagerService.ts
│   │   └── index.ts
│   └── index.ts                     # Root Barrel Export (Backward Compatibility)
│
├── structures/                      # Cấu trúc cốt lõi
│   ├── discord/
│   │   └── DiscordClient.ts
│   ├── minecraft/
│   │   ├── MinecraftBot.ts
│   │   └── MinecraftBotManager.ts
│   ├── livechat/
│   │   └── LiveChatManager.ts
│   └── common/
│       └── Logger.ts
│
├── typings/                         # 🌟 Định nghĩa Typescript
│   ├── commands/
│   │   └── command.types.ts
│   ├── discord/
│   │   └── events.types.ts
│   ├── minecraft/
│   │   ├── events.types.ts
│   │   └── enums.ts
│   ├── livechat/
│   │   └── livechat.types.ts
│   ├── analytics/
│   │   └── analytics.types.ts
│   ├── core/
│   │   ├── config.types.ts
│   │   ├── env.d.ts
│   │   └── enums.ts
│   └── index.ts
│
└── utils/                           # 🌟 Hàm Tiện Ích (Utilities)
    ├── minecraft/                   # Tiện ích Minecraft & Auth
    │   ├── authHandler.ts
    │   ├── chatParser.ts
    │   ├── minecraftMobs.ts
    │   └── index.ts
    ├── livechat/                    # Tiện ích LiveChat & Canvas
    │   ├── messageRenderer.ts
    │   ├── messageV2Renderer.ts
    │   ├── spamDetector.ts
    │   └── index.ts
    ├── analytics/                   # Tiện ích Pattern Regex & Machine Learning
    │   ├── deathRegexLearner.ts
    │   ├── defaultDeathPatterns.ts
    │   ├── defaultSystemPatterns.ts
    │   ├── serverMessageMatcher.ts
    │   └── index.ts
    ├── common/                      # Tiện ích dùng chung
    │   ├── timeFormat.ts
    │   ├── regexUtils.ts
    │   └── index.ts
    └── index.ts                     # Root Barrel Export (Backward Compatibility)
```

---

## 4. Danh Sách Nhiệm Vụ Triển Khai (TODO Checklist Backlog)

> [!IMPORTANT]
> Danh sách dưới đây được phân chia theo từng giai đoạn an toàn. **Chưa thực hiện code / refactor ngay** mà sẽ triển khai theo từng Pull Request / Milestone khi bắt đầu.

### Giai đoạn 1: Chuẩn bị & Tái cấu trúc Hệ thống Typings (`src/typings/`)
- [x] **1.1. Tạo cấu trúc thư mục con trong `src/typings/`**:
  - [x] `src/typings/minecraft/`
  - [x] `src/typings/discord/`
  - [x] `src/typings/livechat/`
  - [x] `src/typings/analytics/`
  - [x] `src/typingss/`
  - [x] `src/typings/core/`
- [x] **1.2. Di chuyển và tách nhỏ các types hiện tại**:
  - [x] Chuyển `MineflayerEvent.ts` -> `src/typings/minecraft/events.types.ts`.
  - [x] Chuyển `DiscordEvent.ts` -> `src/typings/discord/events.types.ts`.
  - [x] Chuyển `Command.ts` -> `src/typingss/command.types.ts`.
  - [x] Chuyển `config.types.ts` và `env.d.ts` -> `src/typings/core/`.
  - [x] Tách `types.ts` thành `minecraft/enums.ts` (`MineflayerEventName`, `ServerIp`, `DisconnectType`, `Server`) và `core/enums.ts`.
- [x] **1.3. Bổ sung các Types còn thiếu**:
  - [x] Tạo `livechat.types.ts`: Typings cho queue tin nhắn, metadata livechat, button interaction payloads.
  - [x] Tạo `analytics.types.ts`: Typings cho Death parse result, K/D calculation input/output, Regex learner input.
- [x] **1.4. Thiết lập Barrel Export `src/typings/index.ts`**: Đảm bảo tất cả file cũ import từ `typings` vẫn biên dịch thành công mà không lỗi.

---

### Giai đoạn 2: Tái cấu trúc Thư mục Tiện Ích (`src/utils/`)
- [x] **2.1. Phân nhóm Utils Minecraft**:
  - [x] Di chuyển `authHandler.ts`, `chatParser.ts`, `minecraftMobs.ts` vào `src/utils/minecraft/`.
- [x] **2.2. Phân nhóm Utils Analytics & Regex**:
  - [x] Di chuyển `deathRegexLearner.ts`, `defaultDeathPatterns.ts`, `defaultSystemPatterns.ts`, `serverMessageMatcher.ts` vào `src/utils/analytics/`.
- [x] **2.3. Phân nhóm Utils LiveChat**:
  - [x] Di chuyển `messageRenderer.ts`, `messageV2Renderer.ts`, `spamDetector.ts` vào `src/utils/livechat/`.
- [x] **2.4. Phân nhóm Utils Dùng Chung (Common)**:
  - [x] Di chuyển `timeFormat.ts`, `regexUtils.ts`, `vietnameseUtils.ts` vào `src/utils/common/`.
- [x] **2.5. Tạo các file `index.ts` barrel export** cho từng thư mục con và `src/utils/index.ts` để bảo toàn import cũ.

---

### Giai đoạn 3: Tái cấu trúc Thư mục Dịch Vụ (`s../../services/`)
- [x] **3.1. Phân nhóm Services Minecraft Gameplay**:
  - [x] Di chuyển `AntiAfkService.ts`, `AutoEatService.ts`, `SmartPathfinderService.ts`, `HighwayNavigationService.ts`, `AutoMessageService.ts` vào `s../../services/minecraft/`.
- [x] **3.2. Phân nhóm Services Analytics & Thống Kê**:
  - [x] Di chuyển `DeathParserService.ts`, `SystemPatternService.ts`, `PlaytimeTracker.ts`, `StatsService.ts`, `QuoteService.ts` vào `s../../services/analytics/`.
- [x] **3.3. Phân nhóm Services LiveChat & Canvas**:
  - [x] Di chuyển `MessageClassifierService.ts` và thư mục `canvas/` vào `s../../services/livechat/`.
- [x] **3.4. Phân nhóm Services Web Backend**:
  - [x] Di chuyển `ViewerManagerService.ts` vào `s../../services/web/`.
- [x] **3.5. Cập nhật `s../../services/index.ts`** để re-export toàn bộ services từ các module con.

---

### Giai đoạn 4: Chuẩn hóa Commands, Interactions & Events
- [ ] **4.1. Phân loại rõ ràng Commands**:
  - Tách nhóm lệnh in-game thuần túy (`HighwayCommand`, `GotoCommand`, `StopCommand`) vào `commands/ingame/`.
  - Tách nhóm lệnh Discord chuyên sâu vào `commands/discord/`.
  - Nhóm lệnh đa nền tảng (`JoinDate`, `Seen`, `Stats`, `Kill`, `Ping`, `Tps`) đặt trong `commands/shared/` hoặc giữ nguyên đăng ký qua 2 Manager.
- [ ] **4.2. Chuẩn hóa Events**:
  - Đổi tên `events/client` thành `events/discord` cho đồng bộ với `events/mineflayer`.
- [ ] **4.3. Cập nhật đường dẫn import trong Interactions**:
  - Cập nhật các button handler (`deathVerification`, `messageClassifier`) trỏ đúng vào services/utils mới.

---

### Giai đoạn 5: Kiểm Thử Toàn Diện & Dọn Dẹp (Validation & Cleanup)
- [ ] **5.1. Chạy TypeScript Compiler Check (`tsc --noEmit`)**:
  - Đảm bảo 100% không có lỗi type hoặc gãy đường dẫn import.
- [ ] **5.2. Kiểm tra Test Run Bot**:
  - Kiểm tra bot kết nối Minecraft (`AntiAfk`, `AutoEat`, `Pathfinder`).
  - Kiểm tra Discord LiveChat gửi tin nhắn render Canvas.
  - Kiểm tra Death Parser và Button Verification.
- [ ] **5.3. Dọn dẹp các đường dẫn import cũ (Refactor imports)**:
  - Cập nhật trực tiếp đường dẫn import ở từng file về namespace mới để code sạch sẽ và rõ ràng.

---

## 5. Kế Hoạch Thực Hiện Khi Được Duyệt (Execution Strategy)

1. **Thứ tự thực hiện an toàn nhất**:
   - `Typings` -> `Utils` -> `Services` -> `Commands/Interactions` -> `Cleanup`.
2. **Quy tắc tuyệt đối**:
   - Sau mỗi bước phân nhóm, luôn chạy `npm run build` hoặc `npx tsc --noEmit` để đảm bảo hệ thống luôn ở trạng thái xanh (compile thành công).
   - Không sửa đổi logic bên trong code khi đang chuyển đổi vị trí file (chỉ đổi đường dẫn import).
