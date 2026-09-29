/**
 * Định dạng số thành chuỗi phân cách hàng ngàn theo chuẩn VN (VD: 150000 -> "150.000")
 * @param value Giá trị số hoặc chuỗi
 * @param suffix Đơn vị tiền tệ kèm theo (tùy chọn, ví dụ: "VND" hoặc "₫")
 */
export function formatCurrency(
  value: number | string | null | undefined,
  suffix = ""
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return "-";
  const formatted = num.toLocaleString("vi-VN");
  return suffix ? `${formatted} ${suffix}` : formatted;
}
