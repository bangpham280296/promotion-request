import ExcelJS from "exceljs";

const DATA_START_ROW = 11; // 1-indexed in ExcelJS

const TABLE_HEADERS = [
    "Menu Items",
    "Menu Name",
    "Description",
    "Family Group",
    "Screen Display",
    "Discount (Y/N)",
    "Price",
    "Effective Date",
    "Expired Date",
    "Scope",
    "Note",
];

// Convert internal "code|name|unitPrice (qty)" → "qty name (code)"
const parseDescriptionForExcel = (desc: string): string => {
    if (!desc || !desc.includes("|")) return desc || "";
    return desc
        .split(" + ")
        .map((part) => {
            const segs = part.split("|");
            if (segs.length >= 3) {
                const [code, name, priceQty] = segs;
                const qtyMatch = priceQty?.match(/\((\d+)\)\s*$/);
                const qty = qtyMatch ? qtyMatch[1] : "1";
                return `${qty} ${name.trim()} (${code.trim()})`;
            }
            if (segs.length === 2) {
                const [code, name] = segs;
                return `${name.trim()} (${code.trim()})`;
            }
            return part;
        })
        .join(" + ");
};

const HEADER_COLOR = "FFC0504D"; // KFC red — same as table header

const applyStyle = (worksheet: ExcelJS.Worksheet, dataRowCount: number) => {
    // ── Column widths ─────────────────────────────────────────────────────────
    worksheet.columns = [
        { width: 18 }, // A
        { width: 25 }, // B
        { width: 30 }, // C
        { width: 22 }, // D
        { width: 25 }, // E
        { width: 20 }, // F
        { width: 15 }, // G
        { width: 18 }, // H
        { width: 18 }, // I
        { width: 15 }, // J
        { width: 25 }, // K
    ];

    // ── Merge cells ───────────────────────────────────────────────────────────
    worksheet.mergeCells("C2:I2");
    worksheet.mergeCells("A3:K3");
    worksheet.mergeCells("B4:C4");
    worksheet.mergeCells("E6:F6"); // Promotion name value (wider span)

    // ── Row heights ───────────────────────────────────────────────────────────
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 30;
    worksheet.getRow(6).height = 25;
    worksheet.getRow(10).height = 25;

    // ── Company name (A1) ─────────────────────────────────────────────────────
    worksheet.getCell("A1").font = { bold: true, size: 11 };

    // ── Title (A3) — no fill ──────────────────────────────────────────────────
    const titleCell = worksheet.getCell("A3");
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // ── Subtitle (C2) ─────────────────────────────────────────────────────────
    const subTitleCell = worksheet.getCell("C2");
    subTitleCell.font = { bold: true, size: 12 };
    subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

    // ── Labels ────────────────────────────────────────────────────────────────
    const labelFont = { bold: true, size: 11 };
    (
        [
            ["A4", "Request No.:"],
            ["J4", "Date Created:"],   // moved from D4
            ["A6", "Promotion Name:"], // moved from A5
            ["A8", "Requested by:"],
            ["E9", "Department:"],     // moved from D8, now row 9
            ["J9", "Status:"],         // moved from H8, now row 9
        ] as [string, string][]
    ).forEach(([addr, text]) => {
        worksheet.getCell(addr).value = text;
        worksheet.getCell(addr).font = labelFont;
    });

    // ── Request code value (B4) ───────────────────────────────────────────────
    worksheet.getCell("B4").font = { bold: true };
    worksheet.getCell("B4").alignment = { horizontal: "center" };

    // ── Promotion name value (E6) — filled with header color ─────────────────
    const promoCell = worksheet.getCell("E6");
    promoCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    promoCell.alignment = { horizontal: "center", vertical: "middle" };
    promoCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_COLOR },
    };

    // ── Table header row (row 10) ─────────────────────────────────────────────
    const headerRow = worksheet.getRow(10);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: HEADER_COLOR },
        };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    // ── Data rows border + alignment ──────────────────────────────────────────
    const lastDataRow = DATA_START_ROW + dataRowCount - 1;
    for (let rowNumber = DATA_START_ROW; rowNumber <= lastDataRow; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= TABLE_HEADERS.length) {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };
                cell.alignment = { vertical: "middle", wrapText: true };
            }
        });
        // Per-column alignment overrides
        row.getCell(1).alignment  = { horizontal: "center", vertical: "middle" };
        row.getCell(2).alignment  = { horizontal: "center", vertical: "middle" };
        row.getCell(4).alignment  = { horizontal: "center", vertical: "middle" };
        row.getCell(6).alignment  = { horizontal: "center", vertical: "middle" };
        row.getCell(7).alignment  = { horizontal: "right",  vertical: "middle" };
        row.getCell(8).alignment  = { horizontal: "right",  vertical: "middle" };
        row.getCell(9).alignment  = { horizontal: "right",  vertical: "middle" };
        row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    }

    // ── Freeze pane at row 10 ─────────────────────────────────────────────────
    worksheet.views = [{ state: "frozen", ySplit: 10 }];

    // ── Auto filter ───────────────────────────────────────────────────────────
    worksheet.autoFilter = { from: "A10", to: "K10" };
};

export async function exportRequestToExcel(request: any, details: any[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Request");

    // ── Static content ────────────────────────────────────────────────────────
    ws.getCell("A1").value = "KFC VIET NAM";
    ws.getCell("C2").value = "Menu Change Request";
    ws.getCell("A3").value = "PROMOTION / MENU CHANGE REQUEST";

    // Table headers
    TABLE_HEADERS.forEach((header, i) => {
        ws.getCell(10, i + 1).value = header;
    });

    // ── Dynamic values ────────────────────────────────────────────────────────
    const dateDisplay = request.createdate
        ? new Date(request.createdate).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        : new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    ws.getCell("B4").value = request.requestcode ?? "";
    ws.getCell("K4").value = dateDisplay;           // Date Created
    ws.getCell("E6").value = request.promotionname ?? ""; // Promotion Name (row 6)
    ws.getCell("B8").value = request.employees?.fullname ?? "";
    ws.getCell("F9").value = request.department?.deptname ?? ""; // Department (row 9)
    ws.getCell("K9").value = request.stt?.name ?? "";            // Status (row 9)

    // ── Data rows ─────────────────────────────────────────────────────────────
    details.forEach((item, index) => {
        const row = ws.getRow(DATA_START_ROW + index);
        row.getCell(1).value  = item.itemcode    || "";
        row.getCell(2).value  = item.itemname    || "";
        row.getCell(3).value  = parseDescriptionForExcel(item.description);
        row.getCell(4).value  = item.itemtype    || "";
        row.getCell(5).value  = "";
        row.getCell(6).value  = item.discount    ?? "";
        row.getCell(7).value  = item.price       ?? "";
        row.getCell(8).value  = item.startdate   || "";
        row.getCell(9).value  = item.enddate     || "";
        row.getCell(10).value = item.servicetype || "";
        row.getCell(11).value = item.notes       || "";
        row.commit();
    });

    // ── Apply styles (after data so eachCell picks up filled cells) ───────────
    applyStyle(ws, Math.max(details.length, 1));

    // ── Download via Blob ─────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${request.requestcode ?? "request"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
