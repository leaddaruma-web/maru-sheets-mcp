// sheets-server.js — MCP "mcp-maru-sheets": đọc/ghi/format Google Sheets qua API v4.
// Không cần trình duyệt. Set công thức theo locale spreadsheet (vi → dùng ';').

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { google } from "googleapis";
import { getAuthClient } from "./auth.js";

const auth = await getAuthClient();
const sheets = google.sheets({ version: "v4", auth });

const server = new McpServer({ name: "mcp-maru-sheets", version: "1.0.0" });

// Helper: lấy sheetId (gid) theo tên tab
async function sheetIdByName(spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const s = meta.data.sheets.find((x) => x.properties.title === title);
  if (!s) throw new Error(`Không thấy tab "${title}"`);
  return s.properties.sheetId;
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return { red: parseInt(h.slice(0, 2), 16) / 255, green: parseInt(h.slice(2, 4), 16) / 255, blue: parseInt(h.slice(4, 6), 16) / 255 };
}

server.tool("list_sheets", "Liệt kê các tab trong 1 spreadsheet", {
  spreadsheetId: z.string(),
}, async ({ spreadsheetId }) => {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const list = meta.data.sheets.map((s) => `${s.properties.title} (gid=${s.properties.sheetId})`);
  return { content: [{ type: "text", text: list.join("\n") }] };
});

server.tool("read_range", "Đọc giá trị 1 vùng (A1 notation, vd 'NHẬT KÝ!A1:K12')", {
  spreadsheetId: z.string(), range: z.string(),
}, async ({ spreadsheetId, range }) => {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return { content: [{ type: "text", text: JSON.stringify(r.data.values || [], null, 2) }] };
});

server.tool("write_range", "Ghi giá trị 2 chiều vào 1 vùng (USER_ENTERED → công thức/format theo locale)", {
  spreadsheetId: z.string(), range: z.string(), values: z.array(z.array(z.any())),
}, async ({ spreadsheetId, range, values }) => {
  const r = await sheets.spreadsheets.values.update({
    spreadsheetId, range, valueInputOption: "USER_ENTERED", requestBody: { values },
  });
  return { content: [{ type: "text", text: `✓ ghi ${r.data.updatedCells} ô vào ${range}` }] };
});

server.tool("set_formula", "Set 1 công thức vào 1 ô. ⚠️ locale Việt: dùng ';' phân tách tham số.", {
  spreadsheetId: z.string(), cell: z.string().describe("vd 'GIAO DỊCH!B4'"), formula: z.string(),
}, async ({ spreadsheetId, cell, formula }) => {
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: cell, valueInputOption: "USER_ENTERED", requestBody: { values: [[formula]] },
  });
  return { content: [{ type: "text", text: `✓ set công thức vào ${cell}` }] };
});

server.tool("add_sheet", "Thêm 1 tab mới", {
  spreadsheetId: z.string(), title: z.string(),
}, async ({ spreadsheetId, title }) => {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title } } }] } });
  return { content: [{ type: "text", text: `✓ thêm tab "${title}"` }] };
});

server.tool("freeze_rows", "Đóng băng N hàng đầu của 1 tab", {
  spreadsheetId: z.string(), sheetTitle: z.string(), rows: z.number(),
}, async ({ spreadsheetId, sheetTitle, rows }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: rows } }, fields: "gridProperties.frozenRowCount" },
  }] } });
  return { content: [{ type: "text", text: `✓ đóng băng ${rows} hàng tab ${sheetTitle}` }] };
});

server.tool("set_format", "Tô nền + chữ cho 1 vùng (bgHex, fontHex, bold). Vùng theo gridRange 0-based.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  bgHex: z.string().optional(), fontHex: z.string().optional(), bold: z.boolean().optional(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, bgHex, fontHex, bold }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const cellFormat = {};
  if (bgHex) cellFormat.backgroundColor = hexToRgb(bgHex);
  cellFormat.textFormat = {};
  if (fontHex) cellFormat.textFormat.foregroundColor = hexToRgb(fontHex);
  if (bold !== undefined) cellFormat.textFormat.bold = bold;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: cellFormat },
      fields: "userEnteredFormat(backgroundColor,textFormat)",
    },
  }] } });
  return { content: [{ type: "text", text: `✓ format vùng ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("set_data_validation", "Set dropdown (chọn từ danh sách giá trị) cho 1 vùng", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  values: z.array(z.string()),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, values }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    setDataValidation: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      rule: { condition: { type: "ONE_OF_LIST", values: values.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false },
    },
  }] } });
  return { content: [{ type: "text", text: `✓ dropdown ${values.length} giá trị vào ${sheetTitle}` }] };
});

server.tool("merge_cells", "Merge 1 vùng thành 1 ô (MERGE_ALL). Vùng theo gridRange 0-based.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  mergeType: z.enum(["MERGE_ALL", "MERGE_COLUMNS", "MERGE_ROWS"]).optional(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, mergeType }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    mergeCells: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      mergeType: mergeType || "MERGE_ALL",
    },
  }] } });
  return { content: [{ type: "text", text: `✓ merge ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("set_column_width", "Đặt chiều rộng cột (pixel). startCol/endCol 0-based, endCol exclusive.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startCol: z.number(), endCol: z.number(), pixelSize: z.number(),
}, async ({ spreadsheetId, sheetTitle, startCol, endCol, pixelSize }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: startCol, endIndex: endCol },
      properties: { pixelSize }, fields: "pixelSize",
    },
  }] } });
  return { content: [{ type: "text", text: `✓ set cột ${startCol}-${endCol} = ${pixelSize}px tab ${sheetTitle}` }] };
});

server.tool("set_number_format", "Format số/ngày/tiền cho 1 vùng. type: DATE/NUMBER/CURRENCY/PERCENT/TEXT. pattern vd 'yyyy-mm-dd' / '#,##0' / '0.00%'.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  type: z.enum(["DATE", "DATE_TIME", "TIME", "NUMBER", "CURRENCY", "PERCENT", "TEXT"]),
  pattern: z.string(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, type, pattern }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: { numberFormat: { type, pattern } } },
      fields: "userEnteredFormat.numberFormat",
    },
  }] } });
  return { content: [{ type: "text", text: `✓ numberFormat ${type} "${pattern}" vào ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("set_text_wrap_align", "Wrap text + căn giữa dọc/ngang cho 1 vùng. wrap: WRAP/CLIP/OVERFLOW_CELL. h: LEFT/CENTER/RIGHT. v: TOP/MIDDLE/BOTTOM.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  wrap: z.enum(["WRAP", "CLIP", "OVERFLOW_CELL"]).optional(),
  horizontalAlignment: z.enum(["LEFT", "CENTER", "RIGHT"]).optional(),
  verticalAlignment: z.enum(["TOP", "MIDDLE", "BOTTOM"]).optional(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, wrap, horizontalAlignment, verticalAlignment }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const fmt = {};
  if (wrap) fmt.wrapStrategy = wrap;
  if (horizontalAlignment) fmt.horizontalAlignment = horizontalAlignment;
  if (verticalAlignment) fmt.verticalAlignment = verticalAlignment;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: fmt },
      fields: "userEnteredFormat(wrapStrategy,horizontalAlignment,verticalAlignment)",
    },
  }] } });
  return { content: [{ type: "text", text: `✓ wrap/align ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("delete_sheet", "Xóa 1 tab.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
}, async ({ spreadsheetId, sheetTitle }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ deleteSheet: { sheetId } }] } });
  return { content: [{ type: "text", text: `✓ xóa tab "${sheetTitle}"` }] };
});

server.tool("rename_sheet", "Đổi tên tab.", {
  spreadsheetId: z.string(), oldTitle: z.string(), newTitle: z.string(),
}, async ({ spreadsheetId, oldTitle, newTitle }) => {
  const sheetId = await sheetIdByName(spreadsheetId, oldTitle);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    updateSheetProperties: { properties: { sheetId, title: newTitle }, fields: "title" },
  }] } });
  return { content: [{ type: "text", text: `✓ "${oldTitle}" → "${newTitle}"` }] };
});

server.tool("set_protected_range", "Khóa 1 vùng (hoặc cả cột/hàng) — chỉ email trong `editors` mới sửa được. Bỏ trống editors = chỉ owner. Vùng theo gridRange 0-based. Để khóa cả cột: startRow=0, endRow=null (truyền số lớn vd 10000). Để khóa cả hàng: startCol=0, endCol=null.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  description: z.string().optional(),
  editors: z.array(z.string().email()).optional().describe("Danh sách email được edit. Bỏ trống = chỉ owner."),
  warningOnly: z.boolean().optional().describe("true = chỉ cảnh báo khi sửa, vẫn cho sửa. false (mặc định) = chặn cứng."),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, description, editors, warningOnly }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const protectedRange = {
    range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
    description: description || "Khóa bởi MCP",
    warningOnly: warningOnly || false,
  };
  if (editors && editors.length > 0) protectedRange.editors = { users: editors };
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addProtectedRange: { protectedRange } }] } });
  return { content: [{ type: "text", text: `✓ khóa ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]${editors ? ` (editors: ${editors.join(", ")})` : " (chỉ owner)"}` }] };
});

server.tool("set_conditional_format", "Conditional formatting: nếu điều kiện đúng → tô màu. type: TEXT_CONTAINS / TEXT_EQ / TEXT_NOT_EMPTY / NUMBER_GREATER / NUMBER_LESS / CUSTOM_FORMULA. value/formula tùy type.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  conditionType: z.string().describe("vd TEXT_CONTAINS, TEXT_EQ, TEXT_NOT_EMPTY, NUMBER_GREATER, CUSTOM_FORMULA"),
  value: z.string().optional().describe("Giá trị/công thức điều kiện. Vd '⚠️' với TEXT_CONTAINS, '=$F2=\"Đã ngừng\"' với CUSTOM_FORMULA."),
  bgHex: z.string().optional(), fontHex: z.string().optional(), bold: z.boolean().optional(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, conditionType, value, bgHex, fontHex, bold }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const condition = { type: conditionType };
  if (value !== undefined) condition.values = [{ userEnteredValue: value }];
  const format = { textFormat: {} };
  if (bgHex) format.backgroundColor = hexToRgb(bgHex);
  if (fontHex) format.textFormat.foregroundColor = hexToRgb(fontHex);
  if (bold !== undefined) format.textFormat.bold = bold;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }],
        booleanRule: { condition, format },
      },
      index: 0,
    },
  }] } });
  return { content: [{ type: "text", text: `✓ conditional ${conditionType}${value ? " '"+value+"'" : ""} → ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("set_borders", "Vẽ viền cho 1 vùng. style: SOLID/DASHED/DOTTED/DOUBLE/SOLID_MEDIUM/SOLID_THICK. sides: ALL/INNER/OUTER/TOP/BOTTOM/LEFT/RIGHT.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  startRow: z.number(), endRow: z.number(), startCol: z.number(), endCol: z.number(),
  style: z.enum(["SOLID", "DASHED", "DOTTED", "DOUBLE", "SOLID_MEDIUM", "SOLID_THICK"]).optional(),
  sides: z.enum(["ALL", "INNER", "OUTER"]).optional(),
  colorHex: z.string().optional(),
}, async ({ spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, style, sides, colorHex }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const border = { style: style || "SOLID", color: colorHex ? hexToRgb(colorHex) : { red: 0, green: 0, blue: 0 } };
  const req = { range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol } };
  const s = sides || "ALL";
  if (s === "ALL" || s === "OUTER") { req.top = border; req.bottom = border; req.left = border; req.right = border; }
  if (s === "ALL" || s === "INNER") { req.innerHorizontal = border; req.innerVertical = border; }
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ updateBorders: req }] } });
  return { content: [{ type: "text", text: `✓ borders ${style||"SOLID"} ${s} → ${sheetTitle}[${startRow}-${endRow},${startCol}-${endCol}]` }] };
});

server.tool("apply_template", "Gói macro 1-lệnh: áp toàn bộ format chuẩn cho 1 tab (freeze 1 hàng + wrap + canh giữa dọc + header navy bold trắng + cột rộng mặc định). Dùng mỗi khi tạo tab mới.", {
  spreadsheetId: z.string(), sheetTitle: z.string(),
  headerCols: z.number().describe("Số cột header (vd 9 nếu header trải A:I)"),
  columnWidth: z.number().optional().describe("Mặc định 150px"),
  headerBgHex: z.string().optional().describe("Mặc định #1F3864 (navy)"),
  freezeRows: z.number().optional().describe("Mặc định 1"),
}, async ({ spreadsheetId, sheetTitle, headerCols, columnWidth, headerBgHex, freezeRows }) => {
  const sheetId = await sheetIdByName(spreadsheetId, sheetTitle);
  const w = columnWidth || 150;
  const bg = hexToRgb(headerBgHex || "#1F3864");
  const fr = freezeRows ?? 1;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: fr } }, fields: "gridProperties.frozenRowCount" } },
    { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: headerCols }, properties: { pixelSize: w }, fields: "pixelSize" } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headerCols }, cell: { userEnteredFormat: { backgroundColor: bg, textFormat: { foregroundColor: hexToRgb("#FFFFFF"), bold: true }, horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)" } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: headerCols }, cell: { userEnteredFormat: { verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" } }, fields: "userEnteredFormat(verticalAlignment,wrapStrategy)" } },
  ] } });
  return { content: [{ type: "text", text: `✓ apply_template tab "${sheetTitle}": freeze ${fr}, ${headerCols} cột rộng ${w}px, header navy bold, wrap+middle toàn bảng` }] };
});

await server.connect(new StdioServerTransport());
