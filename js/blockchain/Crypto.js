/**
 * Crypto - Cryptographic utilities for Blockchain Quest
 * Supports synchronous pure JS SHA-256 and Web Crypto API
 */

// Pure JS SHA-256 implementation for synchronous operations & fallback
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export class Crypto {
  /**
   * Synchronous SHA-256 calculation
   * @param {string} data
   * @returns {string} 64-character hex string
   */
  static hashSync(data) {
    return sha256Sync(data || '');
  }

  /**
   * Async SHA-256 calculation using Web Crypto API
   * Falls back to synchronous JS SHA-256 if crypto.subtle is unavailable (e.g. on file://)
   * @param {string} data
   * @returns {Promise<string>}
   */
  static async hash(data) {
    const subtle = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto.subtle : null;
    if (subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(data || '');
        const hashBuffer = await subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        return sha256Sync(data || '');
      }
    }
    return sha256Sync(data || '');
  }

  /**
   * Async SHA-256 calculation (standard alias)
   * @param {string} data
   * @returns {Promise<string>}
   */
  static async sha256(data) {
    return await this.hash(data);
  }

  /**
   * Synchronous SHA-256 calculation (standard alias)
   * @param {string} data
   * @returns {string}
   */
  static sha256Sync(data) {
    return this.hashSync(data);
  }

  /**
   * Calculate avalanche bit flip percentage between two hashes
   * @param {string} hex1
   * @param {string} hex2
   * @returns {number} Percentage of bits flipped (0-100)
   */
  static calculateAvalanche(hex1, hex2) {
    return this.calculateBitDiff(hex1, hex2).percentage;
  }

  /**
   * Convert hex to 256-bit binary string
   * @param {string} hex
   * @returns {string}
   */
  static hexToBinary(hex) {
    let bin = '';
    for (let i = 0; i < hex.length; i++) {
      const n = parseInt(hex[i], 16);
      bin += n.toString(2).padStart(4, '0');
    }
    return bin;
  }

  /**
   * Calculate bit flip difference between two hashes (Avalanche effect)
   * @param {string} hex1
   * @param {string} hex2
   * @returns {{ flippedBits: number, totalBits: number, percentage: number }}
   */
  static calculateBitDiff(hex1, hex2) {
    if (!hex1 || !hex2 || hex1.length !== 64 || hex2.length !== 64) {
      return { flippedBits: 0, totalBits: 256, percentage: 0 };
    }

    const bin1 = this.hexToBinary(hex1);
    const bin2 = this.hexToBinary(hex2);
    let flipped = 0;

    for (let i = 0; i < 256; i++) {
      if (bin1[i] !== bin2[i]) flipped++;
    }

    return {
      flippedBits: flipped,
      totalBits: 256,
      percentage: Number(((flipped / 256) * 100).toFixed(2))
    };
  }

  /**
   * Count number of leading zero characters in hex string
   * @param {string} hex
   * @returns {number}
   */
  static countLeadingZeros(hex) {
    let count = 0;
    for (let i = 0; i < hex.length; i++) {
      if (hex[i] === '0') count++;
      else break;
    }
    return count;
  }
}
