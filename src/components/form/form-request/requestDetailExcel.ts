import * as XLSX from "xlsx";
import { toast } from "sonner";
import { toDBDescription } from "./ComboDescriptionTable";
import type { DiscountMetadata } from "@/types/discount-metadata";

export type Row = {
    no: number;
    itemcode: string;
    itemname: string;
    description: string;        // DB format: "code|name + ..."
    _descriptionFull?: string;  // UI-only: "code|name|price + ..." (không gửi lên DB)
    servicetype: string;
    discount: string | null;
    price: number | null;
    startdate: string;
    enddate: string;
    notes: string;
    itemtype: string;           // 'item' | 'combo' | 'discount'
    metadata?: DiscountMetadata | null; // Discount only — Voucherify campaign metadata
};

export function parseDateCell(val: unknown): string {
    if (!val) return "";
    if (typeof val === "number") {
        const date = XLSX.SSF.parse_date_code(val);
        if (!date) return "";
        const mm = String(date.m).padStart(2, "0");
        const dd = String(date.d).padStart(2, "0");
        return `${date.y}-${mm}-${dd}`;
    }
    const s = String(val).trim();
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return "";
}

export function downloadTemplate(): void {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Data
    const ws = XLSX.utils.aoa_to_sheet([
        ["Item Code", "Item Name", "Type", "Description", "Service Type", "Discount", "Price", "Start Date", "End Date", "Notes"],
        ["100001", "Fried Chicken L", "item", "", "Dine-in", "no", "55000", "01/07/2025", "31/07/2025", ""],
        ["COMBO01", "Chicken + Drink", "combo", "100002|2 Fried Chicken|72000 (1) + 400026|Pasta X.xich Ga|37000 (1) OR 300002|Burger Shrimp|45000 (1) + 700070|Pepsi (STD) CBO|8500 (2)", "Dine-in", "no", "65000", "01/07/2025", "31/07/2025", ""],
        ["DISC01", "Discount 10%", "discount", "", "All", "yes", "10000", "01/07/2025", "31/07/2025", "10% off"],
    ]);
    ws["!cols"] = [12, 22, 10, 58, 14, 10, 10, 12, 12, 20].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, "Request Detail");

    // Sheet 2 — Guide
    const guide = XLSX.utils.aoa_to_sheet([
        ["Field", "Required", "Accepted values / Format", "Example"],
        ["Item Code", "Yes", "Any text", "100001"],
        ["Item Name", "Yes", "Any text", "Fried Chicken L"],
        ["Type", "No", "item | combo | discount  (default: item)", "combo"],
        ["Description", "No", "Combo only — format: code|name|qty|totalPrice|unitPrice", "100001|Fried Chicken L|1|55000|55000 + 700055|Pepsi R|1|16000|16000"],
        ["", "", "  Join components with  \" + \"", ""],
        ["", "", "  Join alternatives (OR choice) with  \" OR \"", "100001|Chicken|1|55000|55000 OR PASTA|Mì Ý|1|45000|45000 + 700055|Pepsi|1|16000|16000"],
        ["Service Type", "No", "Any text e.g. Dine-in, Delivery", "Dine-in"],
        ["Discount", "No", "yes | no", "no"],
        ["Price", "No", "Number (VND) — for combo: tổng giá đề xuất", "65000"],
        ["Start Date", "No", "dd/mm/yyyy  or  yyyy-mm-dd", "01/07/2025"],
        ["End Date", "No", "dd/mm/yyyy  or  yyyy-mm-dd", "31/07/2025"],
        ["Notes", "No", "Any text", ""],
        [],
        ["Description segment format:"],
        ["code", "name", "qty", "totalPrice (qty × unitPrice)", "unitPrice"],
        ["100001", "Fried Chicken L", "1", "55000", "55000"],
        ["700055", "Pepsi R", "2", "32000", "16000"],
    ]);
    guide["!cols"] = [16, 10, 50, 60].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, guide, "Guide");

    XLSX.writeFile(wb, "request-detail-template.xlsx");
}

export function importFromExcel(
    file: File,
    existingRows: Row[],
    onChange: (rows: Row[]) => void
): void {
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const wb = XLSX.read(evt.target?.result, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

            if (rows.length === 0) {
                toast.warning("File Excel không có dữ liệu.", { position: "top-center" });
                return;
            }

            const errors: string[] = [];
            const imported: Row[] = [];
            const startNo = existingRows.length;

            rows.forEach((r, i) => {
                const rowNum = i + 2;
                const itemcode = String(r["Item Code"] ?? "").trim();
                const itemname = String(r["Item Name"] ?? "").trim();

                if (!itemcode) { errors.push(`Row ${rowNum}: Item Code trống`); return; }
                if (!itemname) { errors.push(`Row ${rowNum}: Item Name trống`); return; }

                const rawType = String(r["Type"] ?? "item").trim().toLowerCase();
                const itemtype = ["item", "combo", "discount"].includes(rawType) ? rawType : "item";

                const rawDiscount = String(r["Discount"] ?? "no").trim().toLowerCase();
                const discount = rawDiscount === "yes" ? "yes" : rawDiscount === "no" ? "no" : null;

                const rawPrice = r["Price"];
                const price = rawPrice !== "" && rawPrice != null && !isNaN(Number(rawPrice))
                    ? Number(rawPrice) : null;

                const rawDesc = String(r["Description"] ?? "").trim();
                const hasDesc = rawDesc.includes("|");

                imported.push({
                    no: startNo + imported.length + 1,
                    itemcode,
                    itemname,
                    description: hasDesc ? toDBDescription(rawDesc) : "",
                    _descriptionFull: hasDesc ? rawDesc : "",
                    servicetype: String(r["Service Type"] ?? "").trim(),
                    discount,
                    price,
                    startdate: parseDateCell(r["Start Date"]),
                    enddate: parseDateCell(r["End Date"]),
                    notes: String(r["Notes"] ?? "").trim(),
                    itemtype,
                });
            });

            if (errors.length > 0) {
                toast.error(`Import lỗi:\n${errors.slice(0, 5).join("\n")}`, { position: "top-center" });
                return;
            }

            onChange([...existingRows, ...imported]);
            toast.success(`Đã import ${imported.length} dòng thành công.`, { position: "top-center" });
        } catch {
            toast.error("Không đọc được file. Vui lòng kiểm tra định dạng Excel.", { position: "top-center" });
        }
    };
    reader.readAsArrayBuffer(file);
}
