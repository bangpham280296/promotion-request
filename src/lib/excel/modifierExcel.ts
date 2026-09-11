import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import type { ModifierMatrixFlatRow } from "@/types/modifier";

export const EXCEL_COLUMNS = [
  { key: "groupName", header: "Group Name", width: 28 },
  { key: "description", header: "Description", width: 34 },
  { key: "baseItemCode", header: "Base Item Code", width: 18 },
  { key: "targetItemCode", header: "Target Item Code", width: 18 },
  { key: "surcharge", header: "Surcharge", width: 16 },
  { key: "status", header: "Status", width: 14 },
];

/** Download a pre-formatted sample Excel template for users to fill */
export async function downloadModifierTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Modifier Matrix");

  // Style Header Row
  ws.columns = EXCEL_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE4002B" }, // KFC Red
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  // Add sample rows
  const sampleRows = [
    {
      groupName: "Drink Upsize (STD to LRG)",
      description: "Upsize soft drinks from standard to large cup",
      baseItemCode: "10101",
      targetItemCode: "10102",
      surcharge: 5000,
      status: "Active",
    },
    {
      groupName: "Drink Upsize (STD to LRG)",
      description: "",
      baseItemCode: "10103",
      targetItemCode: "10104",
      surcharge: 5000,
      status: "Active",
    },
    {
      groupName: "Side Dish Trade-Up",
      description: "Swap standard fries to mashed potatoes or salad",
      baseItemCode: "20101",
      targetItemCode: "20102",
      surcharge: 3000,
      status: "Active",
    },
  ];

  sampleRows.forEach((row) => {
    const r = ws.addRow(row);
    r.height = 20;
    r.font = { name: "Arial", size: 10 };
    r.getCell(5).numFmt = "#,##0";
    r.alignment = { vertical: "middle", horizontal: "left" };
    r.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
    r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
    r.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Modifier_Matrix_Template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

/** Export all active/inactive modifier groups with base and target items to Excel */
export async function exportModifierMatrixToExcel(
  groupsData: Array<{
    group_name: string;
    description: string | null;
    status: number;
    base_items: string[];
    target_items: Array<{ itemcode: string; surcharge_price: number; is_active: boolean }>;
  }>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Modifier Matrix");

  ws.columns = EXCEL_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // Slate 800
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  groupsData.forEach((group) => {
    const statusLabel = group.status === 1 ? "Active" : "Inactive";
    const maxRows = Math.max(group.base_items.length, group.target_items.length, 1);

    for (let i = 0; i < maxRows; i++) {
      const baseCode = group.base_items[i] || "";
      const target = group.target_items[i];
      const targetCode = target ? target.itemcode : "";
      const surcharge = target ? target.surcharge_price : 0;
      const targetActive = target ? (target.is_active ? "Active" : "Off") : "";

      const row = ws.addRow({
        groupName: i === 0 ? group.group_name : group.group_name,
        description: i === 0 ? group.description || "" : "",
        baseItemCode: baseCode,
        targetItemCode: targetCode,
        surcharge: target ? surcharge : "",
        status: target ? targetActive : statusLabel,
      });

      row.height = 20;
      row.font = { name: "Arial", size: 10 };
      if (target) {
        row.getCell(5).numFmt = "#,##0";
      }
      row.alignment = { vertical: "middle", horizontal: "left" };
      row.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
      row.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `Modifier_Matrix_${dateStr}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an uploaded Excel file into normalized ModifierMatrixFlatRow objects */
export async function parseModifierExcel(file: File): Promise<ModifierMatrixFlatRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The Excel file contains no worksheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (rawRows.length === 0) {
    throw new Error("The selected sheet has no data rows.");
  }

  const result: ModifierMatrixFlatRow[] = [];

  for (const row of rawRows) {
    // Find keys matching flexible headers
    const findValue = (possibleNames: string[]) => {
      for (const name of possibleNames) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase() === name.toLowerCase()) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    const groupName = findValue(["Group Name", "GroupName", "Group", "Nhóm"])?.toString().trim();
    if (!groupName) continue; // Skip rows without group name

    const description = findValue(["Description", "Desc", "Mô tả"])?.toString().trim();
    const baseItemCode = findValue([
      "Base Item Code",
      "BaseItemCode",
      "Base Item",
      "BaseCode",
      "Món gốc",
    ])
      ?.toString()
      .trim();
    const targetItemCode = findValue([
      "Target Item Code",
      "TargetItemCode",
      "Target Item",
      "TargetCode",
      "Món đổi",
    ])
      ?.toString()
      .trim();

    const surchargeRaw = findValue(["Surcharge", "Price", "Phụ thu", "Extra Price"]);
    const surcharge = surchargeRaw ? Number(surchargeRaw) || 0 : 0;

    const statusRaw = findValue(["Status", "Trạng thái", "Active"]);

    result.push({
      groupName,
      description,
      baseItemCode: baseItemCode || undefined,
      targetItemCode: targetItemCode || undefined,
      surcharge,
      status: statusRaw,
    });
  }

  return result;
}
