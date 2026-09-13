import { eventBus } from '../core/EventBus.js';

/**
 * Proof of Stake Attack Vectors Simulation Engine
 * - Scenario A: Nothing-at-Stake (Dual-Fork Voting vs PoW Hashrate Splitting & Slashing)
 * - Scenario B: Long-Range Attack (Compromised Historical Keys vs Weak Subjectivity Checkpoints)
 */
export class PosAttackSim {
  constructor() {
    this.isActive = false;
    this.activeScenario = 'nothing_at_stake'; // 'nothing_at_stake' | 'long_range'

    // =========================================
    // SCENARIO A: NOTHING-AT-STAKE STATE
    // =========================================
    this.nothingAtStake = {
      step: 'initial', // 'initial' | 'forked' | 'voted_both' | 'slashed'
      isSlashingEnabled: false,
      validator: {
        id: 'val_naive',
        name: 'Naive Staker',
        avatar: '🤖',
        initialStake: 100.0,
        stake: 100.0,
        status: 'active', // 'active' | 'slashed'
        votes: {
          branchA: false,
          branchB: false
        }
      },
      fork: {
        commonAncestor: { index: 3, hash: '0x3a8f...c901', name: 'Block #3 (Common Parent)' },
        branchA: [
          { index: 4, hash: '0x4a11...00a1', name: 'Block #4A (Cyan Fork)', proposer: 'Validator Alpha ⚡', votes: 1 },
          { index: 5, hash: '0x5a22...00a2', name: 'Block #5A (Cyan Head)', proposer: 'Validator Solar ☀️', votes: 1 }
        ],
        branchB: [
          { index: 4, hash: '0x4b33...00b1', name: 'Block #4B (Amber Fork)', proposer: 'Validator Beta 🌊', votes: 1 },
          { index: 5, hash: '0x5b44...00b2', name: 'Block #5B (Amber Head)', proposer: 'Validator Nexus 🛰️', votes: 1 }
        ]
      },
      powComparison: {
        minerName: 'ASIC Rig Miner',
        totalHashrateTH: 100,
        splitA_Percent: 50,
        splitB_Percent: 50,
        powerKW: 3.25,
        marginalCostPerVote: 0.0, // $0 in PoS
        powEnergyConstraint: 'Thermodynamic Bound: Hashrate must split (50/50). Cannot mine 100% on both forks.'
      },
      slashedEvent: null
    };

    // =========================================
    // SCENARIO B: LONG-RANGE ATTACK STATE
    // =========================================
    this.longRange = {
      step: 'initial', // 'initial' | 'compromised' | 'forging' | 'defended' | 'reorg_attempted'
      isWeakSubjectivityEnabled: true,
      unbondingHorizonBlocks: 150, // within 150 blocks of head
      canonicalChain: {
        genesis: 0,
        checkpointOld: 100, // Where Alice & Bob held 65% stake
        checkpointFinalized: 200, // Finalized Weak Subjectivity Checkpoint (Unbonding completed here)
        currentHead: 350
      },
      historicalValidators: {
        names: ['Alice (Validator #1)', 'Bob (Validator #2)'],
        avatar: '🧓',
        stakeAtBlock100: 65.0, // 65% of stake at slot 100
        unbondedAtBlock200: true,
        currentStakeAtHead350: 0.0, // Withdrew capital long ago!
        keyCompromised: false
      },
      attackerChain: {
        forkPoint: 100,
        forgedHead: 100,
        targetHead: 355, // Attacker forged longer chain!
        isLonger: false,
        status: 'dormant' // 'dormant' | 'racing' | 'rejected' | 'accepted'
      },
      defenseResult: null
    };
  }

  setActive(active, scenario = 'nothing_at_stake') {
    this.isActive = Boolean(active);
    this.activeScenario = scenario;
    eventBus.emit('POS_ATTACKS_STATE_CHANGED', {
      isActive: this.isActive,
      activeScenario: this.activeScenario
    });
  }

  activate(scenario = 'nothing_at_stake') {
    this.setActive(true, scenario);
  }

  deactivate() {
    this.setActive(false);
  }

  setScenario(scenario) {
    this.activeScenario = scenario;
    eventBus.emit('POS_ATTACKS_SCENARIO_CHANGED', { activeScenario: this.activeScenario });
  }

  // =========================================
  // SCENARIO A: NOTHING-AT-STAKE ACTIONS
  // =========================================

  resetNothingAtStake() {
    this.nothingAtStake.step = 'initial';
    this.nothingAtStake.validator.stake = this.nothingAtStake.validator.initialStake;
    this.nothingAtStake.validator.status = 'active';
    this.nothingAtStake.validator.votes.branchA = false;
    this.nothingAtStake.validator.votes.branchB = false;
    this.nothingAtStake.slashedEvent = null;
    eventBus.emit('NOTHING_AT_STAKE_UPDATED', this.nothingAtStake);
  }

  toggleNothingAtStakeSlashing(enabled = null) {
    if (enabled !== null) {
      this.nothingAtStake.isSlashingEnabled = Boolean(enabled);
    } else {
      this.nothingAtStake.isSlashingEnabled = !this.nothingAtStake.isSlashingEnabled;
    }
    eventBus.emit('NOTHING_AT_STAKE_UPDATED', this.nothingAtStake);
    return this.nothingAtStake.isSlashingEnabled;
  }

  voteNothingAtStake(branch) {
    if (this.nothingAtStake.validator.status === 'slashed') {
      throw new Error('Validator is slashed and ejected! Cannot vote.');
    }

    if (branch === 'A') {
      this.nothingAtStake.validator.votes.branchA = true;
    } else if (branch === 'B') {
      this.nothingAtStake.validator.votes.branchB = true;
    } else if (branch === 'both') {
      this.nothingAtStake.validator.votes.branchA = true;
      this.nothingAtStake.validator.votes.branchB = true;
    }

    const votesBoth = this.nothingAtStake.validator.votes.branchA && this.nothingAtStake.validator.votes.branchB;

    if (votesBoth) {
      this.nothingAtStake.step = 'voted_both';

      if (this.nothingAtStake.isSlashingEnabled) {
        // Slashing Protocol Triggered: Equivocation detected!
        this.nothingAtStake.step = 'slashed';
        this.nothingAtStake.validator.status = 'slashed';
        const burned = this.nothingAtStake.validator.stake;
        this.nothingAtStake.validator.stake = 0.0;

        this.nothingAtStake.slashedEvent = {
          validator: this.nothingAtStake.validator,
          offense: 'Double-Signing (Equivocation)',
          penaltyPercent: 100,
          stakeBurned: burned,
          forkHeights: [4, 4],
          conflictingBlocks: ['Block #4A (Cyan Fork)', 'Block #4B (Amber Fork)'],
          timestamp: Date.now()
        };

        eventBus.emit('NOTHING_AT_STAKE_SLASHED', this.nothingAtStake.slashedEvent);
        eventBus.emit('SHOW_NOTHING_AT_STAKE_MODAL', this.nothingAtStake.slashedEvent);
      } else {
        // Naive PoS: No punishment! Validator gets away with dual voting
        eventBus.emit('NOTHING_AT_STAKE_VOTED_BOTH', {
          validator: this.nothingAtStake.validator,
          cost: 0,
          expectedReward: '+8.0 QUEST (Guaranteed payout on both forks)'
        });
      }
    } else {
      eventBus.emit('NOTHING_AT_STAKE_VOTED_SINGLE', { branch });
    }

    eventBus.emit('NOTHING_AT_STAKE_UPDATED', this.nothingAtStake);
    return this.nothingAtStake;
  }

  // =========================================
  // SCENARIO B: LONG-RANGE ATTACK ACTIONS
  // =========================================

  resetLongRange() {
    this.longRange.step = 'initial';
    this.longRange.historicalValidators.keyCompromised = false;
    this.longRange.attackerChain.forgedHead = 100;
    this.longRange.attackerChain.isLonger = false;
    this.longRange.attackerChain.status = 'dormant';
    this.longRange.defenseResult = null;
    eventBus.emit('LONG_RANGE_UPDATED', this.longRange);
  }

  toggleWeakSubjectivity(enabled = null) {
    if (enabled !== null) {
      this.longRange.isWeakSubjectivityEnabled = Boolean(enabled);
    } else {
      this.longRange.isWeakSubjectivityEnabled = !this.longRange.isWeakSubjectivityEnabled;
    }
    eventBus.emit('LONG_RANGE_UPDATED', this.longRange);
    return this.longRange.isWeakSubjectivityEnabled;
  }

  acquireHistoricalKeys() {
    this.longRange.step = 'compromised';
    this.longRange.historicalValidators.keyCompromised = true;
    eventBus.emit('LONG_RANGE_KEYS_COMPROMISED', {
      validators: this.longRange.historicalValidators.names,
      historicalStake: this.longRange.historicalValidators.stakeAtBlock100,
      currentStake: this.longRange.historicalValidators.currentStakeAtHead350
    });
    eventBus.emit('LONG_RANGE_UPDATED', this.longRange);
  }

  async launchLongRangeAttack() {
    if (!this.longRange.historicalValidators.keyCompromised) {
      this.acquireHistoricalKeys();
    }

    this.longRange.step = 'forging';
    this.longRange.attackerChain.status = 'racing';

    // Simulate rapid ghost chain generation (costless simulation in PoS)
    this.longRange.attackerChain.forgedHead = this.longRange.attackerChain.targetHead; // 355
    this.longRange.attackerChain.isLonger = this.longRange.attackerChain.forgedHead > this.longRange.canonicalChain.currentHead; // 355 > 350

    if (this.longRange.isWeakSubjectivityEnabled) {
      // Weak Subjectivity Checkpoint Defense Triggers!
      this.longRange.step = 'defended';
      this.longRange.attackerChain.status = 'rejected';

      this.longRange.defenseResult = {
        accepted: false,
        reason: 'FORK_PRIOR_TO_WEAK_SUBJECTIVITY_CHECKPOINT',
        checkpointBlock: this.longRange.canonicalChain.checkpointFinalized, // 200
        forkBlock: this.longRange.attackerChain.forkPoint, // 100
        message: '⛔ REJECTED: Fork branches at Block #100, which is earlier than finalized Checkpoint #200 (Weak Subjectivity horizon). Canonical chain preserved!'
      };

      eventBus.emit('LONG_RANGE_ATTACK_DEFENDED', this.longRange.defenseResult);
      eventBus.emit('SHOW_LONG_RANGE_MODAL', this.longRange.defenseResult);
    } else {
      // Naive Longest-Chain Rule without checkpoints: Naive nodes fall for the fake chain!
      this.longRange.step = 'reorg_attempted';
      this.longRange.attackerChain.status = 'accepted';

      this.longRange.defenseResult = {
        accepted: true,
        reason: 'NAIVE_LONGEST_CHAIN_CONFUSION',
        message: '⚠️ VULNERABLE: Without Weak Subjectivity checkpoints, newly syncing nodes blindly follow the longer 355-block ghost chain!'
      };

      eventBus.emit('LONG_RANGE_ATTACK_VULNERABLE', this.longRange.defenseResult);
    }

    eventBus.emit('LONG_RANGE_UPDATED', this.longRange);
    return this.longRange;
  }
}

export const posAttackSim = new PosAttackSim();
