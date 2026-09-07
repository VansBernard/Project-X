import { readFileSync } from 'fs';

const payload = JSON.parse(readFileSync('test-payload.json', 'utf-8'));

const response = await fetch('http://localhost:4000/api/v1/dealers/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log('Status:', response.status);
const data = await response.json();
console.log('Response:', JSON.stringify(data, null, 2));
