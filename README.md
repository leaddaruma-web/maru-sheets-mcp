# maru-sheets-mcp

MCP server cho phép AI agent đọc/ghi/format Google Sheets qua API v4.

## Dành cho AI coding agent — đọc phần này để tự cài đặt

### Yêu cầu
- Node.js >= 18
- npm

### Cài đặt (3 bước)

```bash
# 1. Cài dependencies
npm install

# 2. Chạy xác thực OAuth (chỉ cần 1 lần)
npm run auth
# → Trình duyệt sẽ mở ra, người dùng đăng nhập Gmail rồi click "Cho phép"
# → File token.json được tạo tự động

# 3. Chạy thử server
npm start
```

### Cấu hình MCP trong AI tool

Thêm vào file cấu hình MCP của tool đang dùng:

**Claude Code** (`.claude.json` hoặc `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "maru-sheets": {
      "command": "node",
      "args": ["src/sheets-server.js"],
      "cwd": "<đường-dẫn-tới-thư-mục-này>"
    }
  }
}
```

**Antigravity / tool khác** — tương tự, trỏ command `node` + args `src/sheets-server.js` + cwd là thư mục chứa repo này.

### Các tool có sẵn sau khi cài

| Tool | Mô tả |
|------|--------|
| `list_sheets` | Liệt kê các tab trong 1 spreadsheet |
| `read_range` | Đọc giá trị 1 vùng (A1 notation) |
| `write_range` | Ghi giá trị 2D vào 1 vùng |
| `set_formula` | Set công thức vào 1 ô (locale VN: dùng `;`) |
| `add_sheet` | Thêm tab mới |
| `delete_sheet` | Xoá tab |
| `rename_sheet` | Đổi tên tab |
| `freeze_rows` | Đóng băng N hàng đầu |
| `set_format` | Tô nền + chữ + bold cho 1 vùng |
| `set_column_width` | Đặt chiều rộng cột |
| `merge_cells` | Merge ô |
| `set_borders` | Đặt border |
| `set_number_format` | Định dạng số/ngày |
| `set_data_validation` | Dropdown validation |
| `set_conditional_format` | Conditional formatting |
| `set_text_wrap_align` | Wrap text + căn chỉnh |
| `set_protected_range` | Bảo vệ vùng |
| `apply_template` | Áp template nhiều request 1 lúc |

### Lưu ý
- Công thức Google Sheets locale Việt Nam dùng dấu `;` thay `,` — ví dụ: `=IF(A1>5;"Đạt";"Chưa đạt")`
- `spreadsheetId` lấy từ URL: `https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit`
- Muốn truy cập Sheet của người khác → người đó phải share (Viewer/Editor) cho Gmail đã auth

### Xử lý lỗi thường gặp
- `Chưa có token.json` → chạy `npm run auth`
- `insufficient permission` → Sheet chưa được share cho Gmail đã đăng nhập
- `Không thấy tab "..."` → kiểm tra tên tab chính xác (có dấu, có khoảng trắng)
