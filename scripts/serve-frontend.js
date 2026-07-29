const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "frontend");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8081);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  });
}).listen(port, host, () => {
  console.log(`🌐 前端服务已启动: http://${host}:${port}/`);
  console.log("   顾客端: http://127.0.0.1:8081/customer.html");
  console.log("   商家端: http://127.0.0.1:8081/merchant.html");
  console.log("   骑手端: http://127.0.0.1:8081/rider.html");
  console.log("   管理端: http://127.0.0.1:8081/admin.html");
  console.log("按 Ctrl+C 停止服务。");
});
