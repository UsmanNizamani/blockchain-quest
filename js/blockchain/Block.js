import { Crypto } from './Crypto.js';

/**
 * Block - Represents an individual block within the Blockchain
 * Contains: index, timestamp, data, previousHash, hash, nonce
 */
export class Block {
  /**
   * @param {number} index
   * @param {string|Object} data
   * @param {string} previousHash
   * @param {number} nonce
   * @param {number} timestamp
   * @param {number} difficulty
   * @param {boolean} isMined
   */
  constructor(index, data, previousHash = '', nonce = 0, timestamp = Date.now(), difficulty = 1, isMined = true) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.isMined = isMined;
    this.miningStats = null; // { attempts, timeMs, hashRate, difficulty }
    this.hash = this.calculateHash();
    this.originalData = typeof data === 'object' && data !== null ? JSON.parse(JSON.stringify(data)) : data;
    this.originalHash = this.hash;
    this.originalNonce = this.nonce;
    this.originalSummary = this.getSummary();
  }

  /**
   * Header payload string for cryptographic hashing
   * @returns {string}
   */
  getPayload() {
    const dataStr = typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
    return `${this.index}|${this.previousHash}|${this.timestamp}|${dataStr}|${this.nonce}|${this.difficulty}`;
  }

  /**
   * Synchronous SHA-256 calculation
   * @returns {string} 64-char hex hash
   */
  calculateHash() {
    return Crypto.hashSync(this.getPayload());
  }

  /**
   * Asynchronous SHA-256 calculation using Web Crypto API
   * @returns {Promise<string>}
   */
  async calculateHashAsync() {
    const computed = await Crypto.hash(this.getPayload());
    this.hash = computed;
    return computed;
  }

  /**
   * Mine block synchronously with target difficulty (Proof-of-Work)
   * @param {number} difficulty
   */
  mineBlock(difficulty = this.difficulty) {
    this.difficulty = difficulty;
    const targetPrefix = '0'.repeat(difficulty);

    const startTime = Date.now();
    let attempts = 0;

    while (!this.hash.startsWith(targetPrefix)) {
      this.nonce++;
      attempts++;
      this.hash = this.calculateHash();
    }

    const elapsed = Math.max(1, Date.now() - startTime);
    this.isMined = true;
    this.originalHash = this.hash;
    this.originalNonce = this.nonce;
    this.miningStats = {
      attempts,
      timeMs: elapsed,
      hashRate: Math.round((attempts / elapsed) * 1000),
      difficulty
    };

    return this.hash;
  }

  /**
   * Set results from asynchronous mining engine
   * @param {{ attempts: number, timeMs: number, hashRate: number, difficulty: number }} stats
   */
  setMiningStats(stats) {
    this.isMined = true;
    this.miningStats = stats;
    this.originalHash = this.hash;
    this.originalNonce = this.nonce;
  }

  /**
   * Verify if block satisfies Proof of Work target difficulty
   * Demonstrates: O(1) instant verification vs O(16^D) work
   * @param {number} difficulty
   * @returns {boolean}
   */
  verifyProofOfWork(difficulty = this.difficulty) {
    const targetPrefix = '0'.repeat(difficulty);
    return this.isValid() && this.hash.startsWith(targetPrefix);
  }

  /**
   * Tamper with block data and recalculate its hash via Web Crypto API
   * @param {string|Object} newData
   * @returns {Promise<string>}
   */
  async tamper(newData) {
    const cleanStr = typeof newData === 'string' ? newData.trim() : '';
    const isRestore = 
      newData === this.originalSummary ||
      cleanStr === this.originalSummary ||
      (this.originalSummary && (cleanStr === "Alice -> Bob" || cleanStr === "Alice → Bob") && this.originalSummary.startsWith("Alice -> Bob")) ||
      (typeof this.originalData === 'object' && this.originalData !== null && (cleanStr === this.originalData.tx || cleanStr === this.originalData.summary)) ||
      (typeof this.originalData === 'string' && cleanStr === this.originalData);

    if (isRestore) {
      this.data = typeof this.originalData === 'object' && this.originalData !== null 
        ? JSON.parse(JSON.stringify(this.originalData)) 
        : this.originalData;
      this.hash = this.originalHash;
      if (this.originalNonce !== undefined) this.nonce = this.originalNonce;
      return this.hash;
    }

    if (typeof this.originalData === 'object' && this.originalData !== null) {
      this.data = typeof newData === 'object' && newData !== null 
        ? newData 
        : { ...this.originalData, tx: newData, summary: newData };
    } else {
      this.data = newData;
    }
    return await this.calculateHashAsync();
  }

  /**
   * Verify if block's internal hash matches recalculated hash
   * @returns {boolean}
   */
  isValid() {
    return this.hash === this.calculateHash();
  }

  /**
   * Short transaction summary for card display
   * @returns {string}
   */
  getSummary() {
    if (typeof this.data === 'string') return this.data;
    if (this.data && this.data.summary) return this.data.summary;
    if (this.data && this.data.tx) return this.data.tx;
    if (this.data && this.data.message) return this.data.message;
    return JSON.stringify(this.data);
  }
}
