# Tái Cấu Trúc Thư Mục Interactions Theo Kiến Trúc Flat Domain Files

> [!NOTE]
> Tài liệu này ghi nhận kết quả tái cấu trúc toàn bộ thư mục `src/interactions/` sang **Mô hình 3 File Phẳng Chuẩn PascalCase (Flat Domain Files)**, an toàn tuyệt đối cho môi trường Production.
> Trạng thái: **ĐÃ HOÀN THÀNH (Completed)**.

---

## 1. Kết Quả Tái Cấu Trúc

Toàn bộ thư mục `src/interactions/` đã được rút gọn xuống đúng **3 file phẳng**, đặt tên chuẩn PascalCase:

```text
src/interactions/
├── index.ts                  # Router trung tâm: Phân phối sự kiện theo customId prefix (~40 dòng)
├── DeathVerification.ts      # Gom toàn bộ: Buttons, Modals, Select Menus của Death Pattern (~400 dòng)
└── MessageClassifier.ts      # Gom toàn bộ: Buttons, Modals của Phân loại tin nhắn (~160 dòng)
```

---

## 2. Bản Đồ Gộp Code (Code Consolidation Mapping)

### 2.1. `DeathVerification.ts` (Prefixes: `death_*`, `select_death_*`)
Gom từ các file cũ:
- `buttons/deathVerification/handleDeathApprove.ts`
- `buttons/deathVerification/handleDeathDismiss.ts`
- `buttons/deathVerification/handleDeathEditModal.ts`
- `buttons/deathVerification/handleDeathResolveMob.ts`
- `buttons/deathVerification/handleDeathResolvePvp.ts`
- `buttons/deathVerification/handleDeathSwap.ts`
- `modals/handleEditDeathModal.ts`
- `modals/handleCreateDeathModal.ts`
- `selectMenus/handleCauseSelectMenu.ts`
- `selectMenus/handleScopeSelectMenu.ts`

### 2.2. `MessageClassifier.ts` (Prefixes: `classify_*`)
Gom từ các file cũ:
- `buttons/messageClassifier/handleClassifySystem.ts`
- `buttons/messageClassifier/handleClassifyDismiss.ts`
- `buttons/messageClassifier/handleClassifyDeathModal.ts`

---

## 3. Checklist Triển Khai (TODO Checklist)

- [x] **Giai đoạn 1: Tạo các file tương tác phẳng mới**
  - [x] Tạo `src/interactions/DeathVerification.ts`
  - [x] Tạo `src/interactions/MessageClassifier.ts`
  - [x] Cập nhật `src/interactions/index.ts`
  - [x] Xóa 13 files con và 3 routers cũ (`buttonRouter.ts`, `modalRouter.ts`, `selectMenuRouter.ts`)
  - [x] Kiểm tra typecheck `tsc` không có lỗi (Exit code: 0)
- [x] **Giai đoạn 2: Tối ưu logic nhận diện người chơi & Mob**
  - [x] Case-insensitive deduplication cho online players (`khang953` & `Khang953` -> 1 player duy nhất)
  - [x] Logic 1 player + Mob check (Auto `MOB` death pattern vs Gửi prompt duyệt lại)
- [x] **Giai đoạn 3: Kiểm thử toàn diện trên Production**
  - [x] `npx tsc --noEmit` build sạch 100%
