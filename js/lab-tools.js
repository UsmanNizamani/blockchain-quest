/**
 * Lab Tools - Standalone and embeddable cryptographic lab tools
 * Provides:
 *  - HashPlayground: live SHA-256 computation, avalanche effect, and defensive fallback
 *  - TamperingDemo: real-time block tampering, chain integrity validation, and PoW repair
 */

import { Crypto } from './blockchain/Crypto.js';
import { defaultBlockchain } from './blockchain/Blockchain.js';
import { eventBus } from './core/EventBus.js';

export class HashPlayground {
  /**
   * Asynchronously compute SHA-256 hash with fallback to sync JS on file://
   * @param {string} text
   * @returns {Promise<string>}
   */
  static async sha256(text) {
    if (typeof text !== 'string') {
      text = String(text ?? '');
    }
    return await Crypto.sha256(text);
  }

  /**
   * Synchronous SHA-256 computation
   * @param {string} text
   * @returns {string}
   */
  static sha256Sync(text) {
    if (typeof text !== 'string') {
      text = String(text ?? '');
    }
    return Crypto.sha256Sync(text);
  }

  /**
   * Calculate percentage difference between two 64-char hex hashes
   * @param {string} hex1
   * @param {string} hex2
   * @returns {number}
   */
  static calculateAvalanche(hex1, hex2) {
    return Crypto.calculateAvalanche(hex1, hex2);
  }
}

export class TamperingDemo {
  /**
   * Tamper with a block and re-evaluate chain integrity
   * @param {number} index
   * @param {*} newData
   * @returns {Promise<{ integrity: Object, block: Object }>}
   */
  static async tamperBlock(index, newData) {
    const integrity = await defaultBlockchain.tamperBlock(index, newData);
    return {
      integrity,
      block: defaultBlockchain.chain[index]
    };
  }

  /**
   * Get current chain integrity status
   * @returns {Object}
   */
  static getChainIntegrity() {
    return defaultBlockchain.getChainIntegrity();
  }

  /**
   * Repair chain via Proof of Work re-mining
   * @param {number} [startIndex=0]
   * @returns {Promise<Object>}
   */
  static async repairChain(startIndex = 0) {
    return await defaultBlockchain.repairChain(startIndex);
  }
}

export { Crypto, defaultBlockchain, eventBus };
