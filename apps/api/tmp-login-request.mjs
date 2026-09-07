import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('./tmp-login.json', import.meta.url), 'utf8'));
const response = await fetch('http://localhost:4000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

console.log(response.status);
console.log(await response.text());
