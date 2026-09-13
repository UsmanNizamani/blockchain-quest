import { Block } from './Block.js';
import { eventBus } from '../core/EventBus.js';
import { minerEngine } from './ConsensusPoW.js';

export class Blockchain {
  constructor(difficulty = 3) {
    this.difficulty = difficulty;
    this.chain = [];
    this.candidateBlock = null;
    this.initDefaultChain();
    this.bindEvents();
  }

  bindEvents() {
    eventBus.on('MINING_SUCCESS', ({ block }) => {
      if (this.candidateBlock && this.candidateBlock === block) {
        this.sealMinedBlock(this.candidateBlock);
      }
    });
  }

  /**
   * Seed the blockchain with Genesis + 3 initial valid blocks and a candidate block
   */
  initDefaultChain() {
    this.chain = [];

    // Block #0: Genesis
    const genesis = new Block(
      0,
      { tx: "Genesis: Coinbase 50 BTC -> Satoshi", summary: "Coinbase -> Satoshi: 50 BTC" },
      "0".repeat(64),
      104,
      1231006505000,
      1,
      true
    );
    genesis.mineBlock(1);
    this.chain.push(genesis);

    // Block #1
    const b1 = new Block(
      1,
      { tx: "Alice -> Bob: 12.5 BTC", summary: "Alice -> Bob: 12.5 BTC" },
      genesis.hash,
      48,
      1231006800000,
      1,
      true
    );
    b1.mineBlock(1);
    this.chain.push(b1);

    // Block #2
    const b2 = new Block(
      2,
      { tx: "Bob -> Charlie: 4.2 BTC", summary: "Bob -> Charlie: 4.2 BTC" },
      b1.hash,
      72,
      1231007100000,
      1,
      true
    );
    b2.mineBlock(1);
    this.chain.push(b2);

    // Block #3
    const b3 = new Block(
      3,
      { tx: "Charlie -> Dave: 1.0 BTC", summary: "Charlie -> Dave: 1.0 BTC" },
      b2.hash,
      93,
      1231007400000,
      1,
      true
    );
    b3.mineBlock(1);
    this.chain.push(b3);

    // Create Initial Candidate Unmined Block #4
    this.createCandidateBlock({
      tx: "Dave -> Miner: 3.5 BTC (+ 6.25 BTC Reward)",
      summary: "Dave -> Miner: 3.5 BTC (+ 6.25 BTC Reward)"
    }, this.difficulty);

    eventBus.emit('CHAIN_UPDATED', {
      chain: this.chain,
      candidate: this.candidateBlock,
      integrity: this.getChainIntegrity()
    });
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Create an unmined candidate block awaiting Proof of Work
   * @param {string|Object} data
   * @param {number} difficulty
   * @returns {Block}
   */
  createCandidateBlock(data = null, difficulty = this.difficulty) {
    const prevBlock = this.getLatestBlock();
    const index = this.chain.length;

    const defaultTxPresets = [
      "Eve -> Frank: 0.85 BTC (Fee: 0.001)",
      "Grace -> Heidi: 4.12 BTC (Fee: 0.002)",
      "Ivan -> Judy: 15.00 BTC (Fee: 0.005)",
      "Mallory -> Oscar: 0.25 BTC (Fee: 0.001)",
      "Peggy -> Sybil: 8.40 BTC (Fee: 0.003)"
    ];

    const chosenData = data || {
      tx: defaultTxPresets[index % defaultTxPresets.length],
      summary: defaultTxPresets[index % defaultTxPresets.length]
    };

    this.candidateBlock = new Block(
      index,
      chosenData,
      prevBlock.hash,
      0,
      Date.now(),
      difficulty,
      false // isMined = false
    );

    eventBus.emit('CANDIDATE_CREATED', {
      candidate: this.candidateBlock,
      difficulty
    });

    return this.candidateBlock;
  }

  /**
   * Start mining the next candidate block via the consensus engine
   * @param {number} difficulty
   */
  async mineNextBlock(difficulty = this.difficulty) {
    if (!this.candidateBlock) {
      this.createCandidateBlock(null, difficulty);
    }
    this.candidateBlock.difficulty = difficulty;
    minerEngine.startMining(this.candidateBlock, difficulty);
  }

  /**
   * Commit a successfully mined candidate block into the chain
   * @param {Block} minedBlock
   */
  sealMinedBlock(minedBlock) {
    if (!minedBlock) return;

    this.chain.push(minedBlock);
    this.candidateBlock = null;

    eventBus.emit('BLOCK_MINED', {
      block: minedBlock,
      stats: minedBlock.miningStats
    });

    eventBus.emit('BLOCK_ADDED', {
      block: minedBlock,
      chainLength: this.chain.length
    });

    // Automatically queue next candidate block
    this.createCandidateBlock(null, this.difficulty);

    eventBus.emit('CHAIN_UPDATED', {
      chain: this.chain,
      candidate: this.candidateBlock,
      integrity: this.getChainIntegrity()
    });
  }

  /**
   * Add a new block directly to the chain (for tests or instant add)
   * @param {string|Object} data
   * @returns {Block}
   */
  addBlock(data) {
    const prevBlock = this.getLatestBlock();
    const newBlock = new Block(
      this.chain.length,
      data,
      prevBlock.hash,
      0,
      Date.now(),
      this.difficulty,
      true
    );

    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);

    this.createCandidateBlock(null, this.difficulty);

    eventBus.emit('BLOCK_ADDED', { block: newBlock, chainLength: this.chain.length });
    eventBus.emit('CHAIN_UPDATED', { chain: this.chain, candidate: this.candidateBlock, integrity: this.getChainIntegrity() });
    return newBlock;
  }

  /**
   * Tamper with a block's data and recalculate its hash via Web Crypto API
   * @param {number} index
   * @param {*} newData
   */
  async tamperBlock(index, newData) {
    if (index < 0 || index >= this.chain.length) return;

    const block = this.chain[index];
    await block.tamper(newData);

    const integrity = this.getChainIntegrity();

    eventBus.emit('CHAIN_TAMPERED', {
      tamperedIndex: index,
      block,
      integrity
    });

    eventBus.emit('CHAIN_UPDATED', { chain: this.chain, candidate: this.candidateBlock, integrity });
    return integrity;
  }

  /**
   * Calculate Chain Integrity health score and identify broken links
   * @returns {{ integrityScore: number, brokenLinks: number[], invalidBlocks: number[], isCompromised: boolean }}
   */
  getChainIntegrity() {
    if (this.chain.length <= 1) {
      return { integrityScore: 100, brokenLinks: [], invalidBlocks: [], isCompromised: false };
    }

    const brokenLinks = [];
    const invalidBlocks = [];
    const totalLinks = this.chain.length - 1;
    let validLinks = 0;

    // Verify Genesis
    if (!this.chain[0].isValid() || (this.chain[0].originalHash && this.chain[0].hash !== this.chain[0].originalHash)) {
      invalidBlocks.push(0);
    }

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      let linkBroken = false;

      // Check 1: Does currentBlock.previousHash match previousBlock.hash?
      if (currentBlock.previousHash !== previousBlock.hash) {
        linkBroken = true;
      }

      // Check 2: Has currentBlock's own content or hash been tampered from initial?
      if (!currentBlock.isValid() || (currentBlock.originalHash && currentBlock.hash !== currentBlock.originalHash)) {
        invalidBlocks.push(i);
      }

      if (linkBroken) {
        brokenLinks.push(i);
      } else {
        validLinks++;
      }
    }

    const integrityScore = Math.round((validLinks / totalLinks) * 100);
    const isCompromised = brokenLinks.length > 0 || invalidBlocks.length > 0;

    return {
      integrityScore,
      brokenLinks,
      invalidBlocks,
      isCompromised
    };
  }

  /**
   * Re-mine the chain from a specific block to repair all downstream hashes
   * @param {number} startIndex
   */
  async reMineFrom(startIndex = 0) {
    for (let i = Math.max(1, startIndex); i < this.chain.length; i++) {
      const prevBlock = this.chain[i - 1];
      this.chain[i].previousHash = prevBlock.hash;
      this.chain[i].mineBlock(this.difficulty);
      await this.chain[i].calculateHashAsync();
      this.chain[i].originalHash = this.chain[i].hash;
      this.chain[i].originalData = typeof this.chain[i].data === 'object' && this.chain[i].data !== null ? JSON.parse(JSON.stringify(this.chain[i].data)) : this.chain[i].data;
      this.chain[i].originalSummary = this.chain[i].getSummary();
    }

    const startIdx = Math.max(0, startIndex);
    if (this.chain[startIdx]) {
      this.chain[startIdx].originalHash = this.chain[startIdx].hash;
      this.chain[startIdx].originalData = typeof this.chain[startIdx].data === 'object' && this.chain[startIdx].data !== null ? JSON.parse(JSON.stringify(this.chain[startIdx].data)) : this.chain[startIdx].data;
      this.chain[startIdx].originalSummary = this.chain[startIdx].getSummary();
    }

    if (this.candidateBlock) {
      this.candidateBlock.previousHash = this.getLatestBlock().hash;
    }

    const integrity = this.getChainIntegrity();
    eventBus.emit('CHAIN_REPAIRED', { integrity });
    eventBus.emit('CHAIN_UPDATED', { chain: this.chain, candidate: this.candidateBlock, integrity });
    return integrity;
  }

  /**
   * Alias to repairChain for level mission compatibility
   * @param {number} startIndex
   */
  async repairChain(startIndex = 0) {
    return await this.reMineFrom(startIndex);
  }

  /**
   * Reset to pristine original state
   */
  resetChain() {
    this.initDefaultChain();
    const integrity = this.getChainIntegrity();
    eventBus.emit('CHAIN_REPAIRED', { integrity });
    eventBus.emit('CHAIN_UPDATED', { chain: this.chain, candidate: this.candidateBlock, integrity });
    return integrity;
  }
}

export const defaultBlockchain = new Blockchain(3);
