import { Crypto } from './Crypto.js';

/**
 * Transaction - Represents a digitally signed transfer of value
 * Contains: from, to, amount, nonce, timestamp, signature, txHash
 */
export class Transaction {
  /**
   * @param {string} from - Sender address / public identifier
   * @param {string} to - Recipient address
   * @param {number} amount - Transfer amount
   * @param {number} nonce - Sequential counter preventing replay attacks
   * @param {string} toName - Friendly recipient label
   * @param {number} timestamp - Creation timestamp
   */
  constructor(from, to, amount, nonce = 0, toName = '', timestamp = Date.now()) {
    this.from = from;
    this.to = to;
    this.toName = toName;
    this.amount = Number(amount);
    this.nonce = nonce;
    this.timestamp = timestamp;
    this.txHash = this.calculateHash();
    this.signature = null;
  }

  /**
   * Alias getter for txHash
   * @returns {string}
   */
  get hash() {
    return this.txHash;
  }

  /**
   * Computes SHA-256 digest of transaction payload
   * @returns {string}
   */
  calculateHash() {
    const payload = `${this.from}|${this.to}|${this.amount}|${this.nonce}|${this.timestamp}`;
    return Crypto.hashSync(payload);
  }

  /**
   * Digitally sign the transaction with the sender's private key
   * Simulated asymmetric signature: SHA-256(txHash + privateKey)
   * @param {string} privateKey
   * @returns {string}
   */
  sign(privateKey) {
    if (!privateKey) {
      throw new Error('Cannot sign transaction without a private key.');
    }
    this.txHash = this.calculateHash();
    // Simulated digital signature algorithm
    this.signature = Crypto.hashSync(`${this.txHash}:${privateKey}`);
    return this.signature;
  }

  /**
   * Verify if the signature is valid for this transaction
   * @param {string} privateKeyForVerification - In simulation, checks against key
   * @returns {boolean}
   */
  verify(privateKeyForVerification) {
    if (!this.signature) return false;
    const expected = Crypto.hashSync(`${this.calculateHash()}:${privateKeyForVerification}`);
    return this.signature === expected;
  }

  /**
   * Human-readable summary
   * @returns {string}
   */
  getSummary() {
    const recipient = this.toName || this.to.substring(0, 10) + '...';
    return `${this.amount.toFixed(2)} QUEST -> ${recipient}`;
  }
}
