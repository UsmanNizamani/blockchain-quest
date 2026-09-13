import { eventBus } from '../core/EventBus.js';

/**
 * MergeSimulation Engine
 * Models Ethereum's historic "The Merge" (Paris & Bellatrix upgrades) on September 15, 2022.
 * 
 * Historical Data:
 * - Last PoW Block: 15,537,394 (Mined by F2Pool, containing message: "The commit 'Add Panda 9' was merged")
 * - Terminal Total Difficulty (TTD): 58,750,000,000,000,000,000,000 (58.75 ZettaHashes)
 * - First PoS Block: 15,537,395 (Beacon slot 4,700,013, proposed by validator 0xeee8...)
 * - Energy Reduction: 8.5 Gigawatts (78 TWh/yr) -> 2.6 Kilowatts (0.0026 TWh/yr) = 99.95% drop!
 * - Zero Downtime: Consensuses swapped on a live chain without stopping or dropping any blocks.
 */
export class MergeSimulation {
  constructor() {
    this.isActive = false;
    this.autoRunInterval = null;
    this.isAutoRunning = false;

    // Simulation Starting Point: 6 blocks before The Merge
    this.START_BLOCK = 15537388;
    this.MERGE_BLOCK = 15537394;
    this.FIRST_POS_BLOCK = 15537395;
    this.TTD_TARGET = 58750000000000000000000n; // 58.75 ZettaHashes (BigInt)

    this.reset();
  }

  reset() {
    this.stopAutoRun();

    this.currentBlock = this.START_BLOCK;
    this.stage = 'pre_merge'; // 'pre_merge' | 'bomb_escalating' | 'merging' | 'post_merge'
    this.consensusEngine = 'POW_ETHASH'; // 'POW_ETHASH' | 'POS_GASPER'

    // Real Historical Energy Metrics
    this.energyBeforeGw = 8.5; // ~8.5 GW (78 TWh/yr)
    this.energyAfterKw = 2.6; // ~2.6 kW (0.0026 TWh/yr)
    this.currentEnergyMw = 8500.0; // Starts at 8,500 MW (8.5 GW)
    this.energyDropPercent = 0.0;

    // Difficulty Bomb / Ice Age State
    this.difficultyBomb = {
      armed: true,
      defused: false,
      escalationLevel: 0, // 0 = standard, 1 = warning, 2 = severe, 3 = frozen
      blockTimeSec: 13.3, // Baseline Ethereum PoW block time
      multiplier: 1.0,
      description: "EIP-5133 Difficulty Bomb active — exponential retarget forces consensus transition."
    };

    // Total Difficulty (TTD tracking)
    this.startTotalDifficulty = 58749970000000000000000n;
    this.currentTotalDifficulty = this.startTotalDifficulty;
    this.stepDifficultyPerBlock = 5000000000000000000n;

    // Historical Mining Pools (Pre-Merge)
    this.miners = [
      { id: 'f2pool', name: 'F2Pool', share: 22.5, hasHash: '200 TH/s', type: 'miner', icon: '🐟' },
      { id: 'ethermine', name: 'Ethermine', share: 31.0, hasHash: '276 TH/s', type: 'miner', icon: '⛏️' },
      { id: 'antpool', name: 'AntPool', share: 14.5, hasHash: '129 TH/s', type: 'miner', icon: '🐜' },
      { id: 'hiveon', name: 'Hiveon', share: 11.2, hasHash: '100 TH/s', type: 'miner', icon: '🐝' },
      { id: 'others', name: 'Solo Miners', share: 20.8, hasHash: '185 TH/s', type: 'miner', icon: '💻' }
    ];

    // Historical Beacon Chain Validators (Post-Merge)
    this.validators = [
      { id: 'lido', name: 'Lido Pool', share: 30.8, stakedEth: '4.1M ETH', type: 'validator', icon: '🌊' },
      { id: 'coinbase', name: 'Coinbase', share: 14.5, stakedEth: '1.9M ETH', type: 'validator', icon: '🔵' },
      { id: 'kraken', name: 'Kraken', share: 8.2, stakedEth: '1.1M ETH', type: 'validator', icon: '🐙' },
      { id: 'rocketpool', name: 'Rocket Pool', share: 4.5, stakedEth: '0.6M ETH', type: 'validator', icon: '🚀' },
      { id: 'solo', name: 'Solo Stakers', share: 42.0, stakedEth: '5.7M ETH', type: 'validator', icon: '🛡️' }
    ];

    // Initialize Chain Blocks
    this.chainBlocks = [];
    for (let b = this.START_BLOCK - 3; b <= this.START_BLOCK; b++) {
      this.chainBlocks.push(this.generateBlockRecord(b));
    }

    this.lastEventMessage = "Ethereum PoW running on Ethash. TTD target: 58.75 ZettaHashes.";
    eventBus.emit('MERGE_SIM_RESET', this.getState());
  }

  setActive(active) {
    this.isActive = Boolean(active);
    if (!this.isActive) {
      this.stopAutoRun();
    }
    eventBus.emit('MERGE_SIM_ACTIVE_CHANGED', { isActive: this.isActive });
  }

  generateBlockRecord(blockNum) {
    const isPoW = blockNum <= this.MERGE_BLOCK;
    const isMergeBlock = blockNum === this.MERGE_BLOCK;

    if (isPoW) {
      const miner = isMergeBlock 
        ? { name: 'F2Pool', icon: '🐟' } 
        : this.miners[blockNum % this.miners.length];

      return {
        number: blockNum,
        consensus: 'POW',
        consensusLabel: 'Proof of Work (Ethash)',
        minerName: miner.name,
        minerIcon: miner.icon,
        isMergeBlock: isMergeBlock,
        nonce: isMergeBlock ? '0x628f3a9e' : ('0x' + (100000000 + (blockNum * 1337)).toString(16).padStart(8, '0')),
        hash: '0x7a8e...' + blockNum.toString(16),
        extraData: isMergeBlock ? "The commit 'Add Panda 9' was merged" : "Ethereum PoW Mainnet",
        energyMw: 8500,
        slot: null,
        attestationPct: null,
        timestampStr: isMergeBlock ? 'Sept 15, 2022 06:42:42 UTC' : ('T - ' + ((this.MERGE_BLOCK - blockNum) * 13) + 's')
      };
    } else {
      const val = this.validators[(blockNum - this.MERGE_BLOCK) % this.validators.length];
      const slot = 4700013 + (blockNum - this.FIRST_POS_BLOCK);

      return {
        number: blockNum,
        consensus: 'POS',
        consensusLabel: 'Proof of Stake (Gasper / Casper FFG)',
        minerName: val.name,
        minerIcon: val.icon,
        isMergeBlock: false,
        nonce: '0x0000000000000000', // PoS has 0 nonce
        hash: '0x3f1b...' + blockNum.toString(16),
        extraData: "Beacon Chain Transitioned",
        energyMw: 0.0026, // 2.6 kW = 0.0026 MW
        slot: slot,
        attestationPct: 99.8,
        timestampStr: 'Slot #' + slot + ' (+' + ((blockNum - this.MERGE_BLOCK) * 12) + 's)'
      };
    }
  }

  advanceBlock() {
    this.currentBlock++;
    const newBlock = this.generateBlockRecord(this.currentBlock);
    this.chainBlocks.push(newBlock);
    if (this.chainBlocks.length > 7) {
      this.chainBlocks.shift();
    }

    // Accumulate Total Difficulty towards TTD
    if (this.currentBlock < this.MERGE_BLOCK) {
      this.currentTotalDifficulty += this.stepDifficultyPerBlock;
      this.lastEventMessage = 'PoW Block #' + this.currentBlock + ' mined by ' + newBlock.minerName + '. TTD approaching.';
    } else if (this.currentBlock === this.MERGE_BLOCK) {
      // THE MERGE BLOCK TRIGGERED!
      this.currentTotalDifficulty = this.TTD_TARGET;
      this.triggerMerge();
      return this.getState();
    } else {
      // POST MERGE BLOCKS
      this.stage = 'post_merge';
      this.consensusEngine = 'POS_GASPER';
      this.currentEnergyMw = 0.0026;
      this.energyDropPercent = 99.95;
      this.difficultyBomb.defused = true;
      this.difficultyBomb.description = "Difficulty Bomb permanently defused by Paris consensus transition.";
      this.lastEventMessage = 'PoS Block #' + this.currentBlock + ' finalized in Slot ' + newBlock.slot + '! Chain continuous with 0 downtime.';
    }

    eventBus.emit('MERGE_BLOCK_ADVANCED', this.getState());
    return this.getState();
  }

  triggerMerge() {
    this.stage = 'merging';
    this.currentBlock = this.MERGE_BLOCK;
    this.currentTotalDifficulty = this.TTD_TARGET;

    // Ensure the merge block is at the tail
    const hasMergeBlock = this.chainBlocks.some(b => b.number === this.MERGE_BLOCK);
    if (!hasMergeBlock) {
      this.chainBlocks.push(this.generateBlockRecord(this.MERGE_BLOCK));
      if (this.chainBlocks.length > 7) this.chainBlocks.shift();
    }

    // Swapping consensus engine on live chain
    this.consensusEngine = 'POS_GASPER';
    this.energyDropPercent = 99.95;
    this.currentEnergyMw = 0.0026; // 2.6 kW
    this.difficultyBomb.defused = true;
    this.difficultyBomb.description = "DEFUSED: PoS slot time is fixed to 12.0s. Ice Age neutralised!";

    this.lastEventMessage = "🐼 THE MERGE TRIGGERED AT BLOCK #15,537,394! Miners replaced by Beacon Chain validators. Energy dropped 99.95% with zero downtime!";

    eventBus.emit('THE_MERGE_TRIGGERED', {
      mergeBlock: this.MERGE_BLOCK,
      ttd: this.TTD_TARGET.toString(),
      energyBefore: "8.5 GW",
      energyAfter: "2.6 kW",
      energyDropPct: 99.95,
      message: "The commit 'Add Panda 9' was merged"
    });

    eventBus.emit('SHOW_MERGE_MODAL');
    return this.getState();
  }

  jumpToMerge() {
    this.currentBlock = this.MERGE_BLOCK - 1;
    this.advanceBlock();
  }

  tickDifficultyBomb() {
    if (this.stage === 'post_merge' || this.difficultyBomb.defused) {
      return this.getState();
    }

    this.difficultyBomb.escalationLevel = (this.difficultyBomb.escalationLevel + 1) % 4;
    const levels = [
      { mult: 1.0, time: 13.3, stage: 'pre_merge', desc: "Bomb Armed: Standard 13.3s PoW block time." },
      { mult: 1.8, time: 24.0, stage: 'bomb_escalating', desc: "Bomb Ticking (Step 1): Hash difficulty doubled. Block time slowed to 24s!" },
      { mult: 3.5, time: 46.5, stage: 'bomb_escalating', desc: "Bomb Escalating (Step 2): Severe Ice Age. Blocks taking 46.5s to mine!" },
      { mult: 7.0, time: 93.0, stage: 'bomb_escalating', desc: "Bomb Critical (Step 3): 93s block freeze! Network nearing standstill without The Merge." }
    ];

    const current = levels[this.difficultyBomb.escalationLevel];
    this.difficultyBomb.multiplier = current.mult;
    this.difficultyBomb.blockTimeSec = current.time;
    this.difficultyBomb.description = current.desc;
    this.stage = current.stage;

    this.lastEventMessage = '⚠️ Difficulty Bomb escalated to Level ' + this.difficultyBomb.escalationLevel + ': Solve time inflated to ' + current.time + 's!';
    eventBus.emit('DIFFICULTY_BOMB_TICKED', this.getState());
    return this.getState();
  }

  toggleAutoRun() {
    if (this.isAutoRunning) {
      this.stopAutoRun();
    } else {
      this.startAutoRun();
    }
  }

  startAutoRun() {
    this.isAutoRunning = true;
    if (this.autoRunInterval) clearInterval(this.autoRunInterval);
    this.autoRunInterval = setInterval(() => {
      this.advanceBlock();
    }, 1800);
    eventBus.emit('MERGE_AUTORUN_STARTED');
  }

  stopAutoRun() {
    this.isAutoRunning = false;
    if (this.autoRunInterval) {
      clearInterval(this.autoRunInterval);
      this.autoRunInterval = null;
    }
    eventBus.emit('MERGE_AUTORUN_STOPPED');
  }

  getTtdProgressPercent() {
    if (this.currentBlock >= this.MERGE_BLOCK) return 100.0;
    const span = Number(this.TTD_TARGET - this.startTotalDifficulty);
    const curr = Number(this.currentTotalDifficulty - this.startTotalDifficulty);
    return Math.min(99.9, Math.max(0, (curr / span) * 100));
  }

  getState() {
    return {
      isActive: this.isActive,
      isAutoRunning: this.isAutoRunning,
      currentBlock: this.currentBlock,
      mergeBlock: this.MERGE_BLOCK,
      firstPosBlock: this.FIRST_POS_BLOCK,
      stage: this.stage,
      consensusEngine: this.consensusEngine,
      isPostMerge: this.currentBlock >= this.MERGE_BLOCK,
      isExactMergeBlock: this.currentBlock === this.MERGE_BLOCK,
      currentEnergyMw: this.currentEnergyMw,
      energyDropPercent: this.currentBlock >= this.MERGE_BLOCK ? 99.95 : 0.0,
      difficultyBomb: { ...this.difficultyBomb },
      ttdProgressPct: this.getTtdProgressPercent(),
      ttdTargetStr: "58,750,000,000,000,000,000,000",
      chainBlocks: [...this.chainBlocks],
      activeWorkers: this.currentBlock >= this.MERGE_BLOCK ? this.validators : this.miners,
      lastEventMessage: this.lastEventMessage
    };
  }
}

export const mergeSimulation = new MergeSimulation();
