async function main() {
  const response = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealerSlug: 'test-dealer', email: 'admin@test.com', password: 'password123' })
  });

  console.log('status', response.status);
  const body = await response.text();
  console.log(body);
}

main().catch(console.error);
