# Tính năng: Promotion Request System

> Cập nhật lần cuối: 2026-05-30

---

## 1. Tổng quan

Hệ thống quản lý **Promotion Request** gồm 4 tính năng chính:
- **Create Request** — nhân viên tạo yêu cầu khuyến mãi mới
- **History Request** — xem lại + chỉnh sửa + export Excel các request đã tạo
- **Dashboard (Admin)** — admin xem tất cả request, đổi trạng thái duyệt/từ chối
- **Item Management** — quản lý danh sách items dùng trong ItemPicker

Dữ liệu lưu vào **4 bảng Supabase**: `requests`, `promotiondetail`, `status`, `items`.

---

## 2. Cấu trúc File

```
src/app/(admin)/(others-pages)/
  ├── (create-request)/request/page.tsx     ← Create Request page
  ├── history-request/page.tsx              ← History Request page
  └── product/item/page.tsx                 ← Item Management page (admin)

src/components/form/form-request/           ← Components cho Create Request
  ├── request.tsx                           ← RequestInputs: form header
  ├── requestdetail.tsx                     ← RequestDetailTable: bảng items
  ├── RequestDetailModal.tsx                ← Modal Add/Edit item
  ├── ComboDescriptionTable.tsx             ← Sub-table nhập combo items
  ├── ItemPickerModal.tsx                   ← Modal tìm & chọn item (fetch từ Supabase)
  └── dataItem.ts                           ← Static data legacy (không còn dùng cho picker)

src/components/history-request/             ← Components cho History Request
  ├── RequestViewModal.tsx                  ← Modal xem + chỉnh sửa + export request
  ├── EditItemModal.tsx                     ← Modal edit item (giống RequestDetailModal)
  ├── ComboDescriptionTable.tsx             ← Clone của form-request version
  ├── ItemPickerModal.tsx                   ← Modal tìm & chọn item (fetch từ Supabase)
  └── exportRequestToExcel.ts              ← Hàm export Excel (ExcelJS)

src/components/tables/
  ├── BasicTableOne.tsx                     ← Dashboard table (tất cả request, admin action)
  ├── AdminRequestViewModal.tsx             ← Modal xem request cho admin (view-only + status)
  └── Pagination.tsx                        ← Pagination component dùng chung

src/components/product/item/
  ├── ItemTable.tsx                         ← Bảng items server-side pagination + search
  └── ItemEditModal.tsx                     ← Modal edit status + itempicker

src/hooks/
  ├── useRequest.ts                         ← Dashboard: fetch all + addRequest + editRequest + updateRequestStatus
  ├── useUserRequests.ts                    ← History: fetch by user + editRequest
  ├── useItems.ts                           ← Items: useItems() cho picker + useAllItems() cho management
  └── useProfile.ts                         ← Lấy thông tin user + role đăng nhập

public/templates/
  └── request-template.xlsx                ← Template Excel gốc (giữ style/format)
```

---

## 3. Database Schema (Supabase)

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

> - RLS của bảng `status` cần có policy SELECT cho `authenticated` hoặc tắt RLS (bảng lookup tĩnh).
> - Admin có thể thêm trạng thái mới vào bảng — `AdminRequestViewModal` fetch động, tự hiển thị nút mới.

### Bảng `items` (Master Data)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | int (PK, auto) | Primary key |
| `itemcode` | text | Mã item |
| `itemname` | text | Tên item |
| `price` | numeric | Giá tham khảo |
| `itempicker` | boolean | `true` = hiển thị trong ItemPicker combo |
| `status` | int | `1` = active, `0` = inactive |

> - `itempicker = true` → item xuất hiện trong danh sách chọn khi tạo combo.
> - `status = 0` → item bị ẩn khỏi ItemPicker nhưng vẫn hiện trong trang Item Management.
> - Item mới chưa có trong catalog: user nhập tay trong ComboDescriptionTable — không cần thêm vào bảng trước.

### Query khi fetch History Request

```typescript
supabase.from("requests").select(`
  *,
  promotiondetail(*),
  department(deptname),
  employees:employees!request_requester_fkey (fullname),
  stt:status(*)
`).eq("requester", userId)
```

### Query khi fetch Dashboard (admin — tất cả request)

```typescript
supabase.from("requests").select(`
  *,
  promotiondetail(*),
  department(deptname),
  employees:employees!request_requester_fkey (fullname),
  stt:status(*)
`).order("reqid", { ascending: false })
```

---

## 4. Format Description (Combo)

### Separator quy ước

| Separator | Ý nghĩa |
|---|---|
| ` + ` | Phân cách **component** — các thành phần khác nhau của combo |
| ` OR ` | Phân cách **alternative** — các lựa chọn thay thế trong cùng 1 thành phần |

### Format theo tầng

| Tầng | Format | Ví dụ (Burger hoặc Mì Ý + Pepsi) |
|---|---|---|
| UI internal | `code\|name\|qty\|price\|unitPrice` — nhóm join ` OR `, component join ` + ` | `300001\|Burger\|1\|56000\|56000 OR PASTA\|Mì Ý\|1\|45000\|45000 + 700055\|Pepsi\|1\|16000\|16000` |
| DB (`toDBDescription()`) | `code\|name\|unitPrice (qty)` — cùng separator | `300001\|Burger\|56000 (1) OR PASTA\|Mì Ý\|45000 (1) + 700055\|Pepsi\|16000 (1)` |
| Hiển thị (`DescriptionCell`) | `• code - name (qty)` / `OR code - name (qty)` | `• 300001 - Burger (1)` → `OR PASTA - Mì Ý (1)` |
| Excel | `qty name (code)` — giữ ` OR ` | `1 Burger (300001) OR 1 Mì Ý (PASTA) + 1 Pepsi (700055)` |

> **DB format lưu `unitPrice`, không lưu `totalPrice`.**  
> Lý do: `totalPrice = unitPrice × qty` tính lại chính xác 100%. Lưu `totalPrice` phải tính ngược có thể mất chính xác khi làm tròn.

### `toDBDescription()` — xử lý OR

```typescript
description.split(" + ")       // tách component
  .map(groupStr =>
    groupStr.split(" OR ")     // tách alternative trong mỗi component
      .map(part => `${code}|${name}|${unitPrice} (${qty})`)
      .join(" OR ")
  )
  .join(" + ")
```

### Backward compatibility

| Format đọc được | Segments | Xử lý |
|---|---|---|
| Internal mới (với OR) | 5+ mỗi alternative | parse từng part sau khi split ` OR ` |
| Internal mới (không OR) | 5+ | `code\|name\|qty\|price\|unitPrice` |
| Internal cũ (không có unitPrice) | 4 | derive `unitPrice = Math.round(totalPrice / qty)` |
| DB mới | 3 + `(qty)` | parse `unitPrice`, tính `price = unitPrice × qty` |
| DB cũ (legacy) | 2 | `code\|name (qty)` — không có giá |

> Data cũ không có ` OR ` vẫn parse đúng — `split(" OR ")` trả về 1 phần tử, không ảnh hưởng.

---

## 5. ComboDescriptionTable — Cấu trúc bảng

**Áp dụng cho cả 2 file:** `form-request/ComboDescriptionTable.tsx` và `history-request/ComboDescriptionTable.tsx`

### Columns

| Cột | Loại | Mô tả |
|---|---|---|
| No. | Label | Số thứ tự **component** (group), dòng alternative hiển thị badge **OR** |
| Item Code | Input + Picker | Nhập tay hoặc chọn từ ItemPicker |
| Item Name | Input | Nhập tay hoặc fill từ ItemPicker |
| Unit Price | Input (luôn editable) | Đơn giá — fill từ picker hoặc nhập tay |
| Qty | Input | Số lượng, max tổng 10 (tính theo component, không tính alternative) |
| Total Price | Label (không nhập) | `= unitPrice × qty`, tự động tính |
| `+OR` | Button | Thêm alternative vào component hiện tại — chỉ hiện ở dòng đầu của mỗi component |
| (delete) | Button | Xóa dòng |

### OR Alternatives — Khái niệm

Một **component** = 1 vị trí trong combo. Mỗi component có thể có nhiều **alternatives** (lựa chọn thay thế). Khách hàng chọn 1 trong các alternatives đó cho vị trí đó.

```
Component 1: Burger Zinger  ← alternative 1
         OR: Mì Ý           ← alternative 2
Component 2: Pepsi (M)
```

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
const groups = getGroups(rows); // nhóm theo groupId

// totalQty: chỉ đếm qty của alternative đầu tiên mỗi group (alternatives không cộng dồn)
const totalQty = groups.reduce((sum, g) => sum + (Number(g[0].qty) || 0), 0);

// totalPrice: dùng max price của mỗi group (conservative — dùng cho validation combo price)
const totalPrice = groups.reduce((sum, g) => {
    return sum + Math.max(...g.map(item => Number(item.price) || 0));
}, 0);
```

### Validation (handleConfirm trong parent)

```typescript
const comboItems = description.split(" + ").filter(p => p.includes("|"));
// comboItems.length = số components (groups) — không tính alternatives riêng lẻ
if (comboItems.length < 2) → error "Combo must have at least 2 items"

// hasEmpty: check từng alternative trong mỗi component
const hasEmpty = comboItems.some(groupStr =>
    groupStr.split(" OR ").some(part => {
        const [code, name] = part.trim().split("|");
        return !code?.trim() || !name?.trim();
    })
);
```

### Footer info

```
2 components (with alternatives)   Total: 72,000
```

> **Item mới chưa có trong catalog**: user nhập thẳng `itemcode` + `itemname` vào ô text. Không có validation cho item không tồn tại trong bảng `items` — đây là thiết kế cố ý.

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

### `RequestViewModal.tsx` (history-request)

- `originalDetails` state: snapshot lúc modal mở, không thay đổi khi user edit
- `handleSave`: map details (giữ `reqdtlid`) → gọi `onSave` → toast success/error
- `mapDetailsFromRequest`: map `itemtype`, `_descriptionFull`, `reqdtlid` từ DB
- `formatVNDateTime`: convert UTC từ DB → hiển thị giờ Việt Nam
- **Không có props admin** — file này chỉ dành cho user thường

---

## 8. Dashboard — Admin Features

### Phân quyền

- Cột `role` trong bảng `employees` — giá trị `'admin'` xác định admin
- `useProfile()` trả về `profile.role` — component tính `isAdmin = profile?.role === "admin"`
- Admin thấy thêm: cột **Status** (tất cả request) + cột **Action** (EyeIcon)

### `BasicTableOne.tsx` — Dashboard table

| Cột | Hiển thị với | Mô tả |
|---|---|---|
| Request code | Tất cả | Mã request |
| Promotion name | Tất cả | Tên chương trình |
| Requester & Department | Tất cả | Người tạo + phòng ban |
| Start date | Tất cả | Ngày bắt đầu + badge countdown |
| End date | Tất cả | Ngày kết thúc + badge countdown |
| Status | Tất cả | Badge pending/approved/rejected |
| Action | **Admin only** | EyeIcon → mở AdminRequestViewModal |

### `AdminRequestViewModal.tsx`

**View-only** — admin không thể edit nội dung request. Chức năng:

1. **Xem thông tin** — request code, promotion name, requester, department, created/start/end date, bảng promotion items
2. **Đổi trạng thái** — nút fetch động từ bảng `status` (thêm status mới vào DB → nút tự xuất hiện)
3. **Export to Excel** — gọi `exportRequestToExcel()`

```typescript
// Status buttons — auto-populated from status table
useEffect(() => {
  supabase.from("status").select("id, name, description").order("id")
  → setStatusOptions(data)
}, []);
```

Nút active highlight màu theo trạng thái:
- `pending` → vàng
- `approved` → xanh
- `rejected` → đỏ
- Các nút còn lại → outline

### `useRequest.ts` — Hooks cho Dashboard

```typescript
fetchRequests()          // GET ALL với full joins (promotiondetail, stt, department, employees)
addRequest()             // INSERT request + details
editRequest(reqid, ...)  // UPDATE header + 3-way detail sync (dùng reqid, không phải id)
updateRequestStatus(reqid, sttId)  // UPDATE requests SET stt = sttId (admin only)
removeRequest(reqid)     // DELETE
```

> **Lưu ý quan trọng:** `editRequest` trong `useRequest.ts` dùng `reqid` (đúng PK). Phiên bản cũ dùng `id` — sai.

---

## 9. Export to Excel

### Package

```bash
npm install exceljs
```

### File: `src/components/history-request/exportRequestToExcel.ts`

Hàm `async` — tạo workbook → fill values → apply style → download.

> Đã nâng cấp từ SheetJS lên **ExcelJS** để hỗ trợ cell styling (màu, border, font bold).

### Cell mapping (header)

| Cell Excel | Giá trị ghi vào |
|---|---|
| `B4` | `request.requestcode` |
| `K4` | Ngày tạo (format `vi-VN` Vietnam time) |
| `E6` | `request.promotionname` |
| `B8` | `request.employees.fullname` |
| `E9` | `request.department.deptname` |
| `J9` | `request.stt.name` |

### Data rows

- Bắt đầu tại **Row 11**
- Cột: Menu Items | Menu Name | Description | Family Group | Screen Display | Discount | Price | Effective Date | Expired Date | Scope | Note
- Description format: `"code|name|unitPrice (qty)"` → `"qty name (code)"`

### Tùy chỉnh export

- **Thay đổi layout/styling**: chỉnh `exportRequestToExcel.ts` (section `applyStyle`)
- **Thay đổi cell mapping / cột data**: chỉnh phần dynamic values + data rows
- Không cần đụng vào modal

---

## 10. Item Management

### Trang: `/product/item`

File: `src/app/(admin)/(others-pages)/product/item/page.tsx`  
Component: `src/components/product/item/ItemTable.tsx`

**Server-side pagination** — tránh giới hạn 1,000 rows của Supabase PostgREST:

```typescript
supabase.from("items")
  .select("id, itemcode, itemname, price, status, itempicker", { count: "exact" })
  .order("itemcode")
  .range(from, to)
  .or(`itemcode.ilike.%q%,itemname.ilike.%q%`)  // khi có search
```

- 50 items/trang
- Search debounce 300ms — query gửi lên Supabase, không filter client-side
- `count: "exact"` → totalCount hiển thị đúng số thực trong DB

### `ItemEditModal.tsx`

Admin chỉnh sửa 2 trường:
- **Status**: select `Active (1)` / `Inactive (2)`
- **Item Picker**: checkbox `Show in Item Picker`

```typescript
supabase.from("items").update({ status, itempicker }).eq("id", item.id)
```

---

## 11. Hooks — Tổng hợp

| Hook | Dùng ở | Chức năng chính |
|---|---|---|
| `useRequest.ts` | Dashboard | fetch all + add + edit + updateStatus |
| `useUserRequests.ts` | History Request | fetch by user + edit |
| `useItems` (default export) | ItemPickerModal | fetch `itempicker = true` cho combo picker |
| `useAllItems` (named export) | ItemTable | fetch all, server-side pagination + search |
| `useProfile.ts` | Nhiều nơi | Lấy user info + role |

### `useItems.ts` — 2 hooks trong 1 file

```typescript
// Cho ItemPicker combo — chỉ lấy item có itempicker = true
export default function useItems() {
  supabase.from("items").select("itemcode, itemname, price").eq("itempicker", true)
}

// Fetch all items cho trang Item Management (server-side)
export function useAllItems(itemsPerPage: number) {
  // Returns: { items, totalCount, loading, error, fetchAllItems }
  // fetchAllItems(page, query) — component tự gọi với debounce
}
```

**Không dùng lẫn nhau giữa các tính năng.**

---

## 12. Validation Rules

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

## 13. Known Notes

- **Supabase row limit**: mặc định 1,000 rows/query — dùng `.range()` + `count: "exact"` cho trang có nhiều data.
- **Supabase `timestamptz`** luôn hiển thị UTC trong dashboard — đây là bình thường, không sai.
- **`updateat`** trong `promotiondetail` được set từ app khi INSERT/UPDATE (không dùng trigger).
- **`dataItem.ts`** vẫn còn trong codebase nhưng không còn được dùng cho ItemPicker — có thể xóa sau.
- **Item mới chưa có trong catalog**: user nhập tay trong combo — đây là thiết kế cố ý. Không cần approval flow riêng cho item.
- **Admin status buttons** fetch động từ bảng `status` — thêm status mới vào DB là đủ, không cần sửa code.
- **ExcelJS** thay SheetJS để hỗ trợ cell styling đầy đủ.
- **OR alternatives**: separator ` OR ` phân biệt với ` + ` (component separator) — không dùng ký tự khác để tránh nhầm lẫn khi parse.
- **totalQty với OR**: chỉ tính qty của alternative đầu tiên mỗi group — alternatives là lựa chọn thay thế, không cộng dồn.
- **totalPrice với OR**: dùng max price per group cho validation — đảm bảo combo price không vượt ngay cả khi chọn option đắt nhất.
