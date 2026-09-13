import { Transaction } from './Transaction.js';
import { Crypto } from './Crypto.js';
import { eventBus } from '../core/EventBus.js';

export const DOUBLE_SPEND_MERCHANTS = [
  {
    id: "merchant_a",
    name: "Merchant A (Armory & Armor)",
    address: "0xMerchantA_894012839401283901283901283901",
    avatar: "🛡️"
  },
  {
    id: "merchant_b",
    name: "Merchant B (Potion & Fuel Lab)",
    address: "0xMerchantB_51bf87239401283901238912389012",
    avatar: "🧪"
  }
];

export class DoubleSpendSim {
  constructor() {
    this.isActive = false;
    this.initialBalance = 10.0;
    this.balance = 10.0;
    this.currentNonce = 0;

    // Fixed mock keypair for reproducible simulation
    this.privateKey = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
    this.publicKey = Crypto.hashSync(this.privateKey);
    this.address = "0x" + Crypto.hashSync(this.publicKey).substring(0, 40);

    // Scenario steps:
    // 'ready' -> 'mempool' (Tx1 sent to Merchant A) -> 'rejected' (Tx2 attempted with duplicate nonce)
    this.step = 'ready';
    this.tx1 = null;
    this.tx2 = null;
    this.mempool = [];
    this.collisionDetected = false;
    this.rejectionReason = '';
    this._timer1 = null;
    this._timer2 = null;

    this.reset();
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[doubleSpendSim] activate');
    eventBus.emit('DOUBLE_SPEND_ACTIVATED', {});
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    console.log('[doubleSpendSim] deactivate');
    if (this._timer1) { clearTimeout(this._timer1); this._timer1 = null; }
    if (this._timer2) { clearTimeout(this._timer2); this._timer2 = null; }
    eventBus.emit('DOUBLE_SPEND_DEACTIVATED', {});
  }

  reset() {
    if (this._timer1) { clearTimeout(this._timer1); this._timer1 = null; }
    if (this._timer2) { clearTimeout(this._timer2); this._timer2 = null; }
    this.step = 'ready';
    this.balance = 10.0;
    this.currentNonce = 0;
    this.tx1 = null;
    this.tx2 = null;
    this.mempool = [];
    this.collisionDetected = false;
    this.rejectionReason = '';

    eventBus.emit('DOUBLE_SPEND_RESET', {
      balance: this.balance,
      nonce: this.currentNonce
    });
  }

  /**
   * Step 1: Send all 10 coins to Merchant A (enters Mempool with Nonce #0)
   */
  sendTx1() {
    if (this.step !== 'ready') return;

    const merchantA = DOUBLE_SPEND_MERCHANTS[0];
    const amount = 10.0;

    // Create and sign Tx1
    const tx = new Transaction(
      this.address,
      merchantA.address,
      amount,
      this.currentNonce, // Nonce #0
      merchantA.name,
      Date.now()
    );
    tx.sign(this.privateKey);

    this.tx1 = tx;
    this.mempool = [tx];
    this.step = 'mempool';

    eventBus.emit('DOUBLE_SPEND_TX1_SENT', {
      tx,
      mempool: this.mempool,
      remainingBalance: 0
    });
  }

  /**
   * Step 2: Attempt to spend the same 10 coins to Merchant B using duplicate Nonce #0
   */
  attemptDoubleSpend() {
    if (this.step !== 'mempool') return;

    const merchantB = DOUBLE_SPEND_MERCHANTS[1];
    const amount = 10.0;

    // Malicious player crafts duplicate transaction with the SAME Nonce #0
    const duplicateTx = new Transaction(
      this.address,
      merchantB.address,
      amount,
      this.currentNonce, // Nonce #0 (Collision!)
      merchantB.name,
      Date.now()
    );
    duplicateTx.sign(this.privateKey);

    this.tx2 = duplicateTx;

    eventBus.emit('DOUBLE_SPEND_ATTEMPTED', {
      tx: duplicateTx,
      collidingNonce: this.currentNonce
    });

    // Simulate validator nodes inspecting the mempool and catching the duplicate nonce
    this._timer1 = setTimeout(() => {
      this.collisionDetected = true;
      this.rejectionReason = "NONCE ALREADY USED";
      this.step = 'rejected';

      eventBus.emit('DOUBLE_SPEND_REJECTED', {
        collidingNonce: this.currentNonce,
        existingTx: this.tx1,
        rejectedTx: this.tx2,
        rejectionReason: this.rejectionReason
      });

      // Show Educational Modal
      this._timer2 = setTimeout(() => {
        eventBus.emit('SHOW_DOUBLE_SPEND_MODAL', {
          existingTx: this.tx1,
          rejectedTx: this.tx2,
          rejectionReason: this.rejectionReason
        });
      }, 500);
    }, 400);
  }
}

export const doubleSpendSim = new DoubleSpendSim();
