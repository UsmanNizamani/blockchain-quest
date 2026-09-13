import { Crypto } from './Crypto.js';
import { Transaction } from './Transaction.js';
import { eventBus } from '../core/EventBus.js';

export const NPC_MERCHANTS = [
  {
    id: "merchant_bob",
    name: "Merchant Bob (Armory & Node Shields)",
    address: "0xBob8940128394012839012839012839012839012",
    description: "Sells firewall shields and cryptographic armor"
  },
  {
    id: "merchant_alice",
    name: "Merchant Alice (Potion Lab & Gas Fuel)",
    address: "0xAlice51bf8723940128390123891238901238901",
    description: "Sells high-grade mining gas and latency elixirs"
  },
  {
    id: "merchant_charlie",
    name: "Merchant Charlie (Cyberdeck Hardware)",
    address: "0xChar72cb19283019283019283019283019283019",
    description: "Upgrades your ASIC hashing chips and antenna"
  }
];

export class Wallet {
  constructor(initialBalance = 100.0) {
    this.balance = initialBalance;
    this.stQuestBalance = 0.0;
    this.nonce = 0;
    this.txHistory = [];
    this.generateKeypair();
    console.log('[wallet] created', this.address, 'balance', this.balance);
  }

  /**
   * Generate random 256-bit private key and derive public key & address
   */
  generateKeypair() {
    // Generate 64 random hexadecimal characters (256-bit entropy)
    let randomHex = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < 64; i++) {
      randomHex += chars[Math.floor(Math.random() * 16)];
    }
    this.privateKey = randomHex;

    // Derived Public Key: SHA-256 of Private Key
    this.publicKey = Crypto.hashSync(this.privateKey);

    // Derived Address: "0x" + first 40 hex characters of hash
    this.address = '0x' + Crypto.hashSync(this.publicKey).substring(0, 40);

    eventBus.emit('WALLET_UPDATED', {
      address: this.address,
      balance: this.balance,
      stQuestBalance: this.stQuestBalance,
      publicKey: this.publicKey
    });
  }

  /**
   * Create, digitally sign, and broadcast a transaction
   * Accepts both object format { to, amount, name } and positional arguments (toAddress, amount, toName)
   * @param {string|object} toOrObj
   * @param {number} [amount]
   * @param {string} [name='']
   * @returns {Transaction}
   */
  sendTransaction(toOrObj, amount, name = '') {
    let toAddress, amt, toName;
    if (toOrObj && typeof toOrObj === 'object') {
      toAddress = toOrObj.to;
      amt       = toOrObj.amount;
      toName    = toOrObj.name || '';
    } else {
      toAddress = toOrObj;
      amt       = amount;
      toName    = name || '';
    }

    console.log('[wallet] sendTransaction →', { to: toAddress, amt, toName });

    const numAmount = Number(amt);
    if (isNaN(numAmount) || numAmount <= 0) {
      const reason = 'Transaction amount must be a positive number.';
      console.warn('[wallet] sendTransaction rejected:', reason);
      throw new Error(reason);
    }

    if (numAmount > this.balance) {
      const reason = `Insufficient funds: Balance is ${this.balance.toFixed(2)} QUEST, requested ${numAmount.toFixed(2)}.`;
      console.warn('[wallet] sendTransaction rejected:', reason);
      throw new Error(reason);
    }

    // 1. Create Transaction entity
    const tx = new Transaction(
      this.address,
      toAddress,
      numAmount,
      this.nonce,
      toName,
      Date.now()
    );

    // 2. Digitally sign with private key
    tx.sign(this.privateKey);
    console.log('[wallet] signed tx', tx.hash || tx.txHash);

    // 3. Deduct balance and increment sequence nonce
    this.balance -= numAmount;
    this.nonce++;

    // 4. Record in wallet history
    const record = {
      txHash: tx.txHash,
      from: tx.from,
      to: tx.to,
      toName: tx.toName,
      amount: tx.amount,
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      signature: tx.signature,
      status: 'CONFIRMED'
    };
    this.txHistory.unshift(record);

    // 5. Emit broadcast events
    eventBus.emit('TRANSACTION_SENT', {
      tx,
      wallet: this,
      record
    });

    eventBus.emit('WALLET_UPDATED', {
      address: this.address,
      balance: this.balance,
      stQuestBalance: this.stQuestBalance,
      publicKey: this.publicKey
    });

    return tx;
  }

  /**
   * Backward-compatible alias for sendTransaction
   */
  sendCoins(toOrObj, amount, name = '') {
    return this.sendTransaction(toOrObj, amount, name);
  }

  /**
   * Verify if a transaction's signature is authentic
   * @param {Transaction} tx
   * @returns {boolean}
   */
  verifySignature(tx) {
    if (!tx || !tx.signature) return false;
    return tx.verify(this.privateKey);
  }
}

export const playerWallet = new Wallet(100.0);
