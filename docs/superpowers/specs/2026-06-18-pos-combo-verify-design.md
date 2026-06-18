# POS Combo Verify — Design Spec

**Date:** 2026-06-18  
**Author:** phamBx2  
**Status:** Approved

---

## 1. Overview

Tính năng cho phép admin kiểm tra xem các combo đã tạo trên POS có đúng với request mà user yêu cầu không. Việc verify được thực hiện theo yêu cầu (on-demand), chỉ dành cho admin.

**Hai điểm entry:**
1. **Product/Combo page** — verify tất cả combo đang hiển thị trong bảng
2. **Request Detail** — verify các item có `itemtype='combo'` trong một request cụ thể

---

## 2. Data Sources

### promotiondetail (Supabase)
Các field liên quan đến verify:

| Field | Vai trò |
|---|---|
| `reqdtlid` | Primary key — dùng làm unique identifier để map kết quả |
| `itemcode` | So khớp với `proid` trên POS |
| `itemname` | So sánh với `proname` trên POS |
| `startdate` | Hiển thị tham khảo — **không so sánh** |
| `enddate` | So sánh với `enddate` trên POS |
| `itemtype` | Lọc `= 'combo'` trong context Request Detail |

### POS REST API
Endpoint cấu hình qua env var `POS_COMBO_API_URL`.  
Trả về: `Array<{ proid: string, proname: string, startdate: string, enddate: string, active: 'Y' | 'N' }>`  
_(Có thể bổ sung thêm field sau)_

---

## 3. Match Logic

Một combo được coi là **`matched`** khi tất cả điều kiện sau đều đúng:

| Field | Điều kiện |
|---|---|
| `proid` | Tồn tại combo có `proid === itemcode` |
| `proname` | `proname === itemname` |
| `enddate` | `enddate` trên POS khớp với `enddate` trong DB |
| `active` | `active === 'Y'` |

**`startdate` chỉ hiển thị, không so sánh** — vì POS thường để null khi đang test trước khi chạy chính thức.

**Chuẩn hóa trước khi so sánh:**
- `proname` vs `itemname`: trim whitespace, so sánh exact (case-sensitive)
- `enddate`: normalize về `YYYY-MM-DD` trước khi so sánh — POS có thể trả về format khác

### Các trạng thái kết quả

| Status | Ý nghĩa |
|---|---|
| `matched` | Tìm thấy trên POS, tất cả field khớp, active=Y |
| `mismatch` | Tìm thấy trên POS nhưng ít nhất 1 field sai hoặc active=N |
| `not_found` | Không có combo nào trên POS có `proid === itemcode` |

### Xử lý trùng itemcode

Cùng `itemcode` có thể xuất hiện nhiều lần trong `promotiondetail` (gia hạn, tái sử dụng). Mỗi record được so sánh **độc lập** theo `reqdtlid` — không gộp, không lọc trùng. Kết quả phản ánh đúng từng phiên bản request.

---

## 4. API

### `POST /api/combos/pos-verify`

**Permission:** Admin only. Trả về `403` nếu không phải admin.

**Request body:**
```typescript
{
  combos: Array<{
    reqdtlid: number      // unique key để map response về đúng record
    itemcode: string      // so khớp với proid
    itemname: string      // so sánh với proname
    enddate: string | null
  }>
}
```

**Response:**
```typescript
{
  results: Array<{
    reqdtlid: number
    itemcode: string
    posStatus: 'matched' | 'mismatch' | 'not_found'
    differences: Array<{
      field: 'proname' | 'enddate' | 'active'
      requestValue: string
      posValue: string
    }>
  }>
  verifiedAt: string  // ISO timestamp
}
```

**Server flow:**
1. Verify admin session → 403 nếu không phải admin
2. Fetch `POS_COMBO_API_URL` → lấy toàn bộ combo POS
   - Nếu POS API lỗi hoặc không thể kết nối → trả về HTTP 502 với message rõ ràng
3. Với mỗi combo trong input:
   - Tìm POS combo có `proid === itemcode`
   - Nếu không tìm thấy → `not_found`
   - Nếu tìm thấy → so sánh `proname` (trim), `enddate` (normalize YYYY-MM-DD), `active`
   - Build danh sách `differences`
   - Status = `matched` nếu `differences.length === 0`, ngược lại `mismatch`
4. Trả về `results` + `verifiedAt`

---

## 5. UI

### 5.1 Product/Combo page (`ComboTable`)

**Nút Verify POS** (admin only): đặt ở header của table, cạnh các filter hiện có.

**Summary bar** (hiện sau khi verify xong):
```
✅ 8 matched  ❌ 2 mismatch  ⚠️ 1 not found
```

**Cột POS Status** thêm vào cuối table:
| Status | Badge |
|---|---|
| Chưa verify | — (trống) |
| matched | ✅ Matched (xanh) |
| mismatch | ❌ Mismatch + icon 👁 |
| not_found | ⚠️ Not Found (cam) |

**Inline diff** khi click 👁 vào row mismatch:
```
│  Field    │ Request (DB)    │ POS             │
│  proname  │ "Combo Tôm"    │ "Combo Tom Hum" │
│  enddate  │ 2024-12-31     │ 2024-11-30      │
│  active   │ —              │ N               │
```

**Loading state:** Nút hiển thị spinner, các badge hiện skeleton trong khi chờ response.

### 5.2 Request Detail (combo section)

**Nút Verify POS** (admin only): đặt ở header của combo section trong modal/page Request Detail.

**Cột POS Status** thêm vào ComboDescriptionTable (chỉ hiện cho các row `itemtype='combo'`).

**Timestamp** hiển thị dưới cùng của combo section sau khi verify:
```
Verified at: 18/06/2026 14:32
```

---

## 6. Files

### Files mới
| File | Mục đích |
|---|---|
| `src/app/api/combos/pos-verify/route.ts` | API route — fetch POS + so sánh server-side |
| `src/hooks/usePOSVerify.ts` | Hook — trigger verify, giữ state (results, loading, error) |
| `src/components/(product)/combo/POSVerifyButton.tsx` | Button + summary bar tái sử dụng ở cả 2 context |

### Files sửa
| File | Thay đổi |
|---|---|
| `src/components/(product)/combo/ComboTable.tsx` | Thêm POSVerifyButton + cột POS Status + inline diff |
| `src/components/form/form-request/ComboDescriptionTable.tsx` | Thêm POSVerifyButton + cột POS Status (combo rows only) |

### Environment variable mới
```env
POS_COMBO_API_URL=https://...  # URL của POS REST API trả về combo list
```

---

## 7. Out of Scope

- Verify các item không phải combo (`itemtype != 'combo'`)
- So sánh `startdate`
- So sánh các thành phần bên trong combo (description/components)
- Auto-verify khi load trang
- Lưu lại lịch sử verify vào database
