# maru-sheets-mcp

MCP server cho phép AI agent đọc/ghi/format Google Sheets qua API v4.

---

## 👩‍💼 DÀNH CHO NGƯỜI DÙNG

Bạn không cần biết code. Chỉ cần mở Antigravity 2.0 (hoặc AI coding agent khác), **paste đoạn prompt bên dưới**, rồi làm theo khi AI hỏi.

### Paste prompt này vào Antigravity 2.0:

```
Tôi cần bạn cài đặt MCP server "maru-sheets-mcp" để tôi có thể đọc và ghi Google Sheets từ đây.

Đọc file README.md trong repo https://github.com/leaddaruma-web/maru-sheets-mcp — phần "DÀNH CHO AI CODING AGENT" có hướng dẫn chi tiết từng bước.

Làm hết tất cả các bước giúp tôi — bao gồm cả kiểm tra/cài Node.js nếu máy chưa có. Tôi chỉ cần click "Cho phép" khi trình duyệt mở ra hỏi quyền Gmail.

Bắt đầu.
```

Sau đó AI sẽ tự làm mọi thứ. Bạn chỉ cần:
- **Click "Cho phép"** khi trình duyệt mở ra hỏi quyền Gmail (1 lần duy nhất)
- **Restart Antigravity** sau khi AI báo cấu hình xong (nếu AI yêu cầu)

### Sau khi cài xong, bạn có thể bảo AI:

- *"Đọc dữ liệu từ Sheet [dán link Sheet] tab Nhật ký, cột A đến K"*
- *"Ghi danh sách sau vào Sheet [dán link Sheet] bắt đầu từ ô A2: ..."*
- *"Tạo tab mới tên 'Tháng 7' trong Sheet [dán link Sheet]"*
- *"Format header: nền xanh đậm, chữ trắng, in đậm"*
- *"Set công thức tính tổng cột B vào ô B101"*

### Lưu ý

- **Sheet phải được share cho Gmail bạn** — nếu AI báo "insufficient permission", mở Sheet đó → click Share → thêm Gmail của bạn (quyền Editor)
- **Chỉ cần cài 1 lần** — những lần sau mở Antigravity là dùng được luôn

---

## 🤖 DÀNH CHO AI CODING AGENT

> Phần này dành cho AI agent đọc và tự thực hiện. Người dùng không cần đọc phần này.

### Bước 0 — Kiểm tra và cài Node.js (nếu chưa có)

```bash
node --version
```

Nếu lệnh trên báo lỗi hoặc version < 18, cài Node.js:

- **Windows**: tải và chạy installer từ https://nodejs.org/en/download/ (chọn bản LTS, chạy file .msi, chọn tất cả mặc định). Sau khi cài xong cần mở terminal mới để `node` có trong PATH.
- **macOS**: `brew install node` hoặc tải installer từ https://nodejs.org/
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs`

Kiểm tra lại sau khi cài:
```bash
node --version  # phải >= 18
npm --version   # phải có
```

### Bước 1 — Clone repo

```bash
git clone https://github.com/leaddaruma-web/maru-sheets-mcp.git
cd maru-sheets-mcp
```

Nếu máy chưa có git:
- **Windows**: tải từ https://git-scm.com/download/win, cài mặc định
- **macOS**: `xcode-select --install`
- **Linux**: `sudo apt-get install git`

### Bước 2 — Cài dependencies

```bash
npm install
```

### Bước 3 — Xác thực Gmail (chỉ 1 lần)

```bash
npm run auth
```

Lệnh này sẽ:
1. Mở trình duyệt tại URL xác thực Google
2. Người dùng đăng nhập Gmail và click "Cho phép" / "Allow"
3. Trình duyệt chuyển hướng về localhost → file `token.json` được tạo tự động

**BÁO CHO NGƯỜI DÙNG:** "Trình duyệt sẽ mở ra — bạn đăng nhập Gmail rồi click Cho phép nhé."

Đợi cho đến khi terminal hiện `✓ Đã lưu token.json` rồi tiếp tục.

### Bước 4 — Cấu hình MCP server

Ghi nhớ đường dẫn tuyệt đối tới thư mục `maru-sheets-mcp` vừa clone (ví dụ `D:\Projects\maru-sheets-mcp` hoặc `/Users/ten/maru-sheets-mcp`).

Thêm vào file cấu hình MCP của tool đang dùng:

**Claude Code** — file `claude_desktop_config.json` hoặc `.claude.json`:
```json
{
  "mcpServers": {
    "maru-sheets": {
      "command": "node",
      "args": ["src/sheets-server.js"],
      "cwd": "<đường-dẫn-tuyệt-đối-tới-thư-mục-maru-sheets-mcp>"
    }
  }
}
```

**Antigravity 2.0** — vào Settings → MCP Servers → thêm server mới:
- Name: `maru-sheets`
- Command: `node`
- Arguments: `src/sheets-server.js`
- Working directory: `<đường-dẫn-tuyệt-đối-tới-thư-mục-maru-sheets-mcp>`

**Tool khác** — tương tự, trỏ command `node`, args `src/sheets-server.js`, cwd là thư mục chứa repo.

### Bước 5 — Kiểm tra

Sau khi cấu hình, restart tool (hoặc reload MCP) rồi thử:
- Gọi tool `list_sheets` với `spreadsheetId` bất kỳ mà Gmail đã auth có quyền truy cập
- Nếu trả về danh sách tab → **thành công**

**BÁO CHO NGƯỜI DÙNG:** "Đã cài xong! Bạn có thể restart Antigravity rồi thử bảo tôi đọc/ghi Sheet."

### Các tool có sẵn sau khi cài

| Tool | Mô tả | Tham số chính |
|------|--------|---------------|
| `list_sheets` | Liệt kê các tab | spreadsheetId |
| `read_range` | Đọc giá trị 1 vùng (A1 notation) | spreadsheetId, range |
| `write_range` | Ghi giá trị 2D vào 1 vùng | spreadsheetId, range, values |
| `set_formula` | Set công thức vào 1 ô | spreadsheetId, cell, formula |
| `add_sheet` | Thêm tab mới | spreadsheetId, title |
| `delete_sheet` | Xoá tab | spreadsheetId, sheetTitle |
| `rename_sheet` | Đổi tên tab | spreadsheetId, oldTitle, newTitle |
| `freeze_rows` | Đóng băng N hàng đầu | spreadsheetId, sheetTitle, rows |
| `set_format` | Tô nền + chữ + bold | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, bgHex, fontHex, bold |
| `set_column_width` | Đặt chiều rộng cột | spreadsheetId, sheetTitle, startCol, endCol, width |
| `merge_cells` | Merge ô | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol |
| `set_borders` | Đặt border | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol |
| `set_number_format` | Định dạng số/ngày | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, pattern |
| `set_data_validation` | Dropdown validation | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol, values |
| `set_conditional_format` | Conditional formatting | spreadsheetId, sheetTitle, range, type, values, bgHex |
| `set_text_wrap_align` | Wrap text + căn chỉnh | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol |
| `set_protected_range` | Bảo vệ vùng | spreadsheetId, sheetTitle, startRow, endRow, startCol, endCol |
| `apply_template` | Áp nhiều request 1 lúc (batchUpdate) | spreadsheetId, requests |

### Lưu ý kỹ thuật

- Công thức Google Sheets locale Việt Nam dùng dấu `;` thay `,` — ví dụ: `=IF(A1>5;"Đạt";"Chưa đạt")`
- `spreadsheetId` lấy từ URL: `https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit`
- Muốn truy cập Sheet của người khác → người đó phải share (Viewer/Editor) cho Gmail đã auth
- `set_format` dùng gridRange 0-based (hàng/cột bắt đầu từ 0)

### Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| `Chưa có token.json` | Chưa chạy auth | `npm run auth` |
| `insufficient permission` | Sheet chưa share cho Gmail | Mở Sheet → Share → thêm Gmail |
| `Không thấy tab "..."` | Tên tab sai | Kiểm tra tên chính xác (có dấu, khoảng trắng) |
| `node: command not found` | Chưa cài Node.js | Cài Node.js theo Bước 0 |
| `git: command not found` | Chưa cài Git | Cài Git theo Bước 1 |
| `ECONNREFUSED` / `invalid_grant` | Token hết hạn | Xoá `token.json`, chạy lại `npm run auth` |
