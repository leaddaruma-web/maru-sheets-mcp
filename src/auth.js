// auth.js — OAuth helper dùng chung cho cả 2 MCP server.
// Chạy trực tiếp `node src/auth.js` 1 LẦN để cấp quyền + sinh token.json.
// Khi import: dùng getAuthClient() trả về OAuth2 client đã nạp token.
//
// ⚠️ Thảo Anh tự làm: đặt credentials.json (OAuth Desktop client tải từ Google Cloud)
//    vào thư mục gốc dự án này. Claude KHÔNG đụng nội dung file này.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CRED_PATH = path.join(ROOT, "credentials.json");
const TOKEN_PATH = path.join(ROOT, "token.json");

// Đủ quyền cho Sheets + Drive + Apps Script
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/script.projects",
  "https://www.googleapis.com/auth/script.processes",
];

function loadOAuthClient() {
  if (!fs.existsSync(CRED_PATH)) {
    throw new Error("Thiếu credentials.json — tải OAuth Desktop client từ Google Cloud và đặt vào " + ROOT);
  }
  const cred = JSON.parse(fs.readFileSync(CRED_PATH, "utf8"));
  const c = cred.installed || cred.web;
  const redirect = (c.redirect_uris && c.redirect_uris[0]) || "http://localhost:4571/oauth2callback";
  return new google.auth.OAuth2(c.client_id, c.client_secret, redirect);
}

export async function getAuthClient() {
  const oAuth2Client = loadOAuthClient();
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error("Chưa có token.json — chạy `npm run auth` 1 lần để cấp quyền.");
  }
  oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")));
  return oAuth2Client;
}

// ---- Chạy trực tiếp: thực hiện luồng consent, lưu token.json ----
async function runConsentFlow() {
  const oAuth2Client = loadOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });
  console.log("\n1) Mở URL sau trong trình duyệt (đăng nhập nguyen.thao.anh@daruma.edu.vn):\n\n" + authUrl + "\n");

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, "http://localhost:4571");
        const c = u.searchParams.get("code");
        if (c) {
          res.end("Đã nhận code. Quay lại terminal — có thể đóng tab này.");
          server.close();
          resolve(c);
        } else {
          res.end("Chờ code...");
        }
      } catch (e) { reject(e); }
    }).listen(4571, () => console.log("2) Đang chờ Google chuyển hướng về http://localhost:4571 ..."));
  });

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("\n✓ Đã lưu token.json. Xong — từ giờ 2 MCP server dùng được.\n");
}

// Windows: import.meta.url dùng file:///D:/... nhưng process.argv[1] dùng D:\...
const isMain = import.meta.url.includes(path.basename(process.argv[1] || ""));
if (isMain && process.argv[1]?.endsWith("auth.js")) {
  runConsentFlow().catch((e) => { console.error("LỖI auth:", e.message); process.exit(1); });
}
