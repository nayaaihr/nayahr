/* ============================================================
   NayaHR dev proxy
   ------------------------------------------------------------
   Tiny zero-dependency relay so the Anthropic API key never
   reaches the browser. It does two things:
     1. Serves nayahr-prototype.html (and sibling files).
     2. Relays POST /api/claude  ->  api.anthropic.com/v1/messages,
        injecting the API key from the environment.

   The browser builds the full Claude request body (model, tools,
   messages); this proxy only adds auth headers and forwards. The
   employee data stays in the browser's localStorage and never
   passes through here — tools execute client-side.

   Run:
     export ANTHROPIC_API_KEY=sk-ant-...
     node proxy.js
     open http://localhost:8787
   ============================================================ */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 8787;

if (!KEY) {
  console.error('\n  Missing ANTHROPIC_API_KEY.\n  Set it first:  export ANTHROPIC_API_KEY=sk-ant-...\n');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // ---- API relay ----
  if (req.method === 'POST' && req.url === '/api/claude') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      const upstream = https.request(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': KEY,
            'anthropic-version': '2023-06-01',
            'content-length': Buffer.byteLength(body),
          },
        },
        apiRes => {
          res.writeHead(apiRes.statusCode, { 'content-type': 'application/json' });
          apiRes.pipe(res);
        }
      );
      upstream.on('error', e => {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { type: 'proxy_error', message: String(e) } }));
      });
      upstream.write(body);
      upstream.end();
    });
    return;
  }

  // ---- Static files ----
  const rel = req.url === '/' || req.url === '/index.html'
    ? 'nayahr-prototype.html'
    : decodeURIComponent(req.url.split('?')[0]).slice(1);
  // keep reads inside this directory
  const fp = path.join(__dirname, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(fp, (e, data) => {
    if (e) { res.writeHead(404); res.end('Not found'); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'content-type': types[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`\n  NayaHR  ->  http://localhost:${PORT}\n  (Ctrl+C to stop)\n`));
