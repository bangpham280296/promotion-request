# Tính năng: Promotion Request System

> Cập nhật lần cuối: 2026-06-03

---

## 1. Tổng quan

Hệ thống quản lý **Promotion Request** gồm các tính năng chính:
- **Create Request** — nhân viên tạo yêu cầu khuyến mãi mới
- **History Request** — xem lại + chỉnh sửa + export Excel các request đã tạo
- **Dashboard (Admin)** — admin xem tất cả request, đổi trạng thái duyệt/từ chối
- **Item Management** — quản lý danh sách items: phân loại theo category, lọc, phân trang, chỉnh sửa
- **Authentication** — đăng nhập, đăng ký, quên/reset password, auto-logout

Dữ liệu lưu vào **Supabase** gồm các bảng: `requests`, `promotiondetail`, `status`, `items`, `category`, `employees`, `department`.

---

## 2. Cấu trúc File

```
src/app/(admin)/(others-pages)/
  ├── (create-request)/request/page.tsx     ← Create Request page
  ├── history-request/page.tsx              ← History Request page
  ├── product/item/page.tsx                 ← Item Management page
  ├── profile/page.tsx                      ← User Profile page
  └── calendar/page.tsx                     ← Calendar page

src/app/(full-width-pages)/(auth)/
  ├── signin/page.tsx
  ├── signup/page.tsx
  ├── forgotpassword/page.tsx
  └── resetpassword/page.tsx

src/app/api/
  ├── auth/send-temp-password/route.ts      ← API gửi temp password qua email
  └── notify-promotions/route.ts            ← Cron job: Telegram notification

src/components/form/form-request/           ← Components cho Create Request
  ├── request.tsx                           ← RequestInputs: form header
  ├── requestdetail.tsx                     ← RequestDetailTable: bảng items
  ├── RequestDetailModal.tsx                ← Modal Add/Edit item
  ├── ComboDescriptionTable.tsx             ← Sub-table nhập combo items
  ├── ItemPickerModal.tsx                   ← Modal tìm & chọn item (fetch từ Supabase)
  └── dataItem.ts                           ← Static data legacy (không còn dùng)

src/components/history-request/             ← Components cho History Request
  ├── RequestViewModal.tsx                  ← Modal xem + chỉnh sửa + export request
  ├── EditItemModal.tsx                     ← Modal edit item
  ├── ComboDescriptionTable.tsx             ← Clone của form-request version
  ├── ItemPickerModal.tsx                   ← Modal tìm & chọn item
  └── exportRequestToExcel.ts              ← Hàm export Excel (ExcelJS)

src/components/tables/
  ├── BasicTableOne.tsx                     ← Dashboard table (admin)
  ├── AdminRequestViewModal.tsx             ← Modal xem request cho admin
  └── Pagination.tsx                        ← Pagination component dùng chung

src/components/(product)/item/
  ├── ItemTable.tsx                         ← Bảng items: pagination + search + category filter
  └── ItemEditModal.tsx                     ← Modal edit price, category, status, itempicker

src/components/auth/
  ├── SignInForm.tsx
  ├── SignUpForm.tsx
  ├── ForgotPasswordForm.tsx
  └── ResetPasswordForm.tsx

src/components/user-profile/
  ├── UserInfoCard.tsx
  ├── UserMetaCard.tsx
  └── UserAddressCard.tsx

src/components/form/
  ├── Select.tsx                            ← Custom dropdown (div-based, 5 visible items, scrollable)
  ├── MultiSelect.tsx                       ← Multi-select dropdown (div-based)
  ├── Label.tsx                             ← Form label component
  ├── input/InputField.tsx                  ← Text/number input
  ├── input/Checkbox.tsx
  ├── input/Radio.tsx
  └── input/TextArea.tsx

src/hooks/
  ├── useRequest.ts                         ← Dashboard: fetch all + add + edit + updateStatus
  ├── useUserRequests.ts                    ← History: fetch by user + edit
  ├── useItems.ts                           ← Items: useItems, useAllItems, useCategories, useUpdateItem
  ├── useProfile.ts                         ← Lấy thông tin user + role
  ├── useAuth.ts                            ← Auth state, login, logout, change password
  ├── useModal.ts                           ← Simple modal open/close state
  ├── useAutoLogout.ts                      ← Auto-logout sau 20 phút không hoạt động
  └── useGoBack.ts                          ← Navigate back hoặc về home

public/templates/
  └── request-template.xlsx                ← Template Excel gốc
```

---

## 3. Database Schema (Supabase)

### Bảng `category` (Lookup)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | int (PK) | Primary key |
| `Description` | text | Tên category (vd: Burger, Combo, Beverage) |

### Bảng `items` (Master Data)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | int (PK, auto) | Primary key |
| `itemcode` | text | Mã item |
| `itemname` | text | Tên item |
| `price` | numeric | Giá tham khảo |
| `itempicker` | boolean | `true` = hiển thị trong ItemPicker combo |
| `status` | int | `1` = active, `2` = inactive |
| `category` | int (FK) | FK → `category.id` |

> - `itempicker = true` → item xuất hiện trong danh sách chọn khi tạo combo.
> - `status = 2` → item bị inactive nhưng vẫn hiện trong trang Item Management.
> - `category` dùng để lọc/phân loại item trong ItemTable.

### Bảng `requests` (Header)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `reqid` | int (PK, auto) | Primary key, tự tăng |
| `requestcode` | text | Mã request — **do DB function tự tạo**, UI chỉ preview |
| `promotionname` | text | Tên chương trình khuyến mãi |
| `startdate` | date | Ngày bắt đầu |
| `enddate` | date | Ngày kết thúc |
| `createdate` | timestamptz | Ngày giờ tạo — lưu giờ Việt Nam dạng `+07:00` |
| `department` | int (FK) | FK → `department.id` |
| `requester` | text (FK) | FK → `employees.user_id` |
| `stt` | int (FK) | FK → `status.id`, default = 1 (pending) |
| `updateat` | timestamptz | Thời gian chỉnh sửa — set từ app khi UPDATE |

> **Lưu ý tên cột:** Cột trạng thái đặt tên `stt` (không phải `status`) để tránh trùng với tên bảng `status` khi Supabase resolve FK.

### Bảng `promotiondetail` (Detail)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `reqdtlid` | int (PK, auto) | Primary key |
| `reqid` | int (FK) | FK → `requests.reqid` |
| `itemcode` | text | Mã item/combo |
| `itemname` | text | Tên item/combo |
| `description` | text | Combo: `"code\|name\|unitPrice (qty) + ..."` |
| `itemtype` | text | `'item'` / `'combo'` / `'discount'` |
| `discount` | text | `'yes'` / `'no'` / null |
| `price` | numeric | Giá đề xuất của combo (do user nhập) |
| `startdate` | date | Ngày áp dụng riêng |
| `enddate` | date | Ngày kết thúc riêng |
| `servicetype` | text | Dine-in, Delivery... |
| `notes` | text | Ghi chú |
| `updateat` | timestamptz | Thời gian cập nhật |

### Bảng `status` (Lookup)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | int (PK) | 1 = pending, 2 = approved, 3 = rejected |
| `name` | text | `'pending'` / `'approved'` / `'rejected'` |
| `description` | text | Mô tả trạng thái |

> RLS của bảng `status` cần có policy SELECT cho `authenticated` hoặc tắt RLS (bảng lookup tĩnh).

---

## 4. Format Description (Combo)

### Separator quy ước

| Separator | Ý nghĩa |
|---|---|
| ` + ` | Phân cách **component** — các thành phần khác nhau của combo |
| ` OR ` | Phân cách **alternative** — các lựa chọn thay thế trong cùng 1 thành phần |

### Format theo tầng

| Tầng | Format | Ví dụ |
|---|---|---|
| UI internal | `code\|name\|qty\|price\|unitPrice` — nhóm join ` OR `, component join ` + ` | `300001\|Burger\|1\|56000\|56000 OR PASTA\|Mì Ý\|1\|45000\|45000 + 700055\|Pepsi\|1\|16000\|16000` |
| DB (`toDBDescription()`) | `code\|name\|unitPrice (qty)` — cùng separator | `300001\|Burger\|56000 (1) OR PASTA\|Mì Ý\|45000 (1) + 700055\|Pepsi\|16000 (1)` |
| Hiển thị (`DescriptionCell`) | `• code - name (qty)` / `OR code - name (qty)` | `• 300001 - Burger (1)` |
| Excel | `qty name (code)` — giữ ` OR ` | `1 Burger (300001) OR 1 Mì Ý (PASTA) + 1 Pepsi (700055)` |

> **DB format lưu `unitPrice`, không lưu `totalPrice`.**

### Backward compatibility

| Format đọc được | Segments | Xử lý |
|---|---|---|
| Internal mới (với OR) | 5+ mỗi alternative | parse từng part sau khi split ` OR ` |
| Internal mới (không OR) | 5+ | `code\|name\|qty\|price\|unitPrice` |
| Internal cũ (không có unitPrice) | 4 | derive `unitPrice = Math.round(totalPrice / qty)` |
| DB mới | 3 + `(qty)` | parse `unitPrice`, tính `price = unitPrice × qty` |
| DB cũ (legacy) | 2 | `code\|name (qty)` — không có giá |

---

## 5. ComboDescriptionTable — Cấu trúc bảng

### Columns

| Cột | Loại | Mô tả |
|---|---|---|
| No. | Label | Số thứ tự component, dòng alternative hiển thị badge **OR** |
| Item Code | Input + Picker | Nhập tay hoặc chọn từ ItemPicker |
| Item Name | Input | Nhập tay hoặc fill từ ItemPicker |
| Unit Price | Input | Đơn giá — fill từ picker hoặc nhập tay |
| Qty | Input | Số lượng, max tổng 10 |
| Total Price | Label | `= unitPrice × qty`, tự động tính |
| `+OR` | Button | Thêm alternative vào component hiện tại |
| (delete) | Button | Xóa dòng |

### Data structure

```typescript
type ComboItem = {
    id: number;
    groupId: number;   // items cùng groupId = alternatives của 1 component
    itemcode: string;
    itemname: string;
    unitPrice: number | "";
    qty: number | "";
    price: number | "";
};
```

### Logic tính tổng với OR

```typescript
// totalQty: chỉ đếm qty của alternative đầu tiên mỗi group
const totalQty = groups.reduce((sum, g) => sum + (Number(g[0].qty) || 0), 0);

// totalPrice: max price per group (conservative validation)
const totalPrice = groups.reduce((sum, g) => {
    return sum + Math.max(...g.map(item => Number(item.price) || 0));
}, 0);
```

---

## 6. Create Request — Luồng Submit

```
page.tsx
  ├── Validate: promotionname, startdate, enddate, details ≥ 1
  ├── mappedReq = { promotionname, startdate, enddate,
  │                 createdate: VN datetime (+07:00),
  │                 department: profile.department.id,
  │                 requester: profile.user_id,
  │                 stt: 1 }
  ├── mappedDetails = details.map(d => { ..., itemtype, description: toDBDescription() })
  └── addRequest(mappedReq, mappedDetails)
        ├── INSERT requests → lấy reqid
        └── INSERT promotiondetail[] với reqid
```

### Auto-generate Request Code (preview)

Format: `REQ-{YY}{MM}-{DEPTCODE}-{XXXX}`

- Preview trong `request.tsx`, không lưu vào state
- `requestcode` thực do DB function tạo khi INSERT

### Date Created

- **Hiển thị UI**: chỉ ngày (`type="date"`, Vietnam time)
- **Lưu DB**: full datetime Vietnam `new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T") + "+07:00"`

---

## 7. History Request — Edit Flow

### `useUserRequests.ts` — `editRequest(reqid, header, details, originalDetails)`

```
1. UPDATE requests SET promotionname, startdate, enddate, updateat WHERE reqid
2. Phân loại details:
   - details có reqdtlid   → UPDATE promotiondetail SET ... WHERE reqdtlid
   - details không reqdtlid → INSERT promotiondetail (item mới thêm khi edit)
   - originalDetails có reqdtlid nhưng không còn trong details → DELETE WHERE reqdtlid
3. fetchRequests() để refresh danh sách
```

---

## 8. Dashboard — Admin Features

### Phân quyền

- Cột `role` trong bảng `employees` — giá trị `'admin'` xác định admin
- `useProfile()` trả về `profile.role`
- Admin thấy thêm: cột **Status** + cột **Action** (EyeIcon)

### `AdminRequestViewModal.tsx`

**View-only** — admin không thể edit nội dung request. Chức năng:
1. Xem thông tin đầy đủ
2. Đổi trạng thái — nút fetch động từ bảng `status`
3. Export to Excel

```typescript
// Status buttons — auto-populated from status table
supabase.from("status").select("id, name, description").order("id")
```

### `useRequest.ts`

```typescript
fetchRequests()                        // GET ALL với full joins
addRequest()                           // INSERT request + details
editRequest(reqid, ...)                // UPDATE header + 3-way detail sync
updateRequestStatus(reqid, sttId)      // UPDATE stt (admin only)
removeRequest(reqid)                   // DELETE
```

> **Quan trọng:** `editRequest` dùng `reqid` (đúng PK), không phải `id`.

---

## 9. Export to Excel

### Package

```bash
npm install exceljs
```

### Cell mapping (header)

| Cell Excel | Giá trị |
|---|---|
| `B4` | `request.requestcode` |
| `K4` | Ngày tạo (Vietnam time) |
| `E6` | `request.promotionname` |
| `B8` | `request.employees.fullname` |
| `E9` | `request.department.deptname` |
| `J9` | `request.stt.name` |

### Data rows

- Bắt đầu tại **Row 11**
- Description format: `"code|name|unitPrice (qty)"` → `"qty name (code)"`

---

## 10. Item Management

### Trang: `/product/item`

**Server-side pagination + search + category filter:**

```typescript
// useAllItems hook
fetchAllItems(page: number, query: string, categoryId: number | null = null)

supabase.from("items")
  .select("id, itemcode, itemname, price, status, itempicker, category(id, Description)", { count: "exact" })
  .order("itemcode")
  .range(from, to)
  .or(`itemcode.ilike.%q%,itemname.ilike.%q%`)  // khi có search
  .eq("category", categoryId)                     // khi có filter
```

- 50 items/trang
- Search debounce 300ms
- Filter by category (server-side, cùng query với search)

### Columns của ItemTable

| Cột | Mô tả |
|---|---|
| No. | Số thứ tự (theo trang) |
| Item Code | Mã item (font mono) |
| Item Name | Tên item |
| Category | `category.Description` — hiện `"—"` nếu chưa gán |
| Price (VND) | Giá, format vi-VN |
| Status | Badge Active/Inactive |
| Item Picker | Checkbox read-only |
| Action | PencilIcon → mở ItemEditModal |

### Toolbar ItemTable

```
[ Search by code or name... ] [ Filter by category ▼ ]  1,234 items
```

- Search + Category filter hoạt động đồng thời, server-side

### `ItemEditModal.tsx` — Các trường chỉnh sửa

| Field | Component | Mô tả |
|---|---|---|
| Price (VND) | `Input` (number, min="0") | Giá tham khảo |
| Category | `Select` (custom dropdown) | Fetch từ bảng `category`, lưu FK id |
| Status | `Select` | Active (1) / Inactive (2) |
| Item Picker | checkbox | `true` = hiện trong ItemPicker combo |

```typescript
// updateItem trong useUpdateItem hook
supabase.from("items")
  .update({ status, itempicker, price, category: categoryId })
  .eq("id", id)
```

> - Category dropdown dùng `key={cat-${item?.id}}` để force remount khi đổi item (vì `Select` là uncontrolled component dùng `defaultValue`).
> - `"none"` là sentinel value cho "không có category" → lưu `null` vào DB.

---

## 11. Hooks — Tổng hợp

| Hook | Export | Dùng ở | Chức năng chính |
|---|---|---|---|
| `useItems` | default | ItemPickerModal | fetch `itempicker = true` cho combo picker |
| `useAllItems(itemsPerPage)` | named | ItemTable | fetch all, pagination + search + category filter |
| `useCategories` | named | ItemTable, ItemEditModal | fetch toàn bộ bảng `category` |
| `useUpdateItem` | named | ItemEditModal | update price, status, itempicker, category |
| `useRequest` | named | Dashboard | fetch all + add + edit + updateStatus + remove |
| `useUserRequests(userId)` | named | History Request | fetch by user + edit |
| `useProfile` | named | Nhiều nơi | user info + role + department |
| `useAuth` | named | Auth pages | login, logout, changePassword, auth state |
| `useModal(initial)` | named | Nhiều nơi | open/close/toggle modal state |
| `useAutoLogout(opts)` | named | Root layout | auto-logout sau 20 phút không hoạt động |
| `useGoBack` | named | Nhiều nơi | navigate back hoặc về home |

### `useItems.ts` — 4 hooks trong 1 file

```typescript
// Cho ItemPicker combo — chỉ item có itempicker = true
export default function useItems() { ... }

// Fetch all items cho Item Management (server-side pagination)
export function useAllItems(itemsPerPage: number) {
  // fetchAllItems(page, query, categoryId?) — component tự gọi
}

// Fetch toàn bộ category để build dropdown
export function useCategories() {
  supabase.from("category").select("id, Description").order("Description")
}

// Update item: price, status, itempicker, category FK
export function useUpdateItem() {
  // updateItem(id, { status, itempicker, price, category }) → Promise<boolean>
}
```

---

## 12. Select.tsx — Custom Dropdown Component

`Select.tsx` là custom div-based dropdown (không dùng native `<select>`).

### API

```typescript
interface SelectProps {
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;   // uncontrolled — chỉ set lần đầu mount
}
```

### Tính năng

- Mở xuống dưới (`absolute top-full`)
- Hiển thị tối đa **5 items** (`maxHeight = 5 × 40px`)
- Thanh cuộn khi > 5 items (`overflow-y: auto`)
- `ChevronDownIcon` tích hợp sẵn bên trong
- Item đang chọn highlight màu brand

### Lưu ý dùng với dynamic data (modal)

Vì `Select` là **uncontrolled** (dùng `useState(defaultValue)`), khi mở modal cho item khác cần dùng `key` để force remount:

```tsx
<Select
  key={`cat-${item?.id}`}        // force remount khi đổi item
  options={categoryOptions}
  defaultValue={categoryId != null ? String(categoryId) : "none"}
  onChange={(val) => setCategoryId(val === "none" ? null : Number(val))}
/>
```

### Pattern dùng đúng (theo SelectInputs.tsx)

`Select.tsx` dùng `appearance-none pr-11` — icon chevron đã tích hợp bên trong component. Không cần wrapper bên ngoài.

---

## 13. Validation Rules

### Header Submit (page.tsx)
1. `promotionname` không trống
2. `startdate` không trống
3. `enddate` không trống
4. `details.length > 0`

### Combo (handleConfirm)
1. Ít nhất **2 items**
2. Tất cả items có `itemcode` + `itemname`
3. `price` combo ≤ tổng giá các items

---

## 14. Reset Password Feature

### 2 Flow

| Flow | Route | Cách hoạt động |
|---|---|---|
| Supabase Recovery Link | `/resetpassword` | Gửi link → user click → nhập password mới |
| Temporary Password | `/forgotpassword` | Hệ thống tự tạo password → gửi qua email M365 |

**Flow 2 (Temporary Password) là flow chính đang dùng.**

### Flow 2: Temporary Password

```
User vào /forgotpassword
  → Nhập email → POST /api/auth/send-temp-password
  → API tìm user trong Supabase Auth theo email
  → Tạo password ngẫu nhiên 8 ký tự (loại trừ 0/O, 1/l/I)
  → supabaseAdmin.auth.admin.updateUserById(userId, { password })
  → Gửi email qua Nodemailer + M365 SMTP
  → User nhận email → đăng nhập luôn
```

### Env Vars (`.env.local`)

```env
SUPABASE_SERVICE_ROLE_KEY=...       # Supabase Dashboard → API → service_role
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=bangpt@kfcvietnam.com.vn
SMTP_PASS=...                        # App Password M365
SMTP_FROM=bangpt@kfcvietnam.com.vn
```

> **M365 + MFA**: phải dùng **App Password**, tạo tại `myaccount.microsoft.com → Security info → App password`.

---

## 15. Auto-Notification (Telegram)

### Route: `GET /api/notify-promotions`

- Protected bằng `Bearer token` (env var)
- Fetch các promotion có `startdate = ngày mai`
- Gửi Telegram message danh sách items kèm ngày, giá, discount
- Chạy bằng cron job bên ngoài (schedule call API hàng ngày)

---

## 16. Known Notes

- **Supabase row limit**: mặc định 1,000 rows/query — dùng `.range()` + `count: "exact"`.
- **Supabase `timestamptz`** luôn hiển thị UTC trong dashboard — đây là bình thường.
- **`updateat`** trong `promotiondetail` được set từ app khi INSERT/UPDATE (không dùng trigger).
- **`dataItem.ts`** vẫn còn trong codebase nhưng không còn dùng — có thể xóa.
- **Admin status buttons** fetch động từ bảng `status` — thêm status mới vào DB là đủ, không cần sửa code.
- **ExcelJS** thay SheetJS để hỗ trợ cell styling đầy đủ.
- **OR alternatives**: separator ` OR ` phân biệt với ` + ` — không dùng ký tự khác.
- **totalQty với OR**: chỉ tính qty alternative đầu tiên mỗi group.
- **`supabaseAdmin`** dùng `SUPABASE_SERVICE_ROLE_KEY` — chỉ dùng server-side (API Routes).
- **Supabase join type inference**: khi join FK với `category(id, Description)`, TypeScript infer là array nhưng runtime trả về object — cần cast `data as unknown as AllItem[]`.
- **`Select` component là uncontrolled** — dùng `key={item?.id}` khi cần reset theo item.
- **Category filter** là server-side, kết hợp được với search text cùng lúc.
