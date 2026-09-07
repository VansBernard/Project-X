import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDealerSettlementInfo } from './dealer-management.service.js';

test('hasDealerSettlementInfo returns false when no payout details were supplied', () => {
  assert.equal(hasDealerSettlementInfo({}), false);
  assert.equal(hasDealerSettlementInfo(undefined), false);
});

test('hasDealerSettlementInfo returns true when bank payout details are supplied', () => {
  assert.equal(hasDealerSettlementInfo({ payoutMethod: 'bank', settlementBank: '058', settlementAccountNumber: '1234567890' }), true);
});

test('hasDealerSettlementInfo returns true when mobile money payout details are supplied', () => {
  assert.equal(hasDealerSettlementInfo({ payoutMethod: 'mobile_money', mobileMoneyProvider: 'MTN', mobileMoneyNumber: '0240000000' }), true);
});
