import fs from 'node:fs';
const KEY = process.env.CPH_KEY || '';
if (!KEY) { console.error('CPH_KEY missing'); process.exit(2); }
const message = fs.readFileSync('docs/checks/order-message.txt','utf8');
const res = await fetch('https://clawhunt.store/api/v1/problems/2053/messages', {
  method:'POST',
  headers:{ authorization:'Bearer '+KEY, 'content-type':'application/json' },
  body: JSON.stringify({ message }),
  signal: AbortSignal.timeout(120000),
});
const t = await res.text();
fs.writeFileSync('docs/checks/message-response.json', JSON.stringify({ status: res.status, at: new Date().toISOString(), body: t }, null, 2));
console.log('HTTP', res.status);
console.log(t.slice(0,1500));