import { eventBus } from '../core/EventBus.js';
import { Crypto } from './Crypto.js';

export class ConsensusComparison {
  constructor() {
    this.isActive = false;
    this.simInterval = null;
    this.simSpeedMs = 1200; // 1.2s per step
    this.txCounter = 1;

    this.reset();
  }

  setActive(active) {
    this.isActive = Boolean(active);
  }

  reset() {
    this.sharedTransactions = [];
    this.sharedPendingCount = 0;

    // 1. Proof of Work Chain State
    this.powState = {
      name: 'Proof of Work (Bitcoin)',
      symbol: 'PoW',
      hashrate: '620 EH/s',
      hashrateNum: 620,
      difficulty: 3,
      joulesBurned: 0,
      wattHours: 0,
      blocksMined: 0,
      mempool: [],
      confirmedChain: [
        { index: 0, hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f', txCount: 1, nonce: 2083236893, miner: 'Satoshi (Genesis)' }
      ],
      orphanedBlocks: 0,
      miners: [
        { name: 'Foundry USA', share: 34, color: '#f59e0b' },
        { name: 'AntPool', share: 26, color: '#ef4444' },
        { name: 'F2Pool', share: 14, color: '#3b82f6' },
        { name: 'ViaBTC', share: 11, color: '#8b5cf6' },
        { name: 'Solo Rig (You)', share: 15, color: '#10b981' }
      ],
      attackActive: false,
      attackDetails: null,
      timeToFinality: '60.0 mins (6 Confirmations)',
      finalityType: 'Probabilistic (Reorganization Risk)',
      energyRateMW: '10,500 MW (10.5 GW)',
      costToAttack51: '$14.2 Billion CapEx + $1.45M/hr OpEx',
      hardwareReq: 'Industrial ASIC Arrays (3.5M chips, 3-Phase Power, HVAC Cooling)',
      censorshipResistance: 'Medium (Traceable thermal & electric footprint; mining pool centralization)',
      decentralization: '2 Mining Pools control 60% of Global Hashrate'
    };

    // 2. Proof of Stake Chain State
    this.posState = {
      name: 'Proof of Stake (Ethereum)',
      symbol: 'PoS',
      totalStake: 236, // QUEST ($28.3 Billion equivalent)
      currentSlot: 1,
      currentEpoch: 1,
      blocksFinalized: 0,
      mempool: [],
      finalizedChain: [
        { slot: 1, hash: '0x3a91e847c2098b1e457a1b02847c912048571029384756102938475610293847', txCount: 1, proposer: 'Beacon Prime' }
      ],
      validators: [
        { id: 'v1', name: 'Beacon Prime', stake: 64, share: 27.1, color: '#06b6d4', status: 'active' },
        { id: 'v2', name: 'Validator Alpha', stake: 32, share: 13.6, color: '#3b82f6', status: 'active' },
        { id: 'v3', name: 'EtherStaking Pool', stake: 48, share: 20.3, color: '#8b5cf6', status: 'active' },
        { id: 'v4', name: 'Cold Reserve', stake: 32, share: 13.6, color: '#10b981', status: 'active' },
        { id: 'v5', name: 'Solar Staker', stake: 24, share: 10.2, color: '#f59e0b', status: 'active' },
        { id: 'v6', name: 'Nexus Node', stake: 16, share: 6.8, color: '#ec4899', status: 'active' },
        { id: 'v7', name: 'Player Validator', stake: 20, share: 8.4, color: '#00ff88', status: 'active' }
      ],
      slashingLog: [],
      attackActive: false,
      attackDetails: null,
      timeToFinality: '12.8 mins (2 Checkpoints / 2 Slots in Sim)',
      finalityType: 'Deterministic (Casper FFG Mathematical Finality)',
      energyRateMW: '0.0026 MW (2.6 kW — 99.98% Reduction)',
      costToAttack51: '$24.8 Billion Staked Capital (100% Slashed & Burned Permanently)',
      hardwareReq: 'Consumer Mini PC (Raspberry Pi 4 / Intel NUC, 16GB RAM, 2TB SSD, 15W)',
      censorshipResistance: 'High (DVT Keys secret-shared globally, zero physical thermal footprint)',
      decentralization: '1,200+ Global Active Validators, liquid staking pool dispersion'
    };

    eventBus.emit('COMPARE_STATE_RESET', this.getState());
  }

  getState() {
    return {
      sharedPendingCount: this.sharedPendingCount,
      pow: { ...this.powState },
      pos: { ...this.posState },
      metrics: this.getMetricsComparison()
    };
  }

  /**
   * Broadcast an identical batch of simulated transactions to BOTH chains
   * @param {number} count
   */
  broadcastSharedTransactions(count = 5) {
    const num = Math.max(1, Math.min(25, Number(count) || 5));
    const newTxs = [];

    const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Satoshi', 'Vitalik'];
    const receivers = ['Merchant Armory', 'Potion Lab', 'Cyberdeck Store', 'DeFi Pool', 'DAO Treasury'];

    for (let i = 0; i < num; i++) {
      const s = senders[Math.floor(Math.random() * senders.length)];
      const r = receivers[Math.floor(Math.random() * receivers.length)];
      const amt = Number((Math.random() * 15 + 1).toFixed(2));
      const tx = {
        id: `tx_${this.txCounter++}_${Date.now()}`,
        from: s,
        to: r,
        amount: amt,
        fee: 0.05,
        timestamp: Date.now()
      };
      newTxs.push(tx);
    }

    this.sharedTransactions.push(...newTxs);
    this.sharedPendingCount += newTxs.length;

    // Both chains ingest the exact same transactions into their mempools
    this.powState.mempool.push(...newTxs);
    this.posState.mempool.push(...newTxs);

    eventBus.emit('COMPARE_TRANSACTIONS_BROADCAST', {
      count: num,
      transactions: newTxs,
      sharedPendingCount: this.sharedPendingCount
    });

    return newTxs;
  }

  /**
   * Advance one simulation step for BOTH chains simultaneously
   */
  stepSimulation() {
    // 1. Process PoW Step
    // PoW consumes high physical energy searching for nonces
    const joulesStep = this.powState.attackActive ? 185000 : 75000;
    this.powState.joulesBurned += joulesStep;
    this.powState.wattHours = Number((this.powState.joulesBurned / 3600).toFixed(4));

    // If transactions exist, mine a block with probability or if threshold reached
    if (this.powState.mempool.length > 0) {
      const txToMine = this.powState.mempool.splice(0, Math.min(5, this.powState.mempool.length));
      this.powState.blocksMined++;

      // Pick winning miner based on hashrate share
      const rand = Math.random() * 100;
      let cum = 0;
      let winningMiner = this.powState.miners[0].name;
      for (const m of this.powState.miners) {
        cum += m.share;
        if (rand <= cum) {
          winningMiner = m.name;
          break;
        }
      }

      const minedBlock = {
        index: this.powState.confirmedChain.length,
        hash: '0000' + Crypto.hashSync(`POW_BLOCK_${this.powState.blocksMined}_${Date.now()}`).substring(0, 60),
        txCount: txToMine.length,
        nonce: Math.floor(Math.random() * 0xffffffff),
        miner: winningMiner,
        timestamp: Date.now()
      };

      if (this.powState.attackActive) {
        // Under 51% attack, honest block gets reorganized / orphaned!
        this.powState.orphanedBlocks++;
        minedBlock.miner = '🚨 51% Cartel (Alternate Fork)';
        minedBlock.reorganized = true;
      }

      this.powState.confirmedChain.unshift(minedBlock);
      if (this.powState.confirmedChain.length > 10) this.powState.confirmedChain.pop();
    }

    // 2. Process PoS Step
    // PoS consumes negligible electrical energy (~0.05 Joules for signature verification)
    this.posState.currentSlot++;
    if (this.posState.currentSlot % 8 === 0) {
      this.posState.currentEpoch++;
    }

    if (this.posState.mempool.length > 0) {
      const txToFinalize = this.posState.mempool.splice(0, Math.min(5, this.posState.mempool.length));
      this.posState.blocksFinalized++;

      // Pick proposer proportionally to stake
      const activeValidators = this.posState.validators.filter(v => v.status === 'active' && v.stake > 0);
      const totalActiveStake = activeValidators.reduce((sum, v) => sum + v.stake, 0);
      let chosenProposer = activeValidators[0];

      if (totalActiveStake > 0) {
        const randStake = Math.random() * totalActiveStake;
        let cumStake = 0;
        for (const v of activeValidators) {
          cumStake += v.stake;
          if (randStake <= cumStake) {
            chosenProposer = v;
            break;
          }
        }
      }

      const finalizedSlot = {
        slot: this.posState.currentSlot,
        epoch: this.posState.currentEpoch,
        hash: '0x' + Crypto.hashSync(`POS_SLOT_${this.posState.currentSlot}_${Date.now()}`).substring(0, 64),
        txCount: txToFinalize.length,
        proposer: chosenProposer.name,
        attestations: `${Math.floor((activeValidators.length * 2) / 3) + 1}/${activeValidators.length} Votes (67%+ Supermajority)`,
        timestamp: Date.now()
      };

      this.posState.finalizedChain.unshift(finalizedSlot);
      if (this.posState.finalizedChain.length > 10) this.posState.finalizedChain.pop();
    }

    this.sharedPendingCount = Math.max(this.powState.mempool.length, this.posState.mempool.length);

    const state = this.getState();
    eventBus.emit('COMPARE_STATE_UPDATED', state);
    return state;
  }

  /**
   * Toggle 51% hashrate attack on the PoW chain
   * Simulates an anonymous cartel out-hashing the honest chain and reorganizing history
   */
  togglePoWAttack(enabled = null) {
    if (enabled !== null) {
      this.powState.attackActive = Boolean(enabled);
    } else {
      this.powState.attackActive = !this.powState.attackActive;
    }

    if (this.powState.attackActive) {
      this.powState.hashrate = '1,120 EH/s (Attacker +500 EH/s)';
      this.powState.energyRateMW = '18,500 MW (18.5 GW)';
      this.powState.attackDetails = {
        type: 'POW_51_REORG',
        title: '🚨 51% Hashrate Eclipse & Chain Reorg Active',
        severity: 'CRITICAL',
        desc: 'An attacker mobilized 500 EH/s ($11B CapEx) to secretly mine an alternate chain. Honest blocks are being orphaned, enabling double-spends!',
        attackerCost: '$1.45 Million / hour electricity cost',
        recovery: 'Social consensus or ASIC algorithm hard-fork required'
      };
    } else {
      this.powState.hashrate = '620 EH/s';
      this.powState.energyRateMW = '10,500 MW (10.5 GW)';
      this.powState.attackDetails = null;
    }

    const state = this.getState();
    eventBus.emit('COMPARE_POW_ATTACK_TOGGLED', {
      attackActive: this.powState.attackActive,
      state
    });
    return state;
  }

  /**
   * Toggle 51% stake attack on the PoS chain
   * Simulates a malicious cartel attempting equivocation (double-signing competing checkpoints)
   * The protocol automatically executes 100% Slashing and incinerates the attacker's capital!
   */
  togglePoSAttack(enabled = null) {
    if (enabled !== null) {
      this.posState.attackActive = Boolean(enabled);
    } else {
      this.posState.attackActive = !this.posState.attackActive;
    }

    if (this.posState.attackActive) {
      // Find or create malicious cartel validator
      let rogueVal = this.posState.validators.find(v => v.id === 'val_rogue_cartel');
      if (!rogueVal) {
        rogueVal = {
          id: 'val_rogue_cartel',
          name: '🚨 51% Rogue Cartel',
          stake: 125, // 51%+ of active stake
          share: 51.0,
          color: '#ff3366',
          status: 'slashed'
        };
        this.posState.validators.push(rogueVal);
      } else {
        rogueVal.status = 'slashed';
      }

      const burnedStake = rogueVal.stake;
      rogueVal.stake = 0; // 100% Burned

      const slashEntry = {
        slot: this.posState.currentSlot,
        offense: '51% Stake Equivocation (Double-Sign Attack)',
        offender: rogueVal.name,
        stakeBurned: `${burnedStake.toFixed(1)} QUEST ($15.0 Billion)`,
        penaltyPercent: 100,
        result: 'Attacker Capital Incinerated via Casper FFG Slashing 🛡️',
        timestamp: Date.now()
      };

      this.posState.slashingLog.unshift(slashEntry);
      if (this.posState.slashingLog.length > 8) this.posState.slashingLog.pop();

      this.posState.attackDetails = {
        type: 'POS_51_SLASHED',
        title: '🛡️ 51% Attack Neutralized: 100% Stake Burned!',
        severity: 'RESOLVED_BY_SLASHING',
        desc: 'The cartel attempted to double-sign two conflicting checkpoints. Casper FFG cryptographic fraud proofs executed automated 100% slashing!',
        attackerCost: '$15.0 Billion of attacker wealth permanently destroyed',
        recovery: 'Network continued without interruption; attacker ejected forever'
      };
    } else {
      this.posState.attackDetails = null;
    }

    const state = this.getState();
    eventBus.emit('COMPARE_POS_ATTACK_TOGGLED', {
      attackActive: this.posState.attackActive,
      state
    });
    return state;
  }

  /**
   * Return side-by-side comparison across the 6 core dimensions
   */
  getMetricsComparison() {
    return [
      {
        id: 'metric_finality',
        title: 'Time to Finality',
        pow: this.powState.timeToFinality,
        pos: this.posState.timeToFinality,
        powDesc: 'Probabilistic (6 blocks). Attacker can rewrite recent history with enough hashrate.',
        posDesc: 'Deterministic (2 epochs). Slashing rules make rewriting finalized checkpoints mathematically impossible.',
        winner: 'PoS (Faster & Deterministic)'
      },
      {
        id: 'metric_energy',
        title: 'Energy Consumed',
        pow: this.powState.energyRateMW,
        pos: this.posState.energyRateMW,
        powDesc: 'Thermodynamic cost. Miners continuously burn massive electricity to solve hash puzzles.',
        posDesc: 'Negligible electricity (~15W per node). Validators sign digital signatures without hash grinding.',
        winner: 'PoS (99.95%+ Energy Reduction)'
      },
      {
        id: 'metric_attack_cost',
        title: 'Cost to Attack (51%)',
        pow: this.powState.costToAttack51,
        pos: this.posState.costToAttack51,
        powDesc: 'Expensive OpEx ($1.45M/hr), but attacker keeps physical ASIC hardware to attack other coins or resell.',
        posDesc: 'Catastrophic. Attacker must buy 51% of all coins; once caught, 100% of their capital is permanently burned!',
        winner: 'PoS (Much Higher Economic Penalty)'
      },
      {
        id: 'metric_hardware',
        title: 'Hardware Requirements',
        pow: this.powState.hardwareReq,
        pos: this.posState.hardwareReq,
        powDesc: 'Specialized ASICs with custom silicon, industrial cooling, and 3-phase power infrastructure.',
        posDesc: 'Consumer-grade hardware: Raspberry Pi 4, Mac Mini, or standard PC with 16GB RAM and 2TB SSD.',
        winner: 'PoS (Consumer Accessible)'
      },
      {
        id: 'metric_censorship',
        title: 'Censorship Resistance',
        pow: this.powState.censorshipResistance,
        pos: this.posState.censorshipResistance,
        powDesc: 'High individual sovereignty, but physical power facilities and ASIC supply chains can be targeted.',
        posDesc: 'High geographic flexibility. Staking nodes have no thermal signature and keys can be split via DVT.',
        winner: 'Tie (Physical vs Cryptographic)'
      },
      {
        id: 'metric_decentralization',
        title: 'Decentralization (Distribution)',
        pow: this.powState.decentralization,
        pos: this.posState.decentralization,
        powDesc: 'Economies of scale in energy contracts naturally centralize mining into 2-3 dominant pools.',
        posDesc: 'Lido and exchanges hold large fractions, but solo staking and liquid staking enable wide node distribution.',
        winner: 'Tie (Both Face Pool Centralization)'
      }
    ];
  }
}

export const consensusComparison = new ConsensusComparison();
