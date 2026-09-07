import fetch from 'node-fetch';

const body = {
  dealer: {
    name: 'Test Dealer Signup',
    legalName: 'Test Dealer Signup',
    slug: `test-dealer-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '1234567890',
    country: 'NG',
    timezone: 'UTC',
    metadata: {}
  },
  owner: {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'Dealer',
    phone: '1234567890'
  }
};

const response = await fetch('http://localhost:4000/api/v1/dealers/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

console.log('status', response.status);
const text = await response.text();
console.log('body', text);
