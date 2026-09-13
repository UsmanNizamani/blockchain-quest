import { eventBus } from '../core/EventBus.js';

/**
 * FinalitySimulator Engine
 * Models the contrast between PoW Probabilistic Finality and PoS Deterministic Checkpoint Finality
 */
export class FinalitySimulator {
  constructor() {
    this.isActive = false;

    // 1. Proof of Work State (Probabilistic)
    this.powState = {
      targetBlock: 100,
      confirmations: 2, // 0 to 10
      attackerShare: 0.30, // 30% hashrate
      honestShare: 0.70,   // 70% hashrate
      forkState: {
        active: false,
        forkLength: 0,
        status: 'idle', // 'idle' | 'forking' | 'orphaned' | 'reorganized'
        message: 'Chain running normally on Nakamoto heaviest proof-of-work rule.'
      }
    };

    // 2. Proof of Stake State (Deterministic Casper FFG)
    this.posState = {
      targetSlot: 100,
      epochsElapsed: 2, // 0: proposed, 1: justified, 2: finalized (~12.8 min)
      totalStakedCoins: 32000000, // 32 Million QUEST / ETH
      slashingFraction: 1 / 3, // 1/3 of all validators (33.3%)
      slashingRequirementUsd: 32.0, // $32.0 Billion
      forkState: {
        active: false,
        status: 'idle', // 'idle' | 'rejected' | 'slashed'
        slashedAmountUsd: 0,
        message: 'Casper FFG supermajority attestation active. Checkpoint finalized.'
      }
    };
  }

  setActive(active) {
    this.isActive = Boolean(active);
    eventBus.emit('FINALITY_STATE_CHANGED', this.getState());
  }

  // ==========================================
  // PROOF OF WORK METHODS
  // ==========================================

  setConfirmations(k) {
    this.powState.confirmations = Math.max(0, Math.min(10, Number(k) || 0));
    this.powState.forkState.active = false;
    this.powState.forkState.status = 'idle';
    this.powState.forkState.message = 'Confirmations updated to ' + this.powState.confirmations + '.';
    const state = this.getState();
    eventBus.emit('FINALITY_POW_UPDATED', state);
    return state;
  }

  getPowReorgProbability(k = this.powState.confirmations) {
    if (k === 0) return 100.0;
    const ratio = this.powState.attackerShare / this.powState.honestShare; // 0.30 / 0.70 = 0.42857
    const prob = Math.min(100, 100 * Math.pow(ratio, k));
    return Number(prob.toFixed(k >= 6 ? 4 : 2));
  }

  animatePoWFork() {
    this.powState.forkState.active = true;
    const honestDepth = this.powState.confirmations;
    const attackerForkDepth = 3; // Attacker secretly mined 3 blocks
    this.powState.forkState.forkLength = attackerForkDepth;

    if (honestDepth >= attackerForkDepth) {
      // Honest chain is longer or equal -> Honest chain wins!
      this.powState.forkState.status = 'orphaned';
      this.powState.forkState.message = '🛡️ Longest-Chain Rule: Honest chain (' + honestDepth + ' confs) surpassed the secret fork (' + attackerForkDepth + ' blocks). The attacker fork was PRUNED and ORPHANED!';
    } else {
      // Attacker chain is longer -> Reorganization!
      this.powState.forkState.status = 'reorganized';
      this.powState.forkState.message = '🚨 Chain Reorganization! Attacker secretly mined ' + attackerForkDepth + ' blocks while honest chain only had ' + honestDepth + ' confs. Honest blocks were ORPHANED!';
    }

    const state = this.getState();
    eventBus.emit('FINALITY_POW_FORK_ANIMATED', state);
    return state;
  }

  // ==========================================
  // PROOF OF STAKE METHODS
  // ==========================================

  setEpochsElapsed(e) {
    this.posState.epochsElapsed = Math.max(0, Math.min(4, Number(e) || 0));
    this.posState.forkState.active = false;
    this.posState.forkState.status = 'idle';
    this.posState.forkState.message = 'Epoch progression set to ' + this.posState.epochsElapsed + ' epochs.';
    const state = this.getState();
    eventBus.emit('FINALITY_POS_UPDATED', state);
    return state;
  }

  advancePoSEpoch() {
    this.posState.epochsElapsed = (this.posState.epochsElapsed + 1) % 3;
    this.posState.forkState.active = false;
    this.posState.forkState.status = 'idle';
    const state = this.getState();
    eventBus.emit('FINALITY_POS_UPDATED', state);
    return state;
  }

  getPosStatus() {
    if (this.posState.epochsElapsed === 0) {
      return {
        stage: 'PROPOSED',
        label: 'Epoch 0: Slot Proposed (Unfinalized)',
        badgeColor: '#94a3b8',
        isFinalized: false,
        timeElapsed: '0.0 sec',
        desc: 'Block proposed in current slot. Awaiting committee attestations.'
      };
    }
    if (this.posState.epochsElapsed === 1) {
      return {
        stage: 'JUSTIFIED',
        label: 'Epoch 1: Justified Checkpoint (>66.7% Votes)',
        badgeColor: '#f59e0b',
        isFinalized: false,
        timeElapsed: '~6.4 min',
        desc: 'Achieved 2/3+ supermajority attestation votes from validator committee. 1 more epoch required for irreversible finality.'
      };
    }
    return {
      stage: 'FINALIZED',
      label: 'Epoch 2: Finalized Checkpoint 🔒 (Irreversible)',
      badgeColor: '#00ff88',
      isFinalized: true,
      timeElapsed: '~12.8 min (2 Epochs)',
      desc: 'Checkpoint child justified! Block is mathematically FINALIZED and CANNOT be reverted without slashing 1/3 of all validators ($32.0B)!'
    };
  }

  animatePoSFork() {
    this.posState.forkState.active = true;

    if (this.posState.epochsElapsed >= 2) {
      // Deterministically Finalized -> Reverting is mathematically impossible without slashing 1/3
      this.posState.forkState.status = 'slashed';
      this.posState.forkState.slashedAmountUsd = this.posState.slashingRequirementUsd;
      this.posState.forkState.message = '🛡️ Deterministic Defense: Malicious cartel attempted to revert Finalized Checkpoint #100. Casper FFG detected conflicting source-target attestations (Equivocation). Conflicting branch REJECTED and >= 1/3 of all validator stake ($' + this.posState.slashingRequirementUsd + ' Billion) was PERMANENTLY BURNED!';
    } else {
      // Unfinalized -> Fork choice resolved via LMD-GHOST
      this.posState.forkState.status = 'rejected';
      this.posState.forkState.slashedAmountUsd = 0;
      this.posState.forkState.message = '⚠️ Unfinalized Fork: Block #100 is not finalized yet (' + this.posState.epochsElapsed + ' epochs). LMD-GHOST fork choice selected the branch with highest committee weight.';
    }

    const state = this.getState();
    eventBus.emit('FINALITY_POS_FORK_ANIMATED', state);
    return state;
  }

  reset() {
    this.powState.confirmations = 2;
    this.powState.forkState = {
      active: false,
      forkLength: 0,
      status: 'idle',
      message: 'Chain running normally on Nakamoto heaviest proof-of-work rule.'
    };

    this.posState.epochsElapsed = 2;
    this.posState.forkState = {
      active: false,
      status: 'idle',
      slashedAmountUsd: 0,
      message: 'Casper FFG supermajority attestation active. Checkpoint finalized.'
    };

    const state = this.getState();
    eventBus.emit('FINALITY_RESET', state);
    return state;
  }

  getState() {
    return {
      isActive: this.isActive,
      pow: {
        ...this.powState,
        reorgProbability: this.getPowReorgProbability()
      },
      pos: {
        ...this.posState,
        statusInfo: this.getPosStatus()
      }
    };
  }
}

export const finalitySimulator = new FinalitySimulator();
