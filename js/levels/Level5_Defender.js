import { doubleSpendSim } from '../blockchain/DoubleSpendSim.js';
import { fiftyOneAttack } from '../blockchain/FiftyOneAttack.js';
import { posAttackSim } from '../blockchain/PosAttacks.js';
import { posThresholdAttack } from '../blockchain/PosThresholdAttack.js';
import { forkSimulator, FORK_SIM_EVENTS } from '../blockchain/ForkSimulator.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level5_Defender = {
  id: 5,
  title: "Level 5: Defender",
  role: "Network Security Defender",
  kpReward: 250,
  subtitle: "51% Attack, Double-Spend, Nothing-at-Stake & Long-Range Defense",
  codexUnlockIds: ["attack_51", "double_spending"],

  theory: {
    heroTitle: "Level 5: Adversarial Attacks & Cryptographic Defense",
    sections: [
      {
        title: "The Double-Spend Problem & Nonce Ordering",
        content: "Before blockchain, digital money was vulnerable to copying. If an attacker has 10 coins, they might try to broadcast two simultaneous transactions: 10 coins to a merchant, and the same 10 coins back to their own wallet."
      },
      {
        title: "Sequential Nonce Collision Defense",
        highlight: "The nonce prevents double-spending. Each transaction from an address must have a unique, sequential number.\n\nWhen Tx1 is broadcast with Nonce #0, nodes register Nonce #0 as pending in the mempool. If the sender broadcasts Tx2 also claiming Nonce #0, nodes catch the collision and reject it with 'NONCE ALREADY USED'!"
      },
      {
        title: "The 51% Majority Attack & Economic Cost",
        highlight: "51% attacks are possible but economically irrational. The attacker would need to spend more on mining than they could steal, and it would destroy the currency's value.\n\nAn attacker commanding >50% hashrate can out-mine the honest chain and cause a reorganization. But spending billions on ASICs and electricity to steal funds crashes the coin's market value to zero, destroying their own wealth!"
      },
      {
        title: "Proof of Stake: Nothing-at-Stake & Slashing",
        highlight: "In naive PoS, validators could vote on every fork with no cost. Slashing fixes this — signing two forks = losing stake.\n\nIn PoW, miners are physically bounded by thermodynamics: mining both forks cuts hashrate in half. In PoS, casting a signature costs $0.00. Without slashing, rational actors sign all forks. Equivocation slashing guarantees that voting on multiple forks incinerates 100% of the validator's capital!"
      },
      {
        title: "Proof of Stake: Long-Range Attacks & Weak Subjectivity",
        highlight: "Long-range attacks rewrite deep history. PoS defends with finality checkpoints and social consensus on the correct chain.\n\nBecause PoS block generation consumes zero energy, an attacker who acquires old, expired private keys from validators who withdrew their stake years ago can forge thousands of blocks in seconds. PoS overcomes this via Weak Subjectivity: nodes refuse to reorganize past finalized checkpoints within the unbonding window!"
      }
    ],
    concepts: [
      { name: "51% Attack", desc: "Controlling majority hashrate to outpace honest chain" },
      { name: "Chain Reorganization", desc: "Replacing an honest chain with a longer competing chain" },
      { name: "Double-Spending", desc: "Attempting to spend the identical digital token twice" },
      { name: "Nothing-at-Stake", desc: "Naive PoS dilemma where signing competing forks has zero marginal cost" },
      { name: "Equivocation Slashing", desc: "Confiscating 100% stake when dual signatures are discovered at the same height" },
      { name: "Long-Range Attack", desc: "Rewriting history from old checkpoints using expired unbonded validator keys" },
      { name: "Weak Subjectivity", desc: "Social consensus rule rejecting reorgs prior to finalized checkpoints within the unbonding horizon" }
    ]
  },

  objectives: [
    {
      id: "lvl5_obj1",
      title: "1. Defend Against Double-Spending",
      desc: "Attempt to spend the same 10 coins twice with duplicate Nonce #0 and witness the network reject it with 'NONCE ALREADY USED'.",
      xp: 60,
      completed: false,
      check: (state) => state.hasWitnessedDoubleSpend === true
    },
    {
      id: "lvl5_obj2",
      title: "2. Simulate a 51% Majority Attack",
      desc: "Launch the 60% attacker hashrate chain and watch it surpass the honest chain to cause a reorganization.",
      xp: 60,
      completed: false,
      check: (state) => state.hasWitnessed51Attack === true
    },
    {
      id: "lvl5_obj3",
      title: "3. Defeat Nothing-at-Stake via Slashing",
      desc: "Enable Slashing Defense and vote on both forks to watch the protocol confiscate 100% of the cheater's stake.",
      xp: 65,
      completed: false,
      check: (state) => state.hasWitnessedNothingAtStake === true
    },
    {
      id: "lvl5_obj4",
      title: "4. Neutralize Long-Range Attack via Checkpoints",
      desc: "Forge a deep ghost chain with expired keys and observe Weak Subjectivity checkpoints reject the historical fork.",
      xp: 65,
      completed: false,
      check: (state) => state.hasWitnessedLongRange === true
    }
  ],

  initLab(container, onStateChange = () => {}) {
    const doubleSim = doubleSpendSim;
    const attackSim = fiftyOneAttack;
    const posAtk = posAttackSim;
    let activeSubTab = 'doublespend'; // 'doublespend' | 'attack51' | 'nothing_at_stake' | 'long_range' | 'forks'
    let attackConsensusMode = 'pow'; // 'pow' | 'pos'

    // Remove any listeners from a previous entry
    if (typeof window !== 'undefined' && Array.isArray(window._level5_unsubs)) {
      window._level5_unsubs.forEach(unsub => {
        try { unsub && unsub(); } catch (e) { /* ignore */ }
      });
    }
    if (typeof window !== 'undefined') {
      window._level5_unsubs = [];
    }
    const _unsubs = (typeof window !== 'undefined') ? window._level5_unsubs : [];

    const missionState = {
      hasWitnessedDoubleSpend: false,
      hasWitnessed51Attack: false,
      hasWitnessedNothingAtStake: false,
      hasWitnessedLongRange: false
    };

    function notifyState() {
      if (typeof onStateChange === 'function') {
        onStateChange({ ...missionState });
      }
    }

    _unsubs.push(eventBus.on('DOUBLE_SPEND_REJECTED', () => {
      missionState.hasWitnessedDoubleSpend = true;
      notifyState();
      renderLabUI();
      eventBus.emit('SHOW_DOUBLE_SPEND_MODAL');
    }));

    _unsubs.push(eventBus.on('ATTACK_51_REORG', () => {
      missionState.hasWitnessed51Attack = true;
      notifyState();
      renderLabUI();
      eventBus.emit('SHOW_51_ATTACK_MODAL');
    }));

    _unsubs.push(eventBus.on('ATTACK_51_PROGRESS', ({ honestHeight, attackerHeight }) => {
      console.log('[level5:attack51] progress', honestHeight, attackerHeight);
      if (activeSubTab === 'attack51') renderLabUI();
    }));

    _unsubs.push(eventBus.on('ATTACK_51_BLOCK_MINED', () => {
      if (activeSubTab === 'attack51') renderLabUI();
    }));

    _unsubs.push(eventBus.on('NOTHING_AT_STAKE_SLASHED', () => {
      missionState.hasWitnessedNothingAtStake = true;
      notifyState();
      renderLabUI();
    }));

    _unsubs.push(eventBus.on('LONG_RANGE_ATTACK_DEFENDED', () => {
      missionState.hasWitnessedLongRange = true;
      notifyState();
      renderLabUI();
    }));

    _unsubs.push(eventBus.on(FORK_SIM_EVENTS.FORK_TRIGGERED, () => {
      if (activeSubTab === 'forks') renderLabUI();
    }));
    _unsubs.push(eventBus.on(FORK_SIM_EVENTS.BLOCK_ADDED, () => {
      if (activeSubTab === 'forks') renderLabUI();
    }));
    _unsubs.push(eventBus.on(FORK_SIM_EVENTS.RESET, () => {
      if (activeSubTab === 'forks') renderLabUI();
    }));

    _unsubs.push(eventBus.on('POS_THRESHOLD_SLIDER_CHANGED', () => {
      if (activeSubTab === 'attack51') renderLabUI();
    }));
    _unsubs.push(eventBus.on('POS_THRESHOLD_ATTACK_EXECUTED', () => {
      if (activeSubTab === 'attack51') renderLabUI();
    }));
    _unsubs.push(eventBus.on('POS_THRESHOLD_RESET', () => {
      if (activeSubTab === 'attack51') renderLabUI();
    }));

    function switchSubTab(nextTab) {
      const wasActive = activeSubTab;
      console.log('[level5:switchSubTab]', wasActive, '→', nextTab);

      // Deactivate previous subtab's engine (defensively)
      try {
        if (wasActive === 'doublespend' && typeof doubleSim.deactivate === 'function') {
          doubleSim.deactivate();
        }
        if (wasActive === 'attack51') {
          if (typeof attackSim.deactivate === 'function') attackSim.deactivate();
          if (typeof posThresholdAttack.deactivate === 'function') posThresholdAttack.deactivate();
        }
        if (wasActive === 'nothing_at_stake' && typeof posAtk.deactivate === 'function') {
          posAtk.deactivate();
        }
        if (wasActive === 'long_range' && typeof posAtk.deactivate === 'function') {
          posAtk.deactivate();
        }
        if (wasActive === 'forks' && typeof forkSimulator.deactivate === 'function') {
          forkSimulator.deactivate();
        }
      } catch (err) {
        console.error('[level5:switchSubTab] deactivate error:', err);
      }

      // Activate the new subtab's engine
      activeSubTab = nextTab;
      try {
        if (nextTab === 'doublespend' && typeof doubleSim.activate === 'function') {
          doubleSim.activate();
        }
        if (nextTab === 'attack51') {
          if (attackConsensusMode === 'pow' && typeof attackSim.activate === 'function') {
            attackSim.activate();
          } else if (attackConsensusMode === 'pos' && typeof posThresholdAttack.activate === 'function') {
            posThresholdAttack.activate();
          }
        }
        if (nextTab === 'nothing_at_stake' && typeof posAtk.activate === 'function') {
          posAtk.activate('nothing_at_stake');
        }
        if (nextTab === 'long_range' && typeof posAtk.activate === 'function') {
          posAtk.activate('long_range');
        }
        if (nextTab === 'forks' && typeof forkSimulator.activate === 'function') {
          forkSimulator.activate();
        }
      } catch (err) {
        console.error('[level5:switchSubTab] activate error:', err);
      }

      renderLabUI();
    }

    if (typeof window !== 'undefined') {
      window.switchSubTab = switchSubTab;
      window.setAttackMode = (mode) => {
        attackConsensusMode = mode;
        if (mode === 'pow') {
          if (typeof posThresholdAttack.deactivate === 'function') posThresholdAttack.deactivate();
          if (typeof attackSim.activate === 'function') attackSim.activate();
        } else {
          if (typeof attackSim.deactivate === 'function') attackSim.deactivate();
          if (typeof posThresholdAttack.activate === 'function') posThresholdAttack.activate();
        }
        renderLabUI();
      };
    }

    function renderLabUI() {
      container.innerHTML = `
        <!-- Attack Mode Switcher Tabs (5 Scenarios) -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 6px;">
          <button id="tab-sub-doublespend" class="hud-btn ${activeSubTab === 'doublespend' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${activeSubTab === 'doublespend' ? 'var(--accent-red)' : 'var(--border-subtle)'};">
            🛡️ Double-Spend
          </button>
          <button id="tab-sub-51" class="hud-btn ${activeSubTab === 'attack51' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${activeSubTab === 'attack51' ? 'var(--accent-amber)' : 'var(--border-subtle)'};">
            ⚡ 51% Attack
          </button>
          <button id="tab-sub-nas" class="hud-btn ${activeSubTab === 'nothing_at_stake' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${activeSubTab === 'nothing_at_stake' ? 'var(--accent-cyan)' : 'var(--border-subtle)'};">
            🌱 Nothing-at-Stake
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
          <button id="tab-sub-longrange" class="hud-btn ${activeSubTab === 'long_range' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${activeSubTab === 'long_range' ? 'var(--accent-purple)' : 'var(--border-subtle)'};">
            ⏳ Long-Range Attack (PoS)
          </button>
          <button id="tab-sub-forks" class="hud-btn ${activeSubTab === 'forks' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${activeSubTab === 'forks' ? '#f59e0b' : 'var(--border-subtle)'}; ${activeSubTab === 'forks' ? 'background: rgba(245,158,11,0.15); color:#f59e0b;' : ''}">
            🍴 Soft / Hard Forks
          </button>
        </div>

        ${activeSubTab === 'doublespend' ? renderDoubleSpendUI() : ''}
        ${activeSubTab === 'attack51' ? renderFiftyOneAttackUI() : ''}
        ${activeSubTab === 'nothing_at_stake' ? renderNothingAtStakeUI() : ''}
        ${activeSubTab === 'long_range' ? renderLongRangeUI() : ''}
        ${activeSubTab === 'forks' ? renderForkSimulatorUI() : ''}
      `;

      attachLabListeners();
    }

    function renderDoubleSpendUI() {
      return `
        <div class="theory-card" style="background: linear-gradient(145deg, #241119, #130a0e); border-color: var(--accent-red); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 51, 102, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: var(--accent-red); font-size: 11px;">⚔️ DOUBLE-SPEND ATTACK SCENARIO</strong>
            <button class="btn-explain" data-explain="ch6_double_spend" title="Explain Double-Spend">ℹ️ Explain</button>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Scenario Wallet Balance:</span>
            <span style="color: #fff; font-family: var(--font-mono); font-weight: bold;">${doubleSim.balance.toFixed(2)} QUEST</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Current Nonce:</span>
            <span style="color: var(--accent-amber); font-family: var(--font-mono); font-weight: bold;">#${doubleSim.currentNonce}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="color: #94a3b8;">Attack Progress:</span>
            <span style="color: ${doubleSim.step === 'rejected' ? 'var(--accent-red)' : (doubleSim.step === 'mempool' ? 'var(--accent-amber)' : 'var(--accent-green)')}; font-weight: bold; text-transform: uppercase;">
              ${doubleSim.step === 'ready' ? 'Ready' : (doubleSim.step === 'mempool' ? 'Tx1 Pending in Mempool' : 'Tx2 Collided & Rejected')}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btn-ds-tx1" class="action-btn" style="background: rgba(0, 255, 136, 0.15); border: 1px solid var(--accent-green); color: var(--accent-green);" ${doubleSim.step !== 'ready' ? 'disabled' : ''}>
            <span class="btn-text">1. Send 10 QUEST to Merchant A (Bob)</span>
            <span class="btn-subtext">Broadcasts Tx1 with Nonce #0 into Mempool</span>
          </button>

          <button id="btn-ds-tx2" class="action-btn" style="background: rgba(255, 51, 102, 0.2); border: 1px solid var(--accent-red); color: #fff;" ${doubleSim.step !== 'mempool' ? 'disabled' : ''}>
            <span class="btn-text">2. Attempt Double-Spend to Merchant B (Alice)</span>
            <span class="btn-subtext">Reuses Nonce #0 for same 10 coins ➔ Watch Collision</span>
          </button>

          <button id="btn-ds-reset" class="action-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-medium); color: var(--text-secondary); margin-top: 4px;">
            <span class="btn-text">🔄 Reset Double-Spend Scenario</span>
          </button>
        </div>
      `;
    }

    function renderFiftyOneAttackUI() {
      const isPow = attackConsensusMode === 'pow';
      const isPos = attackConsensusMode === 'pos';

      if (isPos) {
        posThresholdAttack.setActive(true);
        attackSim.deactivate();
      } else {
        posThresholdAttack.setActive(false);
        attackSim.activate();
      }

      const sim = posThresholdAttack;
      const info = sim.getThresholdInfo();
      const econ = sim.getFinancialLoss();

      return `
        <!-- CONSENSUS ATTACK MODE SELECTOR -->
        <div style="display: flex; gap: 6px; margin-bottom: 12px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-attack-mode-pow" class="hud-btn ${isPow ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${isPow ? 'var(--accent-amber)' : 'transparent'};">
            ⛏️ PoW 51% Hashrate Attack
          </button>
          <button id="btn-attack-mode-pos" class="hud-btn ${isPos ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 10px; padding: 6px 4px; border-color: ${isPos ? 'var(--accent-cyan)' : 'transparent'};">
            🌱 PoS Stake Thresholds (34% / 51% / 66%)
          </button>
        </div>

        ${isPow ? renderPowSection() : renderPosThresholdSection(sim, info, econ)}
      `;
    }

    function renderPowSection() {
      return `
        <div class="theory-card" style="background: linear-gradient(145deg, #1f1406, #110b03); border-color: var(--accent-amber); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 183, 3, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: var(--accent-amber); font-size: 11px;">⛏️ PROOF OF WORK 51% HASHRATE REORGANIZATION</strong>
            <button class="btn-explain" data-explain="ch4_51_attack" title="Explain 51% Attack">ℹ️ Explain</button>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: var(--accent-green);">Honest Chain (40% Hashrate):</span>
            <span style="font-family: var(--font-mono); font-weight: bold;">#${attackSim.honestChain.length} Blocks</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: var(--accent-red);">Attacker Chain (60% Hashrate):</span>
            <span style="font-family: var(--font-mono); font-weight: bold;">#${attackSim.attackerChain.length} Blocks</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Required Resource:</span>
            <span style="color: #f59e0b; font-family: var(--font-mono); font-weight: bold;">>50% Physical Hashrate</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Cost to Attack:</span>
            <span style="color: #ef4444; font-family: var(--font-mono); font-weight: bold;">Hardware (ASICs) + Electricity OpEx</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="color: #94a3b8;">Result:</span>
            <span style="color: #fff; font-weight: bold;">Longest-Chain Reorganization Possible</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btn-start-51-attack" class="action-btn" style="background: rgba(255, 51, 102, 0.2); border: 1px solid var(--accent-red); color: #fff; font-weight: bold;" ${attackSim.isActive && attackSim.isRunning ? 'disabled' : ''}>
            <span class="btn-text">⚔️ Launch 51% Reorganization Attack</span>
            <span class="btn-subtext">Attacker with 60% hashrate secretly mines competing chain</span>
          </button>

          <button id="btn-reset-51-attack" class="action-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-medium); color: var(--text-secondary);">
            <span class="btn-text">🔄 Reset 51% Attack Simulation</span>
          </button>
        </div>
      `;
    }

    function renderPosThresholdSection(sim, info, econ) {
      return `
        <!-- PoS HEADER & MODAL TRIGGER -->
        <div class="theory-card" style="background: linear-gradient(145deg, #0d1e2e, #060e17); border-color: var(--accent-cyan); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.25); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">🌱 PROOF OF STAKE ATTACK THRESHOLD MATRIX</strong>
              <button class="btn-explain" data-explain="pos_thresholds" title="Explain Thresholds">ℹ️ Explain</button>
            </div>
            <button id="btn-open-pos-threshold-modal" class="hud-btn" style="font-size: 9.5px; padding: 3px 8px; background: rgba(0, 240, 255, 0.15); border-color: var(--accent-cyan); color: var(--accent-cyan);">
              📜 Invariant & Game Theory
            </button>
          </div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.4;">
            Drag the slider to adjust the attacker's share of total staked coins ($32.0M QUEST / $96B total). Observe which attack vectors unlock at <strong>34%</strong>, <strong>51%</strong>, and <strong>66%</strong>, and examine the economic suicide of in-protocol slashing!
          </p>

          <!-- 1. ATTACKER STAKE % SLIDER -->
          <div style="background: rgba(0,0,0,0.35); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10.5px; color: #94a3b8; font-weight: bold;">ATTACKER STAKE %:</span>
              <span class="badge-label" style="background: ${info.badgeColor}25; color: ${info.badgeColor}; border: 1px solid ${info.badgeColor}; font-size: 10.5px; font-family: var(--font-mono); font-weight: bold;">
                ${sim.attackerStakePercent}% STAKE
              </span>
            </div>

            <input type="range" id="input-attacker-stake-slider" min="0" max="100" value="${sim.attackerStakePercent}" step="1" style="width: 100%; margin: 6px 0; accent-color: ${info.badgeColor}; cursor: pointer;" />

            <!-- PRESET SHORTCUT BUTTONS -->
            <div style="display: flex; gap: 4px; margin-top: 4px;">
              <button id="btn-stake-preset-0" class="hud-btn ${sim.attackerStakePercent === 0 ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 8.5px; padding: 4px 2px;">
                0% Honest
              </button>
              <button id="btn-stake-preset-34" class="hud-btn ${sim.attackerStakePercent === 34 ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 8.5px; padding: 4px 2px; border-color: #f59e0b; color: #f59e0b;">
                ⚠️ 34% Halt
              </button>
              <button id="btn-stake-preset-51" class="hud-btn ${sim.attackerStakePercent === 51 ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 8.5px; padding: 4px 2px; border-color: #ff8800; color: #ff8800;">
                🚨 51% Reorg
              </button>
              <button id="btn-stake-preset-66" class="hud-btn ${sim.attackerStakePercent === 66 ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 8.5px; padding: 4px 2px; border-color: #ff3366; color: #ff3366;">
                💥 66% Finality
              </button>
            </div>
          </div>

          <!-- 2. ACTIVE THRESHOLD CAPABILITY CARD -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px 10px; border-radius: 6px; border: 1px solid ${info.badgeColor}44; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: bold;">ATTACK POSSIBLE AT THIS THRESHOLD:</span>
              <span style="font-size: 9px; font-weight: bold; color: ${info.badgeColor};">${info.thresholdLabel}</span>
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #fff; margin-bottom: 6px;">
              ${info.possibleAttack}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9.5px; margin-bottom: 6px; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 4px;">
              <div>
                <span style="color: #94a3b8;">Halt Finality:</span>
                <strong style="color: ${info.canHaltFinality ? '#f59e0b' : '#94a3b8'};">${info.canHaltFinality ? '⚠️ YES' : '○ NO'}</strong>
              </div>
              <div>
                <span style="color: #94a3b8;">Chain Reorg:</span>
                <strong style="color: ${info.canReorg ? '#ff8800' : '#94a3b8'};">${info.canReorg ? '🚨 YES' : '○ NO'}</strong>
              </div>
              <div>
                <span style="color: #94a3b8;">Arbitrary Finality:</span>
                <strong style="color: ${info.canFinalizeArbitrary ? '#ff3366' : '#94a3b8'};">${info.canFinalizeArbitrary ? '💥 YES' : '○ NO'}</strong>
              </div>
              <div>
                <span style="color: #94a3b8;">Slashing Risk:</span>
                <strong style="color: ${info.slashingRiskPercent === 100 ? '#ff3366' : (info.slashingRiskPercent > 0 ? '#f59e0b' : '#10b981')}">${info.slashingSeverity}</strong>
              </div>
            </div>

            <p style="font-size: 9px; color: #cbd5e1; margin: 0; line-height: 1.35;">
              ${info.description}
            </p>
          </div>

          <!-- 3. ECONOMIC COST & CATASTROPHIC LOSS CALCULATOR -->
          <div style="background: rgba(255, 51, 102, 0.08); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255, 51, 102, 0.25); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; color: #ff3366; font-weight: bold;">💰 ATTACKER CAPITAL & ECONOMIC LOSS IF CAUGHT:</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Coins to Purchase:</span>
                <strong style="font-family: var(--font-mono); color: #fff;">${econ.coinsRequiredStr}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Supply Squeeze Impact:</span>
                <strong style="font-family: var(--font-mono); color: #f59e0b;">+${((econ.slippageMultiplier - 1) * 100).toFixed(0)}% Price Spike ($${Number(econ.effectivePriceUsd).toLocaleString()}/coin)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Total Acquisition CapEx:</span>
                <strong style="font-family: var(--font-mono); color: #fff;">${econ.capitalCostBillions} Billion</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 4px; margin-top: 2px;">
                <span style="color: #ff3366; font-weight: bold;">Expected Financial Loss if Slashed:</span>
                <strong style="font-family: var(--font-mono); color: ${econ.lossPercentage > 0 ? '#ff3366' : '#10b981'}; font-size: 11px;">
                  -${econ.financialLossBillions} Billion (${econ.lossPercentage}% Burned)
                </strong>
              </div>
            </div>
          </div>

          <!-- 4. ATTACK EXECUTION RESULT BANNER (if executed) -->
          ${sim.lastAttackResult ? `
            <div style="background: rgba(255, 51, 102, 0.2); border: 1px solid #ff3366; padding: 8px 10px; border-radius: 6px; font-size: 10px; color: #fff; margin-bottom: 10px; line-height: 1.4;">
              <strong>${sim.lastAttackResult.summary.split(':')[0]}:</strong><br>
              ${sim.lastAttackResult.summary.split(':')[1] || ''}
            </div>
          ` : ''}

          <!-- 5. ACTION BUTTONS -->
          <div style="display: flex; gap: 6px;">
            <button id="btn-execute-pos-threshold-attack" class="action-btn" style="flex: 2; justify-content: center; background: rgba(255, 51, 102, 0.25); border: 1px solid var(--accent-red); color: #fff; font-weight: bold; font-size: 10.5px; padding: 6px 10px;">
              ⚔️ Launch PoS Threshold Attack
            </button>
            <button id="btn-reset-pos-threshold-attack" class="action-btn" style="flex: 1; justify-content: center; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-medium); color: var(--text-secondary); font-size: 10.5px; padding: 6px 8px;">
              🔄 Reset
            </button>
          </div>

          <!-- Educational Axiom Quote Banner -->
          <div style="margin-top: 10px; background: rgba(0, 240, 255, 0.08); border-left: 3px solid var(--accent-cyan); padding: 8px 12px; font-size: 10px; color: #cbd5e1; line-height: 1.45;">
            <strong style="color: #fff;">Consensus Axiom:</strong> "In PoS, attacking means buying most of the supply — which drives the price up — and then losing it to slashing. Economically suicidal."
          </div>
        </div>
      `;
    }

    function renderNothingAtStakeUI() {
      const nas = posAtk.nothingAtStake;
      const isSlashed = nas.validator.status === 'slashed';

      return `
        <div class="theory-card" style="background: linear-gradient(145deg, #091a24, #040c12); border-color: var(--accent-cyan); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: var(--accent-cyan); font-size: 11px;">🌱 NOTHING-AT-STAKE SIMULATOR</strong>
            <button id="btn-nas-modal-trigger" class="btn-explain" title="View Educational Popup">📜 Invariant</button>
          </div>

          <!-- Validator Status Row -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 10.5px; font-family: var(--font-mono);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #94a3b8;">Target Validator:</span>
              <strong style="color: #fff;">${nas.validator.avatar} ${nas.validator.name}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #94a3b8;">Stake Collateral:</span>
              <strong style="color: ${isSlashed ? '#ff3366' : '#ffb703'};">${nas.validator.stake.toFixed(1)} QUEST</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Slashing Rule:</span>
              <strong style="color: ${nas.isSlashingEnabled ? 'var(--accent-green)' : '#ff3366'};">
                ${nas.isSlashingEnabled ? '✓ ACTIVE (Equivocation Burn: 100%)' : '○ DISABLED (Naive Costless PoS)'}
              </strong>
            </div>
          </div>

          <!-- PoW vs PoS Invariant Pill -->
          <div style="background: rgba(255, 183, 3, 0.08); border-left: 3px solid var(--accent-amber); padding: 6px 8px; border-radius: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
            <strong style="color: var(--accent-amber);">PoW vs PoS Core Difference:</strong><br>
            PoW miners must split 100 TH/s hashrate (50% on A, 50% on B). Naive PoS validators sign both at zero cost. Slashing forces validators to choose one fork!
          </div>

          <!-- Slashing Toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
            <span style="font-size: 10px; color: #94a3b8;">Slashing Defense:</span>
            <button id="btn-toggle-nas-slashing" class="hud-btn ${nas.isSlashingEnabled ? 'primary' : ''}" style="font-size: 9px; padding: 4px 8px;">
              ${nas.isSlashingEnabled ? '🛡️ Slashing: ENABLED' : '⚠️ Slashing: DISABLED'}
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="btn-nas-vote-both" class="action-btn primary-action" style="background: ${isSlashed ? '#334155' : 'var(--accent-amber)'}; color: #000; font-weight: bold; justify-content: space-between; padding: 7px 10px;" ${isSlashed ? 'disabled' : ''}>
            <span>⚔️ Vote on BOTH Forks (Naive Strategy)</span>
            <span class="badge-label" style="background: rgba(0,0,0,0.3); color: #000; font-size: 8px;">COST: $0.00</span>
          </button>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button id="btn-nas-vote-a" class="action-btn" style="background: rgba(0, 240, 255, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-size: 10px; padding: 6px;" ${isSlashed ? 'disabled' : ''}>
              <span>Vote Branch A Only</span>
            </button>
            <button id="btn-nas-vote-b" class="action-btn" style="background: rgba(255, 183, 3, 0.15); border: 1px solid var(--accent-amber); color: var(--accent-amber); font-size: 10px; padding: 6px;" ${isSlashed ? 'disabled' : ''}>
              <span>Vote Branch B Only</span>
            </button>
          </div>

          <button id="btn-nas-reset" class="action-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-medium); color: var(--text-secondary); margin-top: 4px; padding: 6px;">
            <span>🔄 Reset Fork Scenario</span>
          </button>
        </div>
      `;
    }

    function renderLongRangeUI() {
      const lr = posAtk.longRange;
      const isDefended = lr.step === 'defended';
      const isCompromised = lr.historicalValidators.keyCompromised;

      return `
        <div class="theory-card" style="background: linear-gradient(145deg, #1c0e24, #0d0612); border-color: var(--accent-purple); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(157, 78, 221, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: var(--accent-purple); font-size: 11px;">⏳ LONG-RANGE ATTACK SIMULATOR</strong>
            <button id="btn-lr-modal-trigger" class="btn-explain" title="View Educational Popup">📜 Invariant</button>
          </div>

          <!-- Timeline State Card -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 10px; font-family: var(--font-mono);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: var(--accent-green);">Canonical Chain Head:</span>
              <strong>Block #${lr.canonicalChain.currentHead}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: var(--accent-cyan);">Weak Subjectivity Checkpoint:</span>
              <strong>Block #${lr.canonicalChain.checkpointFinalized} 🔒</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: var(--accent-red);">Attacker Ghost Fork Head:</span>
              <strong style="color: ${isCompromised ? 'var(--accent-red)' : '#64748b'};">
                ${isCompromised ? `Block #${lr.attackerChain.forgedHead} (${lr.attackerChain.forgedHead > lr.canonicalChain.currentHead ? 'LONGER' : 'EQUAL'})` : 'Dormant (Block #100)'}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px; margin-top: 4px;">
              <span style="color: #94a3b8;">Old Keys (Alice & Bob):</span>
              <strong style="color: ${isCompromised ? '#ff3366' : '#00ff88'};">
                ${isCompromised ? 'COMPROMISED (Purchased for $0)' : 'SECURE (Stake withdrawn at #200)'}
              </strong>
            </div>
          </div>

          <!-- Defense Mode Status -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
            <span style="font-size: 10px; color: #94a3b8;">Weak Subjectivity Checkpoint:</span>
            <button id="btn-toggle-lr-defense" class="hud-btn ${lr.isWeakSubjectivityEnabled ? 'primary' : ''}" style="font-size: 9px; padding: 4px 8px;">
              ${lr.isWeakSubjectivityEnabled ? '🛡️ Checkpoints: ACTIVE' : '⚠️ Checkpoints: OFF'}
            </button>
          </div>

          ${lr.defenseResult ? `
            <div style="background: ${isDefended ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 51, 102, 0.15)'}; border: 1px solid ${isDefended ? 'var(--accent-green)' : 'var(--accent-red)'}; padding: 6px 8px; border-radius: 4px; font-size: 9.5px; color: #fff; line-height: 1.4; margin-bottom: 8px;">
              ${lr.defenseResult.message}
            </div>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="btn-lr-acquire-keys" class="action-btn" style="background: rgba(157, 78, 221, 0.2); border: 1px solid var(--accent-purple); color: #fff;" ${isCompromised ? 'disabled' : ''}>
            <span class="btn-text">1. Acquire Withdrawn Keys (Alice & Bob)</span>
            <span class="btn-subtext">Validators unbonded long ago ➔ Old keys carry zero risk</span>
          </button>

          <button id="btn-lr-forge-chain" class="action-btn primary-action" style="background: var(--accent-red); color: #fff; font-weight: bold;" ${!isCompromised ? 'disabled' : ''}>
            <span class="btn-text">2. Forge Long-Range Ghost Fork (#100 ➔ #355)</span>
            <span class="btn-subtext">Rapidly mines 255 blocks in milliseconds using old keys</span>
          </button>

          <button id="btn-lr-reset" class="action-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-medium); color: var(--text-secondary); margin-top: 4px; padding: 6px;">
            <span>🔄 Reset Long-Range Scenario</span>
          </button>
        </div>
      `;
    }

    function renderForkSimulatorUI() {
      const st = forkSimulator.getState();
      const isSoft = st.forkMode === 'soft';
      const isHard = st.forkMode === 'hard';
      const preFork = st.forkState === 'pre';
      const split = st.forkState === 'split';

      const blockPill = (b, col) =>
        `<span title="${b.note || b.label}" style="display:inline-block;padding:3px 7px;border-radius:4px;font-family:var(--font-mono);font-size:9px;font-weight:bold;border:1px solid ${col}44;background:${col}18;color:${col};margin:2px;">${b.label}${b.chain ? ' [' + b.chain + ']' : ''}</span>`;

      const trunkHtml  = st.trunk.map(b => blockPill(b, '#94a3b8')).join('<span style="color:#475569;font-size:9px;">→</span>');
      const forkAHtml  = st.forkA.map(b => blockPill(b, isSoft ? '#00ff88' : '#60a5fa')).join('<span style="color:#475569;font-size:9px;">→</span>');
      const forkBHtml  = st.forkB.map(b => blockPill(b, '#f59e0b')).join('<span style="color:#475569;font-size:9px;">→</span>');

      const nodeRow = (nodes, col, title) => `
        <div style="margin-bottom:6px;">
          <div style="font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:.8px;margin-bottom:3px;">${title}</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;">${nodes.map(n => `
            <span style="font-size:9px;padding:2px 6px;border-radius:3px;
              border:1px solid ${n.accepts === 'reject' ? '#ff3366' : (n.accepts === 'accept' ? '#00ff88' : '#334155')}50;
              background:${n.accepts === 'reject' ? 'rgba(255,51,102,0.12)' : (n.accepts === 'accept' ? 'rgba(0,255,136,0.08)' : 'rgba(0,0,0,0.25)')};
              color:${n.accepts === 'reject' ? '#ff6688' : (n.accepts === 'accept' ? '#00ff88' : col)};
            " title="${n.note || n.label}">${n.label} ${n.accepts === 'reject' ? '✗' : (n.accepts === 'accept' ? '✓' : '…')}</span>
          `).join('')}</div>
        </div>`;

      return `
        <div id="forks-panel" data-panel="forks" class="theory-card" style="background:linear-gradient(145deg,#14110a,#0a0803);border-color:#f59e0b44;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(245,158,11,0.22);padding-bottom:6px;margin-bottom:10px;">
            <strong style="color:#f59e0b;font-size:11px;">🍴 FORK SIMULATOR — SOFT vs HARD FORK</strong>
            <button id="btn-fork-modal" class="hud-btn" style="font-size:9px;padding:3px 8px;border-color:#f59e0b44;color:#f59e0b;">📜 Learn</button>
          </div>

          <!-- Chain Diagram -->
          <div style="margin-bottom:10px;">
            <div style="font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:.8px;margin-bottom:4px;">📦 Shared Chain (All Nodes Agree)</div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">
              ${trunkHtml}<span style="color:#475569;font-size:10px;margin-left:4px;font-weight:bold;">▼ FORK POINT</span>
            </div>
          </div>

          ${(st.forkA.length > 0 || st.forkB.length > 0) ? `
            <div style="display:grid;grid-template-columns:${isHard ? '1fr 1fr' : '1fr'};gap:8px;margin-bottom:10px;">
              <div style="border:1px solid ${isSoft ? '#00ff88' : '#60a5fa'}30;border-radius:6px;padding:8px;">
                <div style="font-size:9px;text-transform:uppercase;color:${isSoft ? '#00ff88' : '#60a5fa'};letter-spacing:.8px;margin-bottom:5px;">
                  ${isSoft ? '✅ SINGLE CHAIN — all nodes converge' : '🔵 ETH CHAIN — upgraded nodes only'}
                </div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">${forkAHtml}</div>
                ${isSoft ? '<div style="margin-top:4px;font-size:9px;color:#00ff88;">Legacy nodes also see these blocks as valid — backward compatible!</div>' : ''}
              </div>
              ${isHard ? `
                <div style="border:1px solid #f59e0b30;border-radius:6px;padding:8px;">
                  <div style="font-size:9px;text-transform:uppercase;color:#f59e0b;letter-spacing:.8px;margin-bottom:5px;">🟠 ETC CHAIN — legacy nodes only</div>
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">${forkBHtml}</div>
                  <div style="margin-top:4px;font-size:9px;color:#f59e0b;">Old nodes reject new blocks — mine a separate chain indefinitely.</div>
                </div>
              ` : ''}
            </div>
            ${nodeRow(st.upgradedNodes, '#60a5fa', 'Upgraded Nodes (v2 rules)')}
            ${nodeRow(st.legacyNodes, '#f59e0b', 'Legacy Nodes (v1 rules)')}
          ` : `
            <div style="text-align:center;padding:20px;color:#475569;font-size:11px;">
              Choose a fork type below to begin the simulation.
            </div>
          `}

          ${st.verdict ? `
            <div style="background:${split ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,136,0.08)'};border:1px solid ${split ? '#ff3366' : '#00ff88'}40;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:10px;color:${split ? '#ff6688' : '#00ff88'};line-height:1.5;">
              <strong>${split ? '💥 PERMANENT SPLIT' : '✅ NO SPLIT'}: </strong>${st.verdict}
            </div>
          ` : ''}

          ${st.eventLog.length > 0 ? `
            <div style="background:#080703;border:1px solid #1e293b;border-radius:4px;padding:7px;max-height:72px;overflow-y:auto;font-family:var(--font-mono);font-size:9px;color:#64748b;margin-bottom:10px;">
              ${st.eventLog.map(e => `<div>${e.msg}</div>`).join('')}
            </div>
          ` : ''}

          <div style="display:flex;flex-direction:column;gap:6px;">
            ${preFork ? `
              <button id="btn-fork-soft" class="action-btn" style="background:rgba(0,255,136,0.1);border:1px solid #00ff88;color:#00ff88;">
                <span class="btn-text">🔼 Trigger Soft Fork — Backward Compatible</span>
                <span class="btn-subtext">New rule tightens validation (e.g. SegWit) — old nodes still accept new blocks</span>
              </button>
              <button id="btn-fork-hard" class="action-btn" style="background:rgba(255,51,102,0.1);border:1px solid #ff3366;color:#ff3366;">
                <span class="btn-text">💥 Trigger Hard Fork — Chain Split (ETH / ETC)</span>
                <span class="btn-subtext">Incompatible rule change — network splits permanently unless everyone upgrades</span>
              </button>
            ` : `
              <button id="btn-fork-add-block" class="action-btn" style="background:rgba(96,165,250,0.1);border:1px solid #60a5fa;color:#60a5fa;">
                <span class="btn-text">📦 Produce Next Block${isHard ? ' on Both Chains' : ''}</span>
                <span class="btn-subtext">Advance the chain${isHard ? ' divergence' : ''} one block further</span>
              </button>
              <button id="btn-fork-reset" class="action-btn" style="background:rgba(255,255,255,0.04);border:1px solid var(--border-medium);color:var(--text-secondary);padding:6px;">
                🔄 Reset Fork Simulation
              </button>
            `}
          </div>
        </div>
      `;
    }

    function attachLabListeners() {
      // Subtab buttons
      document.getElementById('tab-sub-doublespend')?.addEventListener('click', () => switchSubTab('doublespend'));
      document.getElementById('tab-sub-51')?.addEventListener('click', () => switchSubTab('attack51'));
      document.getElementById('tab-sub-nas')?.addEventListener('click', () => switchSubTab('nothing_at_stake'));
      document.getElementById('tab-sub-longrange')?.addEventListener('click', () => switchSubTab('long_range'));
      document.getElementById('tab-sub-forks')?.addEventListener('click', () => switchSubTab('forks'));

      // Fork simulator action buttons
      document.getElementById('btn-fork-soft')?.addEventListener('click', () => {
        forkSimulator.triggerFork('soft');
        renderLabUI();
      });
      document.getElementById('btn-fork-hard')?.addEventListener('click', () => {
        forkSimulator.triggerFork('hard');
        renderLabUI();
      });
      document.getElementById('btn-fork-add-block')?.addEventListener('click', () => {
        forkSimulator.addBlock();
        renderLabUI();
      });
      document.getElementById('btn-fork-reset')?.addEventListener('click', () => {
        forkSimulator.reset();
        renderLabUI();
      });
      document.getElementById('btn-fork-modal')?.addEventListener('click', () => {
        forkSimulator.openModal();
      });

      // Double-Spend buttons
      document.getElementById('btn-ds-tx1')?.addEventListener('click', () => {
        doubleSim.sendTx1();
        renderLabUI();
      });
      document.getElementById('btn-ds-tx2')?.addEventListener('click', () => {
        doubleSim.attemptDoubleSpend();
        renderLabUI();
      });
      document.getElementById('btn-ds-reset')?.addEventListener('click', () => {
        doubleSim.reset();
        renderLabUI();
      });

      // 51% Attack buttons (PoW vs PoS)
      document.getElementById('btn-attack-mode-pow')?.addEventListener('click', () => {
        if (typeof window !== 'undefined' && typeof window.setAttackMode === 'function') {
          window.setAttackMode('pow');
        } else {
          attackConsensusMode = 'pow';
          if (typeof posThresholdAttack.deactivate === 'function') posThresholdAttack.deactivate();
          if (typeof attackSim.activate === 'function') attackSim.activate();
          renderLabUI();
        }
      });

      document.getElementById('btn-attack-mode-pos')?.addEventListener('click', () => {
        if (typeof window !== 'undefined' && typeof window.setAttackMode === 'function') {
          window.setAttackMode('pos');
        } else {
          attackConsensusMode = 'pos';
          if (typeof attackSim.deactivate === 'function') attackSim.deactivate();
          if (typeof posThresholdAttack.activate === 'function') posThresholdAttack.activate();
          renderLabUI();
        }
      });

      document.getElementById('btn-start-51-attack')?.addEventListener('click', () => {
        attackSim.activate();
        attackSim.startAttack();
        renderLabUI();
      });
      document.getElementById('btn-reset-51-attack')?.addEventListener('click', () => {
        attackSim.reset();
        renderLabUI();
      });

      // PoS Threshold Slider
      const slider = document.getElementById('input-attacker-stake-slider');
      slider?.addEventListener('input', (e) => {
        posThresholdAttack.setAttackerStakePercent(e.target.value);
      });

      // Presets
      document.getElementById('btn-stake-preset-0')?.addEventListener('click', () => {
        posThresholdAttack.setAttackerStakePercent(0);
      });
      document.getElementById('btn-stake-preset-34')?.addEventListener('click', () => {
        posThresholdAttack.setAttackerStakePercent(34);
      });
      document.getElementById('btn-stake-preset-51')?.addEventListener('click', () => {
        posThresholdAttack.setAttackerStakePercent(51);
      });
      document.getElementById('btn-stake-preset-66')?.addEventListener('click', () => {
        posThresholdAttack.setAttackerStakePercent(66);
      });

      // Execute & Reset PoS Attack
      document.getElementById('btn-execute-pos-threshold-attack')?.addEventListener('click', () => {
        const res = posThresholdAttack.executeAttack();
        Toast.show(
          res.info.name,
          res.summary,
          res.info.id === 'none' ? 'info' : (res.info.id === 'liveness_34' ? 'warning' : 'error'),
          5000
        );
        renderLabUI();
      });

      document.getElementById('btn-reset-pos-threshold-attack')?.addEventListener('click', () => {
        posThresholdAttack.reset();
        Toast.show("PoS Attack Reset 🔄", "Attacker stake restored to baseline.", "info", 2500);
        renderLabUI();
      });

      // Open PoS Threshold educational modal
      document.getElementById('btn-open-pos-threshold-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_POS_THRESHOLD_MODAL');
      });

      // Nothing-at-Stake buttons
      document.getElementById('btn-toggle-nas-slashing')?.addEventListener('click', () => {
        posAtk.toggleNothingAtStakeSlashing();
        renderLabUI();
      });
      document.getElementById('btn-nas-vote-both')?.addEventListener('click', () => {
        posAtk.voteNothingAtStake('both');
        renderLabUI();
      });
      document.getElementById('btn-nas-vote-a')?.addEventListener('click', () => {
        posAtk.voteNothingAtStake('A');
        renderLabUI();
      });
      document.getElementById('btn-nas-vote-b')?.addEventListener('click', () => {
        posAtk.voteNothingAtStake('B');
        renderLabUI();
      });
      document.getElementById('btn-nas-reset')?.addEventListener('click', () => {
        posAtk.resetNothingAtStake();
        renderLabUI();
      });
      document.getElementById('btn-nas-modal-trigger')?.addEventListener('click', () => {
        eventBus.emit('SHOW_NOTHING_AT_STAKE_MODAL');
      });

      // Long-Range Attack buttons
      document.getElementById('btn-toggle-lr-defense')?.addEventListener('click', () => {
        posAtk.toggleWeakSubjectivity();
        renderLabUI();
      });
      document.getElementById('btn-lr-acquire-keys')?.addEventListener('click', () => {
        posAtk.acquireHistoricalKeys();
        renderLabUI();
      });
      document.getElementById('btn-lr-forge-chain')?.addEventListener('click', async () => {
        await posAtk.launchLongRangeAttack();
        renderLabUI();
      });
      document.getElementById('btn-lr-reset')?.addEventListener('click', () => {
        posAtk.resetLongRange();
        renderLabUI();
      });
      document.getElementById('btn-lr-modal-trigger')?.addEventListener('click', () => {
        eventBus.emit('SHOW_LONG_RANGE_MODAL');
      });
    }

    if (activeSubTab === 'doublespend' && typeof doubleSim.activate === 'function') {
      doubleSim.activate();
    }
    renderLabUI();
    notifyState();
  }
};
