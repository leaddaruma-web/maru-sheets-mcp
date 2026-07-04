# maru-sheets-mcp

MCP server cho phép AI agent đọc/ghi/format Google Sheets qua API v4.

---

## 👩‍💼 DÀNH CHO NGƯỜI DÙNG (không cần biết code)

### Bạn cần gì?

1. **Máy tính** có cài [Node.js](https://nodejs.org/) (tải bản LTS, cài Next-Next-Finish)
2. **Antigravity 2.0** (đã cài trên máy)
3. **Tài khoản Gmail** (cá nhân hoặc công ty đều được)

### Cách cài — chỉ cần làm 1 lần

**Bước 1:** Mở Antigravity 2.0, paste NGUYÊN VĂN đoạn prompt sau:

```
Tôi cần bạn cài đặt MCP server "maru-sheets-mcp" để tôi có thể đọc/ghi Google Sheets.

Hướng dẫn:
1. Clone repo: git clone https://github.com/leaddaruma-web/maru-sheets-mcp.git
2. Vào thư mục: cd maru-sheets-mcp
3. Cài dependencies: npm install
4. Chạy xác thực: npm run auth (sẽ mở trình duyệt để tôi đăng nhập Gmail)
5. Sau khi tôi đăng nhập xong, cấu hình MCP server vào tool settings với:
   - Command: node
   - Args: src/sheets-server.js
   - Working directory: đường dẫn thư mục maru-sheets-mcp vừa clone

Bắt đầu từ bước 1.
```

**Bước 2:** Khi trình duyệt mở ra → đăng nhập Gmail → click **"Cho phép"** (hoặc "Allow")

**Bước 3:** Quay lại Antigravity, đợi AI agent hoàn tất cấu hình → **XONG!**

### Sau khi cài xong, bạn có thể bảo AI:

- *"Đọc dữ liệu từ Sheet [link] tab Nhật ký, cột A đến K"*
- *"Ghi danh sách sau vào Sheet [link] tab Tổng hợp, bắt đầu từ ô A2"*
- *"Tạo tab mới tên 'Tháng 7' trong Sheet [link]"*
- *"Format header tab Tổng hợp: nền navy, chữ trắng, bold"*
- *"Set công thức =SUM(B2:B100) vào ô B101"*

### Lưu ý quan trọng

- **Sheet phải được share** cho Gmail bạn đã đăng nhập lúc cài đặt (ít nhất quyền Editor nếu muốn ghi)
- **spreadsheetId** là đoạn mã trong URL Sheet: `https://docs.google.com/spreadsheets/d/`**đoạn-này-là-ID**`/edit`
- Nếu gặp lỗi "insufficient permission" → mở Sheet đó, click Share, thêm Gmail của bạn

---

## 🤖 DÀNH CHO AI CODING AGENT — đọc phần này để tự cài đặt

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
