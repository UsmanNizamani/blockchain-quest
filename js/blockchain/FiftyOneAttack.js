import { eventBus } from '../core/EventBus.js';

export class FiftyOneAttack {
  constructor() {
    this.isActive = false;
    this.isRunning = false;
    this.difficulty = 3; // 2: Easy, 3: Medium, 4: Hard, 5: Extreme
    this.honestHashratePercent = 40;
    this.attackerHashratePercent = 60;

    // Dual chains
    this.honestChain = [];
    this.attackerChain = [];

    // Mining tick accumulators
    this.honestProgress = 0;
    this.attackerProgress = 0;

    // Simulation metrics
    this.status = 'idle'; // 'idle' | 'mining' | 'reorganized' | 'completed'
    this.reorgHappened = false;
    this.reorgBlockHeight = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;

    // Initialize initial state
    this.reset();
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[fiftyOneAttack] activate');
    eventBus.emit('ATTACK_51_ACTIVATED', {});
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    console.log('[fiftyOneAttack] deactivate');
    if (this.isRunning) this.stopSimulation();
    eventBus.emit('ATTACK_51_DEACTIVATED', {});
  }

  startAttack(...args) {
    return this.startSimulation(...args);
  }

  reset() {
    this.stopSimulation();
    this.status = 'idle';
    this.reorgHappened = false;
    this.reorgBlockHeight = 0;
    this.elapsedSeconds = 0;
    this.honestProgress = 0;
    this.attackerProgress = 0;

    // Genesis Common Ancestor
    const genesis = {
      index: 0,
      hash: "0000a1b2c3d4e5f6...",
      previousHash: "0000000000000000...",
      nonce: 1042,
      txSummary: "Genesis Block (Mempool Root)",
      isOrphaned: false,
      chainType: "common"
    };

    // Honest initial branch
    const honestBlock1 = {
      index: 1,
      hash: "0000789abc123def...",
      previousHash: genesis.hash,
      nonce: 8392,
      txSummary: "Player ➔ Merchant Bob (25.0 QUEST)",
      isOrphaned: false,
      chainType: "honest"
    };

    // Attacker initial private branch (Double-Spend fork)
    const attackerBlock1 = {
      index: 1,
      hash: "0000deadbeefcafe...",
      previousHash: genesis.hash,
      nonce: 9481,
      txSummary: "Player ➔ Attacker Secret Vault (25.0 QUEST) [DOUBLE-SPEND]",
      isOrphaned: false,
      chainType: "attacker"
    };

    this.honestChain = [genesis, honestBlock1];
    this.attackerChain = [genesis, attackerBlock1];

    eventBus.emit('ATTACK_51_RESET', {
      honestChain: this.honestChain,
      attackerChain: this.attackerChain
    });
  }

  setDifficulty(diff) {
    this.difficulty = Math.max(2, Math.min(5, diff));
    eventBus.emit('ATTACK_51_DIFFICULTY_CHANGED', {
      difficulty: this.difficulty,
      costMetrics: this.getCostMetrics()
    });
  }

  getCostMetrics() {
    const diffConfigs = {
      2: {
        name: "Small Altcoin ('00')",
        hashrateTotal: "500 GH/s",
        asicsRequired: "50 Gaming GPUs",
        powerMW: "0.015 MW",
        hourlyCost: 120,
        stolenValue: 500,
        postAttackVal: 25, // 95% price crash
        netLoss: 120 + (500 - 25)
      },
      3: {
        name: "Mid-Tier Network ('000')",
        hashrateTotal: "50 TH/s",
        asicsRequired: "500 Antminer ASICs",
        powerMW: "1.5 MW",
        hourlyCost: 4200,
        stolenValue: 5000,
        postAttackVal: 50, // 99% price crash
        netLoss: 4200 + (5000 - 50)
      },
      4: {
        name: "Major Blockchain ('0000')",
        hashrateTotal: "5,000 TH/s",
        asicsRequired: "50,000 ASICs",
        powerMW: "150 MW",
        hourlyCost: 185000,
        stolenValue: 50000,
        postAttackVal: 50, // 99.9% price crash
        netLoss: 185000 + (50000 - 50)
      },
      5: {
        name: "Global PoW Giant ('00000')",
        hashrateTotal: "600,000,000 TH/s (600 EH/s)",
        asicsRequired: "3,500,000 ASICs ($14B CapEx)",
        powerMW: "10,500 MW (10.5 GW)",
        hourlyCost: 1450000,
        stolenValue: 500000,
        postAttackVal: 0, // 100% collapse
        netLoss: 1450000 + 500000
      }
    };

    return diffConfigs[this.difficulty] || diffConfigs[3];
  }

  startSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.status = 'mining';

    eventBus.emit('ATTACK_51_STARTED', {
      honestHeight: this.honestChain.length,
      attackerHeight: this.attackerChain.length,
      hashrateSplit: { honest: this.honestHashratePercent, attacker: this.attackerHashratePercent }
    });

    // Mining tick loop: runs every 250ms
    this.timerInterval = setInterval(() => {
      this.stepSimulation();
    }, 250);
  }

  stopSimulation() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    eventBus.emit('ATTACK_51_STOPPED', { status: this.status });
  }

  stepSimulation() {
    this.elapsedSeconds += 0.25;

    // Difficulty threshold for a new block to be found (in progress points)
    // Higher difficulty requires more progress accumulation
    const targetPoints = 100;

    // Attacker has 60% hashrate -> generates ~6.0 points per tick
    // Honest has 40% hashrate -> generates ~4.0 points per tick
    // With slight random jitter to simulate stochastic PoW Poisson arrivals
    const honestRate = (this.honestHashratePercent / 10) * (0.85 + Math.random() * 0.3);
    const attackerRate = (this.attackerHashratePercent / 10) * (0.85 + Math.random() * 0.3);

    this.honestProgress += honestRate;
    this.attackerProgress += attackerRate;

    // Check if Honest chain mined a new block
    if (this.honestProgress >= targetPoints) {
      this.honestProgress = 0;
      // Cap maximum blocks in demo to prevent overflow
      if (this.honestChain.length < 5 && !this.reorgHappened) {
        this.mineHonestBlock();
      }
    }

    // Check if Attacker chain mined a new block
    if (this.attackerProgress >= targetPoints) {
      this.attackerProgress = 0;
      if (this.attackerChain.length < 6) {
        this.mineAttackerBlock();
      }
    }

    // Emit live telemetry
    eventBus.emit('ATTACK_51_PROGRESS', {
      honestProgress: Math.min(100, Math.round(this.honestProgress)),
      attackerProgress: Math.min(100, Math.round(this.attackerProgress)),
      honestHeight: this.honestChain.length,
      attackerHeight: this.attackerChain.length,
      elapsedSeconds: this.elapsedSeconds.toFixed(1)
    });

    // Check for Chain Reorganization Condition:
    // Attacker chain length surpasses Honest chain length
    if (!this.reorgHappened && this.attackerChain.length > this.honestChain.length) {
      this.triggerReorganization();
    }
  }

  mineHonestBlock() {
    const nextIdx = this.honestChain.length;
    const prev = this.honestChain[nextIdx - 1];
    const dummyHash = "0000" + Math.random().toString(16).substring(2, 14) + "...";

    const newBlock = {
      index: nextIdx,
      hash: dummyHash,
      previousHash: prev.hash,
      nonce: Math.floor(Math.random() * 90000) + 1000,
      txSummary: `Honest TX #${nextIdx}: Transfer to Vendor`,
      isOrphaned: false,
      chainType: "honest"
    };

    this.honestChain.push(newBlock);
    eventBus.emit('ATTACK_51_BLOCK_MINED', { chain: 'honest', block: newBlock });
  }

  mineAttackerBlock() {
    const nextIdx = this.attackerChain.length;
    const prev = this.attackerChain[nextIdx - 1];
    const dummyHash = "0000" + Math.random().toString(16).substring(2, 14) + "...";

    const newBlock = {
      index: nextIdx,
      hash: dummyHash,
      previousHash: prev.hash,
      nonce: Math.floor(Math.random() * 90000) + 1000,
      txSummary: `Shadow TX #${nextIdx}: Replaced with Hacker UTXO`,
      isOrphaned: false,
      chainType: "attacker"
    };

    this.attackerChain.push(newBlock);
    eventBus.emit('ATTACK_51_BLOCK_MINED', { chain: 'attacker', block: newBlock });
  }

  triggerReorganization() {
    this.reorgHappened = true;
    this.status = 'reorganized';
    this.reorgBlockHeight = this.attackerChain.length;

    // Honest blocks (except Genesis) become orphaned!
    let orphanedCount = 0;
    for (let i = 1; i < this.honestChain.length; i++) {
      this.honestChain[i].isOrphaned = true;
      orphanedCount++;
    }

    this.stopSimulation();

    eventBus.emit('ATTACK_51_REORG', {
      attackerHeight: this.attackerChain.length,
      honestHeight: this.honestChain.length,
      orphanedCount,
      costMetrics: this.getCostMetrics()
    });

    // Trigger educational modal
    setTimeout(() => {
      eventBus.emit('SHOW_51_ATTACK_MODAL', {
        attackerHeight: this.attackerChain.length,
        honestHeight: this.honestChain.length,
        orphanedCount,
        costMetrics: this.getCostMetrics()
      });
    }, 600);
  }
}

export const fiftyOneAttack = new FiftyOneAttack();
