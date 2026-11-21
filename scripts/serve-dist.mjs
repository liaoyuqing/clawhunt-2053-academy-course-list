import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * 极简静态服务器：只用于给 Playwright 提供 http:// 源（file:// 下浏览器路由与 localStorage 都不正常）。
 * SPA 回退：任何未命中文件的路径都返回 index.html。
 * 只监听 127.0.0.1，不对外暴露；不引用任何外部资源。
 */
const DIST = path.resolve('dist');
const PORT = Number(process.env.PORT ?? 5201);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.webm': 'video/webm',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    file = path.join(DIST, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write('serving dist on http://127.0.0.1:' + PORT + '\n');
});
