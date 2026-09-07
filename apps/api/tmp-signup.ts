import { dealerManagementService } from './src/modules/dealers/dealer-management.service.js';

try {
  const result = await dealerManagementService.signup({
    dealer: {
      name: 'Temp Dealer',
      legalName: 'Temp Dealer',
      slug: 'temp-dealer-999',
      email: 'temp999@example.com',
      phone: '123456',
      country: 'NG',
      timezone: 'UTC',
      metadata: {}
    },
    owner: {
      email: 'temp999@example.com',
      password: 'password123',
      firstName: 'Temp',
      lastName: 'Dealer',
      phone: '123456'
    }
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('SIGNUP_ERROR', error);
  if (error instanceof Error) {
    console.error(error.stack);
  }
  process.exit(1);
}
