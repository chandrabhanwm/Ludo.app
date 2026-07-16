/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 1. Mock LocalStorage globally before importing any reward modules
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }
}

const mockLocalStorage = new LocalStorageMock();
(global as any).localStorage = mockLocalStorage;

// Import target systems under test
import { rewardEngine } from './rewardEngine';
import { rewardStorage } from './storage';
import { Wallet, CoinTransaction, RedemptionRequest } from './types';

// Simple lightweight test framework
interface TestContext {
  name: string;
  fn: () => void | Promise<void>;
}

const tests: TestContext[] = [];
let currentSuite = '';

function describe(suiteName: string, fn: () => void) {
  const previousSuite = currentSuite;
  currentSuite = suiteName ? `${suiteName} > ` : '';
  fn();
  currentSuite = previousSuite;
}

function it(testName: string, fn: () => void | Promise<void>) {
  tests.push({
    name: `${currentSuite}${testName}`,
    fn,
  });
}

// Fluent assertions
function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

// Setup hook before each test
function beforeEach() {
  mockLocalStorage.clear();
}

// Define the complete test suite
describe('Reward Engine Test Suite', () => {

  // ==========================================
  // Wallet Initialization & Basic Properties
  // ==========================================
  describe('Wallet Init & Update Integrity', () => {
    it('should initialize a new wallet correctly with default values', () => {
      beforeEach();
      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.currentPoints, 2500, 'Default current coins should be 2500');
      assertEquals(wallet.reservedPoints, 0, 'Default reserved coins should be 0');
      assertEquals(wallet.availablePoints, 2500, 'Default available coins should be 2500');
      assertEquals(wallet.lifetimePointsEarned, 2500, 'Default lifetime earned should be 2500');
      assertEquals(wallet.lifetimePointsRedeemed, 0, 'Default lifetime redeemed should be 0');
    });

    it('should calculate available coins correctly as (current - reserved)', () => {
      beforeEach();
      const wallet = rewardEngine.getPoints();
      wallet.currentPoints = 5000;
      wallet.reservedPoints = 1500;
      rewardStorage.saveWallet(wallet);

      const updatedWallet = rewardEngine.getPoints();
      assertEquals(updatedWallet.availablePoints, 3500, 'Available coins should be current - reserved');
    });

    it('should update current and reserved coins correctly', () => {
      beforeEach();
      rewardEngine.awardPoints(1000, 'Bonus credit');
      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.currentPoints, 3500, 'Current coins should have updated');
      assertEquals(wallet.lifetimePointsEarned, 3500, 'Lifetime earned should have updated');
    });
  });

  // ==========================================
  // Awarding Coins
  // ==========================================
  describe('Award Coins', () => {
    it('should correctly award coins for Match Win', () => {
      beforeEach();
      const rules = rewardEngine.getRules();
      const initialWallet = rewardEngine.getPoints();
      const initialCoins = initialWallet.currentPoints;

      rewardEngine.awardPoints(rules.matchWin, 'Ludo Match Win 🏆');

      const updatedWallet = rewardEngine.getPoints();
      assertEquals(updatedWallet.currentPoints, initialCoins + rules.matchWin, 'Match win coins should be added');
      
      const history = rewardEngine.getHistory();
      const latestTx = history.find(tx => tx.reason === 'Ludo Match Win 🏆');
      assert(latestTx, 'Match win transaction should be found in history');
      assertEquals(latestTx?.type, 'credit', 'Transaction type should be credit');
      assertEquals(latestTx?.pointsAdded, rules.matchWin, 'Transaction added amount should match');
      assertEquals(latestTx?.reason, 'Ludo Match Win 🏆', 'Reason should be recorded correctly');
    });

    it('should correctly award coins for Match Loss', () => {
      beforeEach();
      const rules = rewardEngine.getRules();
      const initialWallet = rewardEngine.getPoints();
      const initialCoins = initialWallet.currentPoints;

      rewardEngine.awardPoints(rules.matchLoss, 'Ludo Match Participation/Loss');

      const updatedWallet = rewardEngine.getPoints();
      assertEquals(updatedWallet.currentPoints, initialCoins + rules.matchLoss, 'Match loss coins should be added');
    });

    it('should correctly award coins for Tournament Rank positions', () => {
      beforeEach();
      const rules = rewardEngine.getRules();
      const initialWallet = rewardEngine.getPoints();
      const initialCoins = initialWallet.currentPoints;

      // Test Rank 1 (Champion)
      rewardEngine.awardPoints(rules.weeklyContestRank1, 'Tournament Champion 👑');
      let wallet = rewardEngine.getPoints();
      assertEquals(wallet.currentPoints, initialCoins + rules.weeklyContestRank1, 'Champion rank coins should be added');

      // Test Rank 2 (Qualification / Runner Up)
      const currentPoints = wallet.currentPoints;
      rewardEngine.awardPoints(rules.weeklyContestRank2, 'Tournament Runner Up');
      wallet = rewardEngine.getPoints();
      assertEquals(wallet.currentPoints, currentPoints + rules.weeklyContestRank2, 'Runner up rank coins should be added');
    });
  });

  // ==========================================
  // Redemptions & Block Duplicate Pending
  // ==========================================
  describe('Redemption Handling', () => {
    it('should succeed with redemption when player has sufficient balance', () => {
      beforeEach();
      const result = rewardEngine.createRedemption('amazon-100', 'Amazon Gift Card ₹100', 1000);
      assert(result.success, 'Redemption should succeed');
      assertEquals(result.redemption?.status, 'Pending', 'Initial status must be Pending');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 1000, '1000 coins should be reserved');
      assertEquals(wallet.availablePoints, 1500, 'Available coins should have decreased to 1500');
      assertEquals(wallet.currentPoints, 2500, 'Current coins must remain 2500 during pending status');
    });

    it('should fail with redemption when player has insufficient balance', () => {
      beforeEach();
      const result = rewardEngine.createRedemption('amazon-500', 'Amazon Gift Card ₹500', 5000);
      assert(!result.success, 'Redemption should fail');
      assert(result.message.includes('Insufficient balance'), 'Should output proper error message');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 0, 'No coins should be reserved');
      assertEquals(wallet.availablePoints, 2500, 'Available coins remain unchanged');
    });

    it('should block duplicate pending redemptions for the same reward', () => {
      beforeEach();
      // First attempt
      const result1 = rewardEngine.createRedemption('dominos-50', "Domino's Pizza ₹50", 500);
      assert(result1.success, 'First redemption should succeed');

      // Second attempt
      const result2 = rewardEngine.createRedemption('dominos-50', "Domino's Pizza ₹50", 500);
      assert(!result2.success, 'Duplicate redemption must fail');
      assertEquals(result2.message, 'You already have a pending redemption request for this reward.', 'Duplicate message matches');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 500, 'Only first cost (500 coins) should be reserved');
      assertEquals(wallet.availablePoints, 2000, 'Available coins correctly calculated');
    });
  });

  // ==========================================
  // Approval, Rejection, Cancellation, Completion
  // ==========================================
  describe('Redemption State transitions', () => {
    it('should transition to Approved correctly and permanently deduct coins', () => {
      beforeEach();
      const redResult = rewardEngine.createRedemption('amazon-100', 'Amazon Gift Card ₹100', 1000);
      const reqId = redResult.redemption!.id;

      const approved = rewardEngine.approveRedemption(reqId);
      assert(approved, 'Approval should succeed');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 0, 'Reserved coins should drop back to 0');
      assertEquals(wallet.currentPoints, 1500, 'Current coins must drop permanently to 1500');
      assertEquals(wallet.lifetimePointsRedeemed, 1000, 'Lifetime redeemed should increase to 1000');

      const redemptions = rewardEngine.getRedemptions();
      assertEquals(redemptions[0].status, 'Approved', 'Status must be Approved');
    });

    it('should transition to Rejected correctly and restore reserved coins', () => {
      beforeEach();
      const redResult = rewardEngine.createRedemption('amazon-100', 'Amazon Gift Card ₹100', 1000);
      const reqId = redResult.redemption!.id;

      const rejected = rewardEngine.rejectRedemption(reqId);
      assert(rejected, 'Rejection should succeed');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 0, 'Reserved coins should be released');
      assertEquals(wallet.currentPoints, 2500, 'Current coins restored to 2500');
      assertEquals(wallet.availablePoints, 2500, 'Available coins restored to 2500');

      const redemptions = rewardEngine.getRedemptions();
      assertEquals(redemptions[0].status, 'Rejected', 'Status must be Rejected');
    });

    it('should transition to Cancelled correctly and restore reserved coins', () => {
      beforeEach();
      const redResult = rewardEngine.createRedemption('amazon-100', 'Amazon Gift Card ₹100', 1000);
      const reqId = redResult.redemption!.id;

      const cancelled = rewardEngine.cancelRedemption(reqId);
      assert(cancelled, 'Cancellation should succeed');

      const wallet = rewardEngine.getPoints();
      assertEquals(wallet.reservedPoints, 0, 'Reserved coins should be released');
      assertEquals(wallet.currentPoints, 2500, 'Current coins remains 2500');
      assertEquals(wallet.availablePoints, 2500, 'Available coins restored');

      const redemptions = rewardEngine.getRedemptions();
      assertEquals(redemptions[0].status, 'Cancelled', 'Status must be Cancelled');
    });

    it('should transition to Completed correctly, adding a mock voucher delivery code', () => {
      beforeEach();
      const redResult = rewardEngine.createRedemption('amazon-100', 'Amazon Gift Card ₹100', 1000);
      const reqId = redResult.redemption!.id;

      // Approve first
      rewardEngine.approveRedemption(reqId);

      // Now complete
      const completed = rewardEngine.completeRedemption(reqId);
      assert(completed, 'Completion should succeed');

      const redemptions = rewardEngine.getRedemptions();
      const req = redemptions[0];
      assertEquals(req.status, 'Completed', 'Status must be Completed');
      assert(req.rewardCode && req.rewardCode.length > 5, 'Voucher code should be generated');
    });
  });

  // ==========================================
  // Immutable Append-Only Ledger Integrity
  // ==========================================
  describe('Immutable Append-Only Transaction Ledger', () => {
    it('should record distinct transaction records without editing existing entries', () => {
      beforeEach();
      
      // Initially, there's the default onboarding transaction 'Welcome Bonus'
      const startHistory = rewardEngine.getHistory();
      assertEquals(startHistory.length, 1, 'Should start with exactly 1 Welcome transaction');

      // 1. Earn win bonus (+500)
      rewardEngine.awardPoints(500, 'Match Win');
      const winHistory = rewardEngine.getHistory();
      assertEquals(winHistory.length, 2, 'Should have 2 transactions now');
      
      // 2. Create pending redemption (cost 1000)
      const redResult = rewardEngine.createRedemption('gift-card', 'Gift Card', 1000);
      const reqId = redResult.redemption!.id;
      const reserveHistory = rewardEngine.getHistory();
      assertEquals(reserveHistory.length, 3, 'Should have 3 transactions now (onboarding, win, reservation)');

      // 3. Approve redemption
      rewardEngine.approveRedemption(reqId);
      const approveHistory = rewardEngine.getHistory();
      assertEquals(approveHistory.length, 4, 'Should have 4 transactions now (added Approval debit)');

      // 4. Complete redemption
      rewardEngine.completeRedemption(reqId);
      const completeHistory = rewardEngine.getHistory();
      assertEquals(completeHistory.length, 5, 'Should have 5 transactions now (added Voucher delivery entry)');

      // Verify each transaction's integrity (no modification)
      const welcomeTx = completeHistory.find(tx => tx.id === 'tx-welcome');
      assert(welcomeTx, 'Welcome transaction must exist');
      assertEquals(welcomeTx?.pointsAdded, 2500, 'Welcome coins must not be mutated');
      assertEquals(welcomeTx?.type, 'credit', 'Welcome type must not be mutated');

      const reservationTx = completeHistory.find(tx => tx.reason.includes('Reserved for Gift Card'));
      assert(reservationTx, 'Reservation transaction must exist');
      assertEquals(reservationTx?.pointsRemoved, 1000, 'Reservation coins value is correct');
      assertEquals(reservationTx?.type, 'reserve', 'Reservation type is reserve');

      const approvalTx = completeHistory.find(tx => tx.reason.includes('Redemption Approved: Gift Card'));
      assert(approvalTx, 'Approval transaction must exist');
      assertEquals(approvalTx?.pointsRemoved, 1000, 'Approval transaction removed 1000 coins permanently');
      assertEquals(approvalTx?.type, 'finalize', 'Approval type is finalize');

      const deliveryTx = completeHistory.find(tx => tx.reason.includes('Reward Delivered: Gift Card'));
      assert(deliveryTx, 'Delivery transaction must exist');
      assertEquals(deliveryTx?.type, 'finalize', 'Delivery type is finalize');
    });
  });

  // ==========================================
  // Storage Persistence Integrity
  // ==========================================
  describe('Persistence Adapter Integrity', () => {
    it('should persist wallet updates to localStorage', () => {
      beforeEach();
      const testWallet: Wallet = {
        currentPoints: 9999,
        reservedPoints: 50,
        availablePoints: 9949,
        lifetimePointsEarned: 12000,
        lifetimePointsRedeemed: 2001,
      };

      rewardStorage.saveWallet(testWallet);

      // Re-read directly from local storage key
      const storedString = mockLocalStorage.getItem('ludo_reward_wallet');
      assert(storedString, 'Wallet must be present in local storage');
      
      const parsed = JSON.parse(storedString!);
      assertEquals(parsed.currentPoints, 9999, 'Parsed current coins matches');
      assertEquals(parsed.lifetimePointsRedeemed, 2001, 'Parsed lifetime redeemed matches');
    });

    it('should persist transaction updates to localStorage', () => {
      beforeEach();
      const transactions: CoinTransaction[] = [
        {
          id: 'tx-test-1',
          date: '2026-07-11',
          time: '12:00:00',
          reason: 'Test 1',
          type: 'credit',
          pointsAdded: 100,
          pointsRemoved: 0,
          balanceAfter: 2600,
        }
      ];

      rewardStorage.saveTransactions(transactions);

      const storedString = mockLocalStorage.getItem('ludo_reward_transactions');
      assert(storedString, 'Transactions list must be present in local storage');
      
      const parsed = JSON.parse(storedString!);
      assertEquals(parsed.length, 1, 'Parsed transactions list has 1 entry');
      assertEquals(parsed[0].id, 'tx-test-1', 'Parsed transaction ID matches');
    });

    it('should persist redemption updates to localStorage', () => {
      beforeEach();
      const redemptions: RedemptionRequest[] = [
        {
          id: 'req-test-1',
          rewardId: 'amazon-100',
          rewardName: 'Amazon Card',
          pointCost: 1000,
          requestedDate: '2026-07-11',
          status: 'Pending',
        }
      ];

      rewardStorage.saveRedemptions(redemptions);

      const storedString = mockLocalStorage.getItem('ludo_reward_redemptions');
      assert(storedString, 'Redemptions list must be present in local storage');

      const parsed = JSON.parse(storedString!);
      assertEquals(parsed.length, 1, 'Parsed redemptions list has 1 entry');
      assertEquals(parsed[0].id, 'req-test-1', 'Parsed redemption ID matches');
    });
  });

});

// Execution Orchestrator
async function runTests() {
  console.log('\n======================================================');
  console.log('🛡️  REWARD ENGINE AUTOMATED TEST RUNNER');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✅  PASSED: ${test.name}`);
      passed++;
    } catch (error: any) {
      console.log(`  ❌  FAILED: ${test.name}`);
      console.error(`      ${error.message || error}\n`);
      failed++;
    }
  }

  console.log('\n======================================================');
  console.log('📊  TEST SUMMARY');
  console.log('======================================================');
  console.log(`  Total Tests:  ${tests.length}`);
  console.log(`  Passed:       \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed:       ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the tests
runTests();
