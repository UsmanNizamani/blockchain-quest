import { eventBus } from '../core/EventBus.js';
import { Crypto } from './Crypto.js';
import { difficultyAdjuster } from './DifficultyAdjuster.js';

/**
 * ConsensusPoW - Asynchronous Proof-of-Work Mining Engine
 * Uses Web Crypto API SHA-256 and high-throughput non-blocking batch iterations.
 * Tracks live hashrate, elapsed time, current best hash, energy meter, and network hashrate.
 */
export class ConsensusPoW {
  constructor() {
    this.isMining = false;
    this.currentBlock = null;
    this.difficulty = 2; // Default Easy ("00") for swift initial discovery
    this.batchSize = 800; // Hashes evaluated per frame
    this.attempts = 0;
    this.startTime = 0;
    this.lastTelemetryTime = 0;
    this.animFrameId = null;

    // Enhanced PoW Telemetry
    this.currentBestHash = '';
    this.bestLeadingZeros = 0;
    this.joulesBurned = 0;
    this.wattHours = 0;
    this.blockReward = 50.0; // 50 QUEST coins per mined block
  }

  /**
   * Set mining target difficulty (1 to 5 leading zeros)
   * 1 = "0", 2 = "00", 3 = "000", 4 = "0000", 5 = "00000"
   * @param {number} diff
   */
  setDifficulty(diff) {
    this.difficulty = Math.max(1, Math.min(5, diff));
    const targetPrefix = '0'.repeat(this.difficulty);
    eventBus.emit('DIFFICULTY_CHANGED', {
      difficulty: this.difficulty,
      prefix: targetPrefix,
      targetLeadingZeros: this.difficulty
    });
  }

  /**
   * Get simulated global network hashrate corresponding to difficulty
   * @param {number} diff
   * @returns {{ hashrateStr: string, hashrateHps: number }}
   */
  getNetworkHashrate(diff = this.difficulty) {
    const table = {
      1: { str: "15.4 KH/s", hps: 15400 },
      2: { str: "245.8 KH/s", hps: 245800 },
      3: { str: "5.21 MH/s", hps: 5210000 },
      4: { str: "135.6 MH/s", hps: 135600000 },
      5: { str: "2.84 GH/s", hps: 2840000000 }
    };
    return table[diff] || table[2];
  }

  /**
   * Generate a random 32-bit unsigned integer nonce
   * @returns {number}
   */
  getRandomNonce() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      globalThis.crypto.getRandomValues(arr);
      return arr[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }

  /**
   * Start mining a block with random nonce exploration
   * @param {import('./Block.js').Block} block
   * @param {number} difficulty
   */
  startMining(block, difficulty = this.difficulty) {
    if (this.isMining) {
      this.stopMining();
    }

    this.currentBlock = block;
    this.difficulty = difficulty;
    this.isMining = true;
    this.attempts = 0;
    this.startTime = performance.now();
    this.lastTelemetryTime = this.startTime;

    // Reset best hash tracking for this mining run
    this.currentBestHash = block.hash || '';
    this.bestLeadingZeros = Crypto.countLeadingZeros(this.currentBestHash);
    this.joulesBurned = 0;
    this.wattHours = 0;

    const targetPrefix = '0'.repeat(this.difficulty);

    eventBus.emit('MINING_STARTED', {
      block: this.currentBlock,
      difficulty: this.difficulty,
      targetPrefix,
      blockReward: this.blockReward
    });

    const step = async () => {
      if (!this.isMining || !this.currentBlock) return;

      const now = performance.now();
      let found = false;

      // Apply simulated hashrate multiplier (e.g. 5x boom or 0.2x crash)
      const multiplier = difficultyAdjuster ? difficultyAdjuster.hashrateMultiplier : 1.0;
      const effectiveBatchSize = Math.max(50, Math.round(this.batchSize * multiplier));

      // Evaluate a batch of random nonces in tight loop
      for (let i = 0; i < effectiveBatchSize; i++) {
        // Random nonce trial as requested
        this.currentBlock.nonce = this.getRandomNonce();
        this.currentBlock.difficulty = this.difficulty;
        this.currentBlock.hash = this.currentBlock.calculateHash();
        this.attempts++;

        const zeros = Crypto.countLeadingZeros(this.currentBlock.hash);
        if (zeros > this.bestLeadingZeros || !this.currentBestHash) {
          this.bestLeadingZeros = zeros;
          this.currentBestHash = this.currentBlock.hash;
        }

        if (this.currentBlock.hash.startsWith(targetPrefix)) {
          found = true;
          break;
        }
      }

      const elapsedMs = performance.now() - this.startTime;
      const elapsedSec = elapsedMs / 1000;
      const hashRate = Math.round(this.attempts / (elapsedSec || 0.001)) || 0;

      // Energy meter: ~0.05 Joules per hash evaluation on commodity hardware
      this.joulesBurned = this.attempts * 0.05;
      this.wattHours = this.joulesBurned / 3600;

      const netInfo = this.getNetworkHashrate(this.difficulty);
      const networkSharePercent = Math.min(100, Math.max(0.01, (hashRate / netInfo.hps) * 100));

      if (found) {
        this.isMining = false;
        this.currentBlock.isMined = true;

        // Perform final Web Crypto API asynchronous validation
        try {
          await this.currentBlock.calculateHashAsync();
        } catch (e) {
          // fallback to synchronous calculated hash
        }

        // Record block in difficulty adjuster & evaluate retargeting
        let retarget = null;
        if (difficultyAdjuster) {
          retarget = difficultyAdjuster.recordBlockMined(
            this.currentBlock.index,
            elapsedSec,
            this.difficulty,
            hashRate
          );
          if (retarget && retarget.adjusted) {
            this.setDifficulty(retarget.newDiff);
          }
        }

        const miningStats = {
          attempts: this.attempts,
          timeMs: Math.round(elapsedMs),
          timeSec: Number(elapsedSec.toFixed(2)),
          hashRate,
          difficulty: this.difficulty,
          winningNonce: this.currentBlock.nonce,
          winningHash: this.currentBlock.hash,
          bestHash: this.currentBestHash,
          bestLeadingZeros: this.bestLeadingZeros,
          joulesBurned: Number(this.joulesBurned.toFixed(2)),
          wattHours: Number(this.wattHours.toFixed(4)),
          blockReward: this.blockReward,
          networkHashrateStr: netInfo.str,
          networkSharePercent: Number(networkSharePercent.toFixed(2)),
          retarget
        };
        this.currentBlock.setMiningStats(miningStats);

        eventBus.emit('MINING_SUCCESS', {
          block: this.currentBlock,
          stats: miningStats,
          hash: this.currentBlock.hash,
          reward: this.blockReward,
          retarget
        });
        return;
      }


      // Throttle telemetry event to ~40-60 FPS
      if (now - this.lastTelemetryTime >= 35) {
        this.lastTelemetryTime = now;
        eventBus.emit('MINING_PROGRESS', {
          block: this.currentBlock,
          attempts: this.attempts,
          elapsedMs: Math.round(elapsedMs),
          elapsedSec: elapsedSec.toFixed(2),
          hashRate,
          currentNonce: this.currentBlock.nonce,
          currentHash: this.currentBlock.hash,
          currentBestHash: this.currentBestHash,
          bestLeadingZeros: this.bestLeadingZeros,
          difficulty: this.difficulty,
          targetPrefix,
          joulesBurned: Number(this.joulesBurned.toFixed(2)),
          wattHours: Number(this.wattHours.toFixed(4)),
          networkHashrateStr: netInfo.str,
          networkSharePercent: Number(networkSharePercent.toFixed(2))
        });
      }

      // Continue non-blocking loop
      this.animFrameId = requestAnimationFrame(step);
    };

    this.animFrameId = requestAnimationFrame(step);
  }

  /**
   * Stop/cancel current mining operation
   */
  stopMining() {
    this.isMining = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    eventBus.emit('MINING_STOPPED', {
      attempts: this.attempts,
      joulesBurned: this.joulesBurned
    });
  }
}

export const minerEngine = new ConsensusPoW();

