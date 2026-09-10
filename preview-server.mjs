import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url, 'http://localhost').pathname;
    const relative = requestPath === '/' ? 'index.html' : requestPath.slice(1);
    const filePath = normalize(join(root, relative));
    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
