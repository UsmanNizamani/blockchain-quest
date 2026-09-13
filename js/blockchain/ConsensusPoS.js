export const OFFENSE_TYPES = {
  EQUIVOCATION: {
    key: 'EQUIVOCATION',
    label: 'Double-Signing (Equivocation)',
    desc: 'Signed two conflicting blocks/checkpoints at the same slot height.',
    penaltyPercent: 100,
    icon: '⚔️'
  },
  INVALID_BLOCK: {
    key: 'INVALID_BLOCK',
    label: 'Invalid Block Proposal',
    desc: 'Proposed a block with counterfeit transactions or invalid state transitions.',
    penaltyPercent: 25,
    icon: '🚫'
  },
  LIVENESS_FAILURE: {
    key: 'LIVENESS_FAILURE',
    label: 'Liveness Failure (Offline Leak)',
    desc: 'Prolonged offline downtime causing missed slot attestations.',
    penaltyPercent: 10,
    icon: '💤'
  }
};

import { eventBus } from '../core/EventBus.js';
import { Crypto } from './Crypto.js';
import { playerWallet } from './Wallet.js';
import { defaultBlockchain } from './Blockchain.js';
import { Block } from './Block.js';

export class Validator {
  constructor({ id, name, avatar, stake, uptime = 99.8, isPlayer = false, commission = 0.10 }) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.baseStake = Number(stake);
    this.delegatedStake = 0.0;
    this.stake = Number(stake);
    this.commission = Number(commission); // 0.10 = 10% commission on staking rewards
    this.delegations = []; // [{ delegatorAddress, amount, lstMinted, earnedRewards, isPlayer, timestamp }]
    this.delegatorRewards = 0.0;
    this.uptime = Number(uptime);
    this.status = 'active'; // 'active' | 'inactive' | 'slashed' | 'unbonding'
    this.isPlayer = Boolean(isPlayer);
    this.accumulatedRewards = 0.0;
    this.blocksProposed = 0;
    this.votesCount = 0;
    this.unbondingSlotsRemaining = 0;
    this.unbondingSecondsRemaining = 0;
    this.lastVote = null; // 'pass' | 'fail' | null
  }
}

export class ConsensusPoS {
  constructor() {
    this.isActive = false;
    this.currentSlot = 1;
    this.currentEpoch = 1;
    this.slotsPerEpoch = 8;
    this.slotDurationSec = 3.5;
    this.isAutoSlot = false;
    this.autoSlotInterval = null;

    this.rewardProposer = 4.0; // 4 QUEST for block proposer
    this.rewardAttestationPool = 6.0; // 2 QUEST split among attesters
    this.unbondingPeriodDays = 3; // 3 game-days (slots)

    this.randaoMix = '0x' + Crypto.hashSync('ETH2_GENESIS_RANDAO_ACCUMULATOR');
    this.lastRngSeed = '0x' + this.randaoMix.replace(/^0x/, '').substring(0, 16);
    this.lastRandaoStep = {
      epoch: 1,
      slot: 1,
      prevMix: '0x0000000000000000...',
      reveal: '0x' + Crypto.hashSync('GENESIS_REVEAL').substring(0, 16) + '...',
      newMix: this.randaoMix.substring(0, 18) + '...',
      seed: this.lastRngSeed,
      proposerName: 'Beacon Genesis',
      formula: 'Mix_{s} = Mix_{s-1} ⊕ Hash(Reveal)'
    };
    this.lastBatchSimulation = null;
    this.activeProposer = null;
    this.attestingStake = 0;
    this.totalActiveStake = 0;
    this.supermajorityReached = false;
    this.isFinalized = false;
    this.lastSlashing = null;
    this.slashingLedger = [];

    this.candidateBlock = null;
    this.attestations = [];

    this.validators = [];
    this.initDefaultValidators();
  }

  setActive(active) {
    this.isActive = Boolean(active);
    if (!this.isActive && this.isAutoSlot) {
      this.toggleAutoSlot(false);
    }
    eventBus.emit('POS_STATE_CHANGED', { isActive: this.isActive });
  }

  initDefaultValidators() {
    this.validators = [
      new Validator({ id: 'val_beacon', name: 'Beacon Prime', avatar: '🏛️', stake: 64, uptime: 99.9 }),
      new Validator({ id: 'val_alpha', name: 'Validator Alpha', avatar: '⚡', stake: 32, uptime: 99.5 }),
      new Validator({ id: 'val_pool', name: 'EtherStaking Pool', avatar: '🌊', stake: 48, uptime: 99.0 }),
      new Validator({ id: 'val_nexus', name: 'Nexus Node', avatar: '🛰️', stake: 16, uptime: 98.2 }),
      new Validator({ id: 'val_solar', name: 'Solar Staker', avatar: '☀️', stake: 24, uptime: 97.5 }),
      new Validator({ id: 'val_rogue', name: 'Rogue Node', avatar: '👾', stake: 16, uptime: 94.0 }),
      new Validator({ id: 'val_cold', name: 'Cold Reserve', avatar: '❄️', stake: 32, uptime: 99.2 }),
      (() => { const v = new Validator({ id: 'val_player', name: 'Player Validator', avatar: '👑', stake: 0, uptime: 100.0, isPlayer: true }); v.status = 'inactive'; return v; })()
    ];
  }

  getPlayerValidator() {
    return this.validators.find(v => v.isPlayer) || null;
  }

  getActiveValidators() {
    return this.validators.filter(v => v.status === 'active' && v.stake > 0);
  }

  getTotalActiveStake() {
    return this.getActiveValidators().reduce((sum, v) => sum + v.stake, 0);
  }

  calculateProbabilities() {
    const active = this.getActiveValidators();
    const total = this.getTotalActiveStake();
    if (total === 0) return [];

    return active.map(val => ({
      validator: val,
      stake: val.stake,
      weight: val.stake / total,
      probabilityPercent: Number(((val.stake / total) * 100).toFixed(1))
    }));
  }

  /**
   * Player locks coins from wallet to become an active validator
   * @param {number} amount
   */
  stakePlayer(amount) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Stake amount must be a positive number.');
    }
    if (num > playerWallet.balance) {
      throw new Error(`Insufficient wallet funds: Balance is ${playerWallet.balance.toFixed(2)} QUEST, requested ${num.toFixed(2)}.`);
    }

    playerWallet.balance -= num;
    let pVal = this.getPlayerValidator();
    if (!pVal) {
      pVal = new Validator({ id: 'val_player', name: 'Player Validator', avatar: '👑', stake: num, uptime: 100.0, isPlayer: true });
      this.validators.push(pVal);
    } else {
      pVal.stake += num;
      pVal.status = 'active';
      pVal.unbondingSlotsRemaining = 0;
      pVal.unbondingSecondsRemaining = 0;
    }

    eventBus.emit('WALLET_UPDATED', {
      address: playerWallet.address,
      balance: playerWallet.balance,
      publicKey: playerWallet.publicKey
    });

    eventBus.emit('POS_VALIDATOR_STAKED', {
      validator: pVal,
      amount: num,
      totalStake: pVal.stake
    });

    return pVal;
  }

  /**
   * Player requests withdrawal: enters 3 game-day unbonding period
   */
  requestUnbondPlayer() {
    const pVal = this.getPlayerValidator();
    if (!pVal || pVal.status !== 'active' || pVal.stake <= 0) {
      throw new Error('No active staked validator to unbond.');
    }

    pVal.status = 'unbonding';
    pVal.unbondingSlotsRemaining = this.unbondingPeriodDays; // 3 slots / game-days
    pVal.unbondingSecondsRemaining = 15;

    eventBus.emit('POS_UNBONDING_STARTED', {
      validator: pVal,
      unbondingSlots: pVal.unbondingSlotsRemaining,
      unbondingDays: this.unbondingPeriodDays
    });

    return pVal;
  }

  /**
   * Finalize unbonding and return capital + rewards to player wallet
   */
  completeUnbondingPlayer() {
    const pVal = this.getPlayerValidator();
    if (!pVal || pVal.status !== 'unbonding') return;

    const returnAmount = Number((pVal.stake + pVal.accumulatedRewards).toFixed(2));
    playerWallet.balance += returnAmount;

    const refundedStake = pVal.stake;
    const refundedRewards = pVal.accumulatedRewards;

    pVal.stake = 0;
    pVal.accumulatedRewards = 0;
    pVal.status = 'inactive';
    pVal.unbondingSlotsRemaining = 0;
    pVal.unbondingSecondsRemaining = 0;

    eventBus.emit('WALLET_UPDATED', {
      address: playerWallet.address,
      balance: playerWallet.balance,
      publicKey: playerWallet.publicKey
    });

    eventBus.emit('POS_UNBONDING_COMPLETED', {
      validator: pVal,
      refundedTotal: returnAmount,
      refundedStake,
      refundedRewards
    });
  }

  /**
   * Delegate QUEST coins from player wallet to an active validator
   * Mints 1:1 Liquid Staking Token (stQUEST)
   * @param {string} validatorId
   * @param {number} amount
   */
  delegatePlayer(validatorId, amount) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Delegation amount must be a positive number.');
    }
    if (num > playerWallet.balance) {
      throw new Error(`Insufficient wallet funds: Balance is ${playerWallet.balance.toFixed(2)} QUEST, requested ${num.toFixed(2)}.`);
    }
    const val = this.validators.find(v => v.id === validatorId);
    if (!val) {
      throw new Error(`Validator '${validatorId}' not found.`);
    }
    if (val.status !== 'active') {
      throw new Error(`Cannot delegate to ${val.name}: Validator is currently ${val.status}.`);
    }

    // Deduct QUEST from player wallet
    playerWallet.balance = Number((playerWallet.balance - num).toFixed(2));
    // Mint 1:1 stQUEST (Liquid Staking Token)
    playerWallet.stQuestBalance = Number(((playerWallet.stQuestBalance || 0) + num).toFixed(2));

    // Increase validator delegated stake and total stake
    val.delegatedStake = Number((val.delegatedStake + num).toFixed(2));
    val.stake = Number((val.baseStake + val.delegatedStake).toFixed(2));

    // Record or augment delegation record
    let del = val.delegations.find(d => d.delegatorAddress === playerWallet.address);
    if (!del) {
      del = {
        delegatorAddress: playerWallet.address,
        amount: 0,
        lstMinted: 0,
        earnedRewards: 0,
        isPlayer: true,
        timestamp: Date.now()
      };
      val.delegations.push(del);
    }
    del.amount = Number((del.amount + num).toFixed(2));
    del.lstMinted = Number((del.lstMinted + num).toFixed(2));

    eventBus.emit('WALLET_UPDATED', {
      address: playerWallet.address,
      balance: playerWallet.balance,
      stQuestBalance: playerWallet.stQuestBalance,
      publicKey: playerWallet.publicKey
    });

    const eventPayload = {
      validator: val,
      amount: num,
      stQuestMinted: num,
      playerStQuestBalance: playerWallet.stQuestBalance,
      validatorTotalStake: val.stake,
      validatorDelegatedStake: val.delegatedStake
    };

    eventBus.emit('POS_DELEGATION_CREATED', eventPayload);
    return eventPayload;
  }

  /**
   * Undelegate: Redeem stQUEST back into QUEST
   * @param {string} validatorId
   * @param {number} amount
   */
  undelegatePlayer(validatorId, amount) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Undelegation amount must be a positive number.');
    }
    if ((playerWallet.stQuestBalance || 0) < num) {
      throw new Error(`Insufficient stQUEST balance: You hold ${(playerWallet.stQuestBalance || 0).toFixed(2)} stQUEST, requested ${num.toFixed(2)}.`);
    }
    const val = this.validators.find(v => v.id === validatorId);
    if (!val) {
      throw new Error(`Validator '${validatorId}' not found.`);
    }
    const del = val.delegations.find(d => d.delegatorAddress === playerWallet.address);
    if (!del || del.amount < num) {
      const activeAmt = del ? del.amount : 0;
      throw new Error(`Cannot undelegate ${num.toFixed(2)} QUEST: Active delegation with ${val.name} is ${activeAmt.toFixed(2)} QUEST.`);
    }

    // Burn stQUEST and return QUEST
    playerWallet.stQuestBalance = Number((playerWallet.stQuestBalance - num).toFixed(2));
    playerWallet.balance = Number((playerWallet.balance + num).toFixed(2));

    del.amount = Number((del.amount - num).toFixed(2));
    del.lstMinted = Number(Math.max(0, del.lstMinted - num).toFixed(2));
    val.delegatedStake = Number(Math.max(0, val.delegatedStake - num).toFixed(2));
    val.stake = Number((val.baseStake + val.delegatedStake).toFixed(2));

    eventBus.emit('WALLET_UPDATED', {
      address: playerWallet.address,
      balance: playerWallet.balance,
      stQuestBalance: playerWallet.stQuestBalance,
      publicKey: playerWallet.publicKey
    });

    const eventPayload = {
      validator: val,
      amount: num,
      stQuestBurned: num,
      playerStQuestBalance: playerWallet.stQuestBalance,
      validatorTotalStake: val.stake
    };
    eventBus.emit('POS_UNDELEGATION_COMPLETED', eventPayload);
    return eventPayload;
  }

  /**
   * Get all active delegations for the player
   */
  getPlayerDelegations() {
    const list = [];
    for (const val of this.validators) {
      const del = val.delegations.find(d => d.delegatorAddress === playerWallet.address && d.amount > 0);
      if (del) {
        list.push({
          validator: val,
          delegation: del
        });
      }
    }
    return list;
  }

  /**
   * Bitwise XOR of two 64-character (256-bit) hex strings
   * Simulates Ethereum beacon RANDAO accumulator: randaoMix = randaoMix ^ hash(proposerReveal)
   */
  computeRandaoXOR(prevMixHex, revealHex) {
    const cleanPrev = (prevMixHex || '').replace(/^0x/, '').padStart(64, '0').substring(0, 64);
    const cleanReveal = (revealHex || '').replace(/^0x/, '').padStart(64, '0').substring(0, 64);

    let xorHex = '';
    // Process in 8-char (32-bit uint) chunks for exact JS bitwise operations
    for (let i = 0; i < 64; i += 8) {
      const pChunk = parseInt(cleanPrev.substring(i, i + 8), 16) || 0;
      const rChunk = parseInt(cleanReveal.substring(i, i + 8), 16) || 0;
      const xorChunk = (pChunk ^ rChunk) >>> 0; // unsigned 32-bit uint
      xorHex += xorChunk.toString(16).padStart(8, '0');
    }

    return '0x' + xorHex;
  }

  /**
   * Dynamically modify a validator's stake (add or remove) to observe probability changes
   * @param {string} validatorId
   * @param {number} delta - amount to add or remove
   */
  adjustValidatorStake(validatorId, delta) {
    const val = this.validators.find(v => v.id === validatorId);
    if (!val) {
      throw new Error(`Validator '${validatorId}' not found.`);
    }
    const numDelta = Number(delta);
    if (isNaN(numDelta)) {
      throw new Error('Invalid stake delta.');
    }

    const newBase = Math.max(1.0, Number((val.baseStake + numDelta).toFixed(2)));
    val.baseStake = newBase;
    val.stake = Number((val.baseStake + val.delegatedStake).toFixed(2));

    const totalActive = this.getTotalActiveStake();
    const stats = this.calculateProbabilities();

    const result = {
      validator: val,
      delta: numDelta,
      newStake: val.stake,
      totalActiveStake: totalActive,
      probabilities: stats
    };

    eventBus.emit('POS_STAKES_UPDATED', result);
    return result;
  }

  /**
   * Run N simulated slots to evaluate deterministic weighted selection against theoretical probabilities
   * @param {number} slotCount - default 100 slots
   */
  runBatchSimulation(slotCount = 100) {
    const N = Math.max(10, Math.min(1000, Number(slotCount) || 100));
    const active = this.getActiveValidators();
    const totalStake = this.getTotalActiveStake();

    if (active.length === 0 || totalStake === 0) {
      throw new Error('No active validators with stake to simulate.');
    }

    // Initialize counts
    const counts = {};
    for (const v of active) {
      counts[v.id] = 0;
    }

    // Simulate N slots using weighted random selection with successive RANDAO seeds
    let simRandao = this.randaoMix;
    const history = [];

    for (let s = 1; s <= N; s++) {
      // Step entropy: XOR with pseudo-reveal
      const pseudoReveal = Crypto.hashSync(`SIM_SLOT_${s}_SEED_${simRandao}`);
      simRandao = this.computeRandaoXOR(simRandao, pseudoReveal);
      const chosen = this.selectWeightedProposer(simRandao);
      if (chosen) {
        counts[chosen.id] = (counts[chosen.id] || 0) + 1;
        history.push({ slot: s, validatorId: chosen.id, validatorName: chosen.name });
      }
    }

    // Compute metrics for each validator
    let totalChiSquare = 0;
    const validatorStats = active.map(val => {
      const p = val.stake / totalStake;
      const expected = Number((N * p).toFixed(2));
      const actual = counts[val.id] || 0;
      const luckPercent = expected > 0 ? Number(((actual / expected) * 100).toFixed(1)) : 100.0;
      
      // Standard deviation for Binomial(N, p): sqrt(N * p * (1 - p))
      const stdDev = Math.sqrt(Math.max(0.01, N * p * (1 - p)));
      const zScore = Number(((actual - expected) / stdDev).toFixed(2));
      const variance = Number(Math.pow(actual - expected, 2).toFixed(2));

      // Chi-square component: (O - E)^2 / E
      const chiSq = expected > 0 ? Math.pow(actual - expected, 2) / expected : 0;
      totalChiSquare += chiSq;

      // Luck status description
      let luckStatus = 'NEUTRAL';
      let luckLabel = '⚪ Expected Range';
      if (luckPercent >= 120) {
        luckStatus = 'HOT';
        luckLabel = '🔥 Hot Streak (High Variance)';
      } else if (luckPercent <= 80) {
        luckStatus = 'COLD';
        luckLabel = '❄️ Cold Streak (Low Variance)';
      }

      return {
        id: val.id,
        name: val.name,
        avatar: val.avatar,
        stake: val.stake,
        probabilityPercent: Number((p * 100).toFixed(1)),
        expected,
        actual,
        luckPercent,
        luckStatus,
        luckLabel,
        stdDev: Number(stdDev.toFixed(2)),
        zScore,
        variance
      };
    });

    // Network overall variance status
    const degreesOfFreedom = Math.max(1, active.length - 1);
    const normalizedVariance = totalChiSquare / degreesOfFreedom;

    let networkVarianceStatus = 'NORMAL';
    let networkVarianceLabel = '🟢 Normal Variance (Matches Law of Large Numbers)';
    if (normalizedVariance > 2.5) {
      networkVarianceStatus = 'HIGH_VARIANCE';
      networkVarianceLabel = '🟡 High Sample Variance (Short-Term Fluctuations)';
    }

    const payload = {
      slotCount: N,
      totalActiveStake: totalStake,
      activeValidatorsCount: active.length,
      validators: validatorStats,
      chiSquare: Number(totalChiSquare.toFixed(2)),
      degreesOfFreedom,
      networkVarianceStatus,
      networkVarianceLabel,
      timestamp: Date.now()
    };

    this.lastBatchSimulation = payload;
    eventBus.emit('POS_BATCH_SIMULATION_COMPLETED', payload);
    return payload;
  }

  /**
   * Deterministic Weighted Random Selection based on active stake
   * @param {string} seed
   * @returns {Validator}
   */
  selectWeightedProposer(seed = this.lastRngSeed) {
    const active = this.getActiveValidators();
    if (active.length === 0) return null;

    const totalStake = this.getTotalActiveStake();
    const hexSlice = seed.replace(/^0x/, '').substring(0, 8);
    const intVal = parseInt(hexSlice, 16) || Math.floor(Math.random() * 0xffffffff);
    const normalized = (intVal % 1000000) / 1000000;

    let cumulative = 0;
    for (const val of active) {
      cumulative += val.stake / totalStake;
      if (normalized <= cumulative) {
        return val;
      }
    }
    return active[active.length - 1];
  }

  /**
   * Slash a malicious or negligent validator:
   * - EQUIVOCATION: 100% stake burn + ejection
   * - INVALID_BLOCK: 25% stake burn + ejection
   * - LIVENESS_FAILURE: 10% penalty burn + ejection
   * Whistleblower receives 10% bounty of burned stake.
   */
  slashValidator(validatorId, offenseType = 'EQUIVOCATION', customReason = '', whistleblowerId = null) {
    const val = this.validators.find(v => v.id === validatorId);
    if (!val) return null;

    const offense = OFFENSE_TYPES[offenseType] || OFFENSE_TYPES.EQUIVOCATION;
    const stakeBefore = Number(val.stake.toFixed(2));
    const burnPercent = offense.penaltyPercent;
    const stakeBurned = Number((stakeBefore * (burnPercent / 100)).toFixed(2));
    const stakeAfter = Number(Math.max(0, stakeBefore - stakeBurned).toFixed(2));

    val.stake = stakeAfter;
    val.status = 'slashed';

    // Propagate slashing to baseStake, delegatedStake, and delegators!
    const baseBurned = Number((val.baseStake * (burnPercent / 100)).toFixed(2));
    val.baseStake = Math.max(0, Number((val.baseStake - baseBurned).toFixed(2)));

    let delegatorBurnedTotal = 0;
    let playerSlashedAmt = 0;

    if (val.delegatedStake > 0) {
      delegatorBurnedTotal = Number((val.delegatedStake * (burnPercent / 100)).toFixed(2));
      val.delegatedStake = Math.max(0, Number((val.delegatedStake - delegatorBurnedTotal).toFixed(2)));

      for (const del of val.delegations) {
        const delSlash = Number((del.amount * (burnPercent / 100)).toFixed(2));
        del.amount = Math.max(0, Number((del.amount - delSlash).toFixed(2)));
        if (del.delegatorAddress === playerWallet.address || del.isPlayer) {
          playerSlashedAmt += delSlash;
        }
      }

      if (playerSlashedAmt > 0) {
        eventBus.emit('DELEGATION_SLASHED', {
          validator: val,
          burnPercent,
          playerSlashedAmt,
          delegatorBurnedTotal,
          offense
        });
      }
    }

    // Select whistleblower (honest active peer or player)
    const honestPeers = this.validators.filter(v => v.id !== val.id && v.status === 'active' && v.stake > 0);
    let whistleblower = null;
    if (whistleblowerId) {
      whistleblower = this.validators.find(v => v.id === whistleblowerId);
    } else if (honestPeers.length > 0) {
      whistleblower = honestPeers[Math.floor(Math.random() * honestPeers.length)];
    }

    // Whistleblower Bounty: 10% of the burned stake
    const whistleblowerReward = Number((stakeBurned * 0.10).toFixed(2));
    if (whistleblower && whistleblowerReward > 0) {
      whistleblower.accumulatedRewards = Number((whistleblower.accumulatedRewards + whistleblowerReward).toFixed(2));
      if (whistleblower.isPlayer) {
        playerWallet.balance = Number((playerWallet.balance + whistleblowerReward).toFixed(2));
        eventBus.emit('WALLET_UPDATED', {
          address: playerWallet.address,
          balance: playerWallet.balance,
          publicKey: playerWallet.publicKey
        });
      }
    }

    const reason = customReason || offense.desc;

    const result = {
      id: `slash_${this.currentSlot}_${Date.now()}`,
      validator: val,
      offenseType: offense.key,
      offenseLabel: offense.label,
      offenseIcon: offense.icon,
      penaltyPercent: burnPercent,
      stakeBefore,
      stakeBurned,
      slashedStake: stakeBurned, // backward compatibility
      stakeAfter,
      delegatorBurnedTotal,
      playerSlashedAmt,
      whistleblower: whistleblower ? {
        id: whistleblower.id,
        name: whistleblower.name,
        avatar: whistleblower.avatar,
        reward: whistleblowerReward
      } : null,
      reason,
      timestamp: Date.now(),
      slot: this.currentSlot
    };

    this.lastSlashing = result;
    this.slashingLedger.unshift(result);
    if (this.slashingLedger.length > 20) {
      this.slashingLedger.pop();
    }

    eventBus.emit('POS_SLASHING_TRIGGERED', result);
    eventBus.emit('SHOW_POS_MODAL', result);

    return result;
  }

  /**
   * Execute one block slot
   * @param {boolean|string} simulateCheat - boolean or offense type key ('EQUIVOCATION', 'INVALID_BLOCK', 'LIVENESS_FAILURE')
   */
  async runSlot(simulateCheat = false) {
    this.currentSlot++;
    if (this.currentSlot % this.slotsPerEpoch === 0) {
      this.currentEpoch++;
    }

    // Advance unbonding countdowns
    const pVal = this.getPlayerValidator();
    if (pVal && pVal.status === 'unbonding') {
      pVal.unbondingSlotsRemaining = Math.max(0, pVal.unbondingSlotsRemaining - 1);
      if (pVal.unbondingSlotsRemaining === 0) {
        this.completeUnbondingPlayer();
      }
    }

    // 1. Advance RANDAO accumulator with bitwise XOR of entropy reveal
    const prevMix = this.randaoMix;
    const proposerHint = this.activeProposer ? this.activeProposer.id : 'genesis';
    const entropyReveal = Crypto.hashSync(`${proposerHint}_EPOCH_${this.currentEpoch}_SLOT_${this.currentSlot}_${Date.now()}`);
    this.randaoMix = this.computeRandaoXOR(prevMix, entropyReveal);
    this.lastRngSeed = '0x' + this.randaoMix.replace(/^0x/, '').substring(0, 16);

    this.lastRandaoStep = {
      epoch: this.currentEpoch,
      slot: this.currentSlot,
      prevMix: prevMix.substring(0, 18) + '...',
      reveal: ('0x' + entropyReveal).substring(0, 18) + '...',
      newMix: this.randaoMix.substring(0, 18) + '...',
      seed: this.lastRngSeed,
      proposerName: this.activeProposer ? this.activeProposer.name : 'Beacon Network',
      formula: 'Mix_{s} = Mix_{s-1} ⊕ Hash(Reveal)'
    };

    // 2. Select weighted proposer
    const proposer = this.selectWeightedProposer(this.lastRngSeed);
    this.activeProposer = proposer;
    if (proposer) {
      proposer.blocksProposed++;
    }

    // 3. Create proposed candidate block
    const prevBlock = defaultBlockchain.getLatestBlock();
    const candidateData = {
      tx: `Slot #${this.currentSlot} [PoS Finalized] • Proposer: ${proposer ? proposer.name : 'Unknown'}`,
      summary: `Slot #${this.currentSlot} [PoS Finalized] • Proposer: ${proposer ? proposer.name : 'Unknown'}`
    };

    this.candidateBlock = new Block(
      defaultBlockchain.chain.length,
      candidateData,
      prevBlock ? prevBlock.hash : '0'.repeat(64),
      0,
      Date.now(),
      0,
      true
    );
    this.candidateBlock.hash = this.candidateBlock.calculateHash();

    // 4. Collect attestations from active validators
    const active = this.getActiveValidators();
    this.totalActiveStake = this.getTotalActiveStake();
    this.attestations = [];
    let attestingStakeSum = 0;

    let isMalicious = Boolean(simulateCheat);
    let offenseKey = 'EQUIVOCATION';
    if (typeof simulateCheat === 'string') {
      offenseKey = simulateCheat;
      isMalicious = true;
    } else if (simulateCheat === true) {
      offenseKey = 'EQUIVOCATION';
      isMalicious = true;
    }

    let offender = proposer;
    if (offenseKey === 'LIVENESS_FAILURE') {
      const candidates = active.filter(v => !v.isPlayer);
      offender = candidates[Math.floor(Math.random() * candidates.length)] || proposer;
    }

    for (const val of active) {
      let vote = true;
      if (isMalicious && offenseKey === 'EQUIVOCATION') {
        vote = val.id === proposer?.id;
      } else if (isMalicious && offenseKey === 'INVALID_BLOCK') {
        vote = false; // All honest validators reject invalid blocks
      } else if (isMalicious && offenseKey === 'LIVENESS_FAILURE') {
        vote = val.id !== offender?.id; // Offender is offline
      } else {
        vote = (Math.random() * 100) <= val.uptime;
      }

      val.lastVote = vote ? 'pass' : 'fail';
      val.votesCount++;

      if (vote) {
        attestingStakeSum += val.stake;
      }

      this.attestations.push({
        validatorId: val.id,
        validatorName: val.name,
        avatar: val.avatar,
        stake: val.stake,
        vote
      });
    }

    this.attestingStake = attestingStakeSum;
    const supermajorityThreshold = (2 / 3) * this.totalActiveStake;
    this.supermajorityReached = this.attestingStake >= supermajorityThreshold;

    let slashingResult = null;
    let rewardResult = null;

    if (isMalicious && offender) {
      this.supermajorityReached = false;
      this.isFinalized = false;
      slashingResult = this.slashValidator(
        offender.id,
        offenseKey,
        `Slot #${this.currentSlot}: Slashed for ${OFFENSE_TYPES[offenseKey]?.label || offenseKey}!`
      );
    } else if (this.supermajorityReached) {
      this.isFinalized = true;
      defaultBlockchain.chain.push(this.candidateBlock);
      defaultBlockchain.candidateBlock = null;

      rewardResult = this.distributeRewards(proposer, this.attestations.filter(a => a.vote));
    } else {
      this.isFinalized = false;
    }

    const slotSummary = {
      slot: this.currentSlot,
      epoch: this.currentEpoch,
      rngSeed: this.lastRngSeed,
      proposer,
      candidateBlock: this.candidateBlock,
      attestations: this.attestations,
      attestingStake: this.attestingStake,
      totalActiveStake: this.totalActiveStake,
      supermajorityThreshold: Number(supermajorityThreshold.toFixed(1)),
      supermajorityReached: this.supermajorityReached,
      isFinalized: this.isFinalized,
      slashed: Boolean(slashingResult),
      slashingResult,
      rewardResult,
      randaoStep: this.lastRandaoStep,
      probabilities: this.calculateProbabilities()
    };

    eventBus.emit('POS_SLOT_COMPLETED', slotSummary);
    if (this.isFinalized) {
      eventBus.emit('POS_BLOCK_FINALIZED', slotSummary);
    }

    return slotSummary;
  }

  /**
   * Distribute rewards proportionally to stake
   */
  distributeRewards(proposer, attestingList) {
    // 1. Proposer Reward
    if (proposer && proposer.status === 'active') {
      this._creditValidatorAndDelegators(proposer, this.rewardProposer, 'proposer');
    }

    // 2. Attestation Pool Rewards
    const totalAttestingStake = attestingList.reduce((sum, a) => sum + a.stake, 0);
    const shares = [];

    if (totalAttestingStake > 0) {
      for (const item of attestingList) {
        const val = this.validators.find(v => v.id === item.validatorId);
        if (val && val.status === 'active') {
          const shareRatio = val.stake / totalAttestingStake;
          const rewardAmt = Number((this.rewardAttestationPool * shareRatio).toFixed(3));
          this._creditValidatorAndDelegators(val, rewardAmt, 'attestation');

          shares.push({
            validatorId: val.id,
            name: val.name,
            rewardAmt,
            shareRatio: Number((shareRatio * 100).toFixed(1))
          });
        }
      }
    }

    if (playerWallet) {
      eventBus.emit('WALLET_UPDATED', {
        address: playerWallet.address,
        balance: playerWallet.balance,
        stQuestBalance: playerWallet.stQuestBalance,
        publicKey: playerWallet.publicKey
      });
    }

    return {
      proposerReward: this.rewardProposer,
      attestationPool: this.rewardAttestationPool,
      attestationShares: shares
    };
  }

  /**
   * Helper: Credits validator operator and splits reward with delegators minus commission (10%)
   */
  _creditValidatorAndDelegators(val, rawReward, type = 'attestation') {
    if (!val || val.status !== 'active' || rawReward <= 0) return;

    if (val.delegatedStake > 0 && val.stake > 0) {
      const delegatorPortionGross = rawReward * (val.delegatedStake / val.stake);
      const commissionRate = val.commission !== undefined ? val.commission : 0.10;
      const commissionCut = delegatorPortionGross * commissionRate;
      const delegatorsNet = delegatorPortionGross - commissionCut;
      const operatorReward = (rawReward * (val.baseStake / val.stake)) + commissionCut;

      val.accumulatedRewards = Number((val.accumulatedRewards + operatorReward).toFixed(3));
      val.delegatorRewards = Number(((val.delegatorRewards || 0) + delegatorsNet).toFixed(3));

      // If this is the player's own validator, player gets operatorReward
      if (val.isPlayer) {
        playerWallet.balance = Number((playerWallet.balance + operatorReward).toFixed(3));
      }

      // Pro-rate to each delegator
      for (const del of val.delegations) {
        if (del.amount > 0) {
          const delegatorShare = delegatorsNet * (del.amount / val.delegatedStake);
          del.earnedRewards = Number(((del.earnedRewards || 0) + delegatorShare).toFixed(3));

          if (del.delegatorAddress === playerWallet.address || del.isPlayer) {
            playerWallet.balance = Number((playerWallet.balance + delegatorShare).toFixed(3));
            eventBus.emit('DELEGATOR_REWARD_EARNED', {
              validator: val,
              reward: delegatorShare,
              commissionCut,
              rewardType: type
            });
          }
        }
      }
    } else {
      // Solo validator with zero delegations
      val.accumulatedRewards = Number((val.accumulatedRewards + rawReward).toFixed(3));
      if (val.isPlayer) {
        playerWallet.balance = Number((playerWallet.balance + rawReward).toFixed(3));
      }
    }
  }

  toggleAutoSlot(enabled = null) {
    if (enabled !== null) {
      this.isAutoSlot = Boolean(enabled);
    } else {
      this.isAutoSlot = !this.isAutoSlot;
    }

    if (this.autoSlotInterval) {
      clearInterval(this.autoSlotInterval);
      this.autoSlotInterval = null;
    }

    if (this.isAutoSlot) {
      this.autoSlotInterval = setInterval(() => {
        if (this.isActive) {
          this.runSlot();
        }
      }, this.slotDurationSec * 1000);
    }

    eventBus.emit('POS_AUTO_SLOT_TOGGLED', { isAutoSlot: this.isAutoSlot });
    return this.isAutoSlot;
  }
}

export const consensusPoS = new ConsensusPoS();
