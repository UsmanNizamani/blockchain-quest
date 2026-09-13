import { eventBus } from '../core/EventBus.js';

/**
 * Proof of Stake Attack Thresholds Simulator Engine
 * Models 34%, 51%, and 66% stake thresholds alongside financial loss & slashing dynamics
 */
export class PosThresholdAttack {
  constructor() {
    this.isActive = false;
    this.attackerStakePercent = 34; // 0 to 100
    this.totalStakedCoins = 32000000; // 32 Million QUEST / ETH staked
    this.baseCoinPrice = 3000; // $3,000 per coin ($96B total staked value)

    this.lastAttackResult = null;
    this.isAttacking = false;
  }

  setActive(active) {
    this.isActive = Boolean(active);
    eventBus.emit('POS_THRESHOLD_STATE_CHANGED', this.getState());
  }

  activate() {
    this.setActive(true);
  }

  deactivate() {
    this.setActive(false);
  }

  setAttackerStakePercent(percent) {
    this.attackerStakePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    this.lastAttackResult = null;
    this.isAttacking = false;
    const state = this.getState();
    eventBus.emit('POS_THRESHOLD_SLIDER_CHANGED', state);
    return state;
  }

  /**
   * Determine active attack capability based on stake percentage
   */
  getThresholdInfo(percent = this.attackerStakePercent) {
    const pct = Number(percent);

    if (pct < 34) {
      return {
        id: 'none',
        thresholdLabel: '< 34% Stake (Benign Network)',
        badgeColor: '#00ff88',
        name: 'Honest Supermajority Secure',
        possibleAttack: 'None (Honest Nodes Hold > 66.7% Supermajority)',
        canHaltFinality: false,
        canReorg: false,
        canFinalizeArbitrary: false,
        slashingRiskPercent: 0,
        slashingSeverity: 'None',
        description: 'Honest validators hold the required 2/3+ supermajority. Casper FFG finalizes checkpoints smoothly every 2 epochs (12.8 minutes). The network is fully secure.',
        mitigation: 'Standard Casper FFG consensus rules prevent any adversarial interference.'
      };
    }

    if (pct >= 34 && pct < 51) {
      return {
        id: 'liveness_34',
        thresholdLabel: '34% Stake Threshold (1/3 + 1)',
        badgeColor: '#f59e0b',
        name: '34% Liveness Attack (Finality Denial)',
        possibleAttack: 'Halt Finality (Liveness Denial Attack)',
        canHaltFinality: true,
        canReorg: false,
        canFinalizeArbitrary: false,
        slashingRiskPercent: 50,
        slashingSeverity: 'High (Inactivity Leak Stake Drain)',
        description: 'Attacker holds > 1/3 (> 33.3%) of all staked capital. By going offline or refusing to vote, they deny the 2/3 supermajority needed to finalize checkpoints. Network finality is HALTED. However, the attacker CANNOT rewrite history, reorg blocks, or double-spend!',
        mitigation: 'Inactivity Leak protocol kicks in after 4 epochs of non-finality. The protocol quadratic-drains the non-participating attacker stake until honest validators regain the 2/3 majority!'
      };
    }

    if (pct >= 51 && pct < 66) {
      return {
        id: 'reorg_51',
        thresholdLabel: '51% Stake Threshold (Majority)',
        badgeColor: '#ff8800',
        name: '51% Reorg & Transaction Censorship Attack',
        possibleAttack: 'Short-Range Reorg & Censorship (Mass Slashing Risk)',
        canHaltFinality: false,
        canReorg: true,
        canFinalizeArbitrary: false,
        slashingRiskPercent: 100,
        slashingSeverity: 'Catastrophic (100% Mass Slashing)',
        description: 'Attacker holds majority (> 50%) of active stake. They can monopolize block proposals, censor specific transactions, and rewrite recent unfinalized slots. But they CANNOT finalize blocks without 66%. If they attempt equivocation (double-signing competing forks), fraud proofs trigger 100% Mass Slashing!',
        mitigation: 'Casper FFG equivocation slashing burns 100% of the attacker stake automatically upon submission of dual-attestation cryptographic proofs.'
      };
    }

    // >= 66%
    return {
      id: 'arbitrary_66',
      thresholdLabel: '66% Stake Threshold (2/3 Supermajority)',
      badgeColor: '#ff3366',
      name: '66% Supermajority Attack (Arbitrary Finalization)',
      possibleAttack: 'Finalize Arbitrary Blocks & Consensus Capture',
      canHaltFinality: false,
      canReorg: true,
      canFinalizeArbitrary: true,
      slashingRiskPercent: 100,
      slashingSeverity: 'Terminal Capital Destruction',
      description: 'Attacker controls >= 2/3 (66.7%) of all staked capital. They command the supermajority necessary to unilaterally finalize arbitrary, conflicting, or fraudulent blocks without needing any honest votes!',
      mitigation: 'Social Consensus Hard Fork: Honest validator community and node operators fork away to a minority chain, identifying the attacker address and resetting their stake to 0, permanently destroying their billions.'
    };
  }

  /**
   * Calculate real-world economic acquisition cost, slippage, and expected financial loss
   */
  getFinancialLoss(percent = this.attackerStakePercent) {
    const pct = Number(percent);
    const coinsRequired = (this.totalStakedCoins * (pct / 100));

    // Slippage multiplier: Attempting to accumulate 34%, 51%, or 66% of all circulating
    // staked coins creates an unprecedented liquidity crunch, driving the asset price up exponentially.
    let slippageMultiplier = 1.0;
    if (pct >= 66) {
      slippageMultiplier = 3.2; // +220% price surge
    } else if (pct >= 51) {
      slippageMultiplier = 2.2; // +120% price surge
    } else if (pct >= 34) {
      slippageMultiplier = 1.5; // +50% price surge
    } else {
      slippageMultiplier = 1.0 + (pct / 34) * 0.5;
    }

    const effectivePrice = this.baseCoinPrice * slippageMultiplier;
    const capitalCostUsd = coinsRequired * effectivePrice;

    // Expected Financial Loss if caught:
    // At 34%: Inactivity leak drains 40% to 100% of stake
    // At 51%: In-protocol Casper FFG burns 100% of stake
    // At 66%: Social consensus hard fork burns 100% of stake
    let lossPercentage = 0;
    if (pct >= 51) {
      lossPercentage = 100;
    } else if (pct >= 34) {
      lossPercentage = 65; // Inactivity leak penalty
    }

    const financialLossUsd = (capitalCostUsd * (lossPercentage / 100));

    return {
      percent: pct,
      coinsRequired: coinsRequired,
      coinsRequiredStr: (coinsRequired / 1000000).toFixed(2) + 'M QUEST',
      baseValUsd: (coinsRequired * this.baseCoinPrice) / 1000000000,
      slippageMultiplier: slippageMultiplier.toFixed(2),
      effectivePriceUsd: effectivePrice.toFixed(0),
      capitalCostUsd: capitalCostUsd,
      capitalCostBillions: (capitalCostUsd / 1000000000).toFixed(2),
      lossPercentage: lossPercentage,
      financialLossUsd: financialLossUsd,
      financialLossBillions: (financialLossUsd / 1000000000).toFixed(2)
    };
  }

  /**
   * Execute simulated attack
   */
  executeAttack() {
    this.isAttacking = true;
    const info = this.getThresholdInfo();
    const econ = this.getFinancialLoss();

    let result = {
      timestamp: Date.now(),
      percent: this.attackerStakePercent,
      info,
      econ,
      status: 'EXECUTED',
      summary: ''
    };

    if (this.attackerStakePercent < 34) {
      result.summary = '🛡️ Attack Ineffective: Attacker stake (' + this.attackerStakePercent + '%) is below the 34% threshold. Honest validators finalized checkpoint without delay.';
    } else if (this.attackerStakePercent < 51) {
      result.summary = '⚠️ Liveness Halted: Attacker withheld 34%+ votes. Casper FFG finality was HALTED. Inactivity leak triggered: attacker losing $' + econ.financialLossBillions + ' Billion over 4 epochs!';
    } else if (this.attackerStakePercent < 66) {
      result.summary = '🚨 Equivocation Slashed: Attacker attempted short-range reorg by double-signing. Fraud proof verified! 100% of attacker stake ($' + econ.financialLossBillions + ' Billion) was PERMANENTLY BURNED!';
    } else {
      result.summary = '💥 Arbitrary Block Neutralized: Attacker finalized conflicting checkpoint with 66% supermajority. Honest community coordinated an emergency social fork, burning $' + econ.financialLossBillions + ' Billion of attacker capital to zero!';
    }

    this.lastAttackResult = result;
    eventBus.emit('POS_THRESHOLD_ATTACK_EXECUTED', result);
    return result;
  }

  reset() {
    this.attackerStakePercent = 34;
    this.lastAttackResult = null;
    this.isAttacking = false;
    eventBus.emit('POS_THRESHOLD_RESET', this.getState());
  }

  getState() {
    return {
      isActive: this.isActive,
      attackerStakePercent: this.attackerStakePercent,
      thresholdInfo: this.getThresholdInfo(),
      economicLoss: this.getFinancialLoss(),
      lastAttackResult: this.lastAttackResult,
      isAttacking: this.isAttacking
    };
  }
}

export const posThresholdAttack = new PosThresholdAttack();
