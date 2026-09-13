import { consensusPoS } from '../blockchain/ConsensusPoS.js';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { Crypto } from '../blockchain/Crypto.js';
import { Toast } from './Toast.js';
import { WHY_IT_MATTERS_CONTENT, REAL_WORLD_CASE_STUDIES, LEVEL_METADATA } from '../education/EducationData.js';

export class SidebarUI {
  /**
   * @param {import('../missions/MissionManager.js').MissionManager} missionManager
   */
  constructor(missionManager) {
    this.missionManager = missionManager;
    this.bindTabs();
    this.bindActions();
    this.bindModals();
    this.bindTamperConsole();
    this.bindIntegrityWatcher();
    this.bindMiningWatcher();
  }

  bindTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');

        if (targetTab === 'tab-lab') {
          const currentLevel = this.missionManager?.currentLevelId || 1;
          if (currentLevel === 2) {
            localStorage.setItem('lvl2_labOpened', 'true');
            const dot = document.getElementById('lab-tab-dot');
            if (dot) dot.remove();
          }
        }

        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(targetTab)?.classList.add('active');
      });
    });
  }

  bindActions() {
    // Verify Objectives Button
    const verifyBtn = document.getElementById('btn-verify-objectives');
    verifyBtn?.addEventListener('click', () => {
      this.missionManager.checkObjectives();
      Toast.show("Objectives Checked", "Evaluated current simulation state against mission goals.", "info");
    });

    // Next Chapter Button
    const nextBtn = document.getElementById('btn-next-chapter');
    nextBtn?.addEventListener('click', () => {
      if (!nextBtn.disabled) {
        const nextChapterId = this.missionManager.currentChapterId + 1;
        gameState.setChapter(nextChapterId);
        this.loadChapter(nextChapterId);
        Toast.show("Chapter Unlocked", `Welcome to Chapter ${nextChapterId}!`, "success");
      }
    });

    // Chapter Select Dropdown
    const chapterSelect = document.getElementById('chapter-select');
    chapterSelect?.addEventListener('change', (e) => {
      const chapterId = parseInt(e.target.value, 10);
      gameState.setChapter(chapterId);
      this.loadChapter(chapterId);
    });

    // Reset Sim Button
    document.getElementById('btn-reset-sim')?.addEventListener('click', () => {
      if (confirm('Reset chapter progress?')) {
        gameState.reset();
        location.reload();
      }
    });

    // Audio Toggle Button
    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
      const enabled = gameState.toggleSound();
      Toast.show("Audio FX", enabled ? "Audio enabled" : "Audio muted", "info");
    });

    // 51% Attack Mode Toggle in Header
    document.getElementById('btn-toggle-51-mode')?.addEventListener('click', () => {
      gameState.setChapter(4);
      this.loadChapter(4);
      setTimeout(() => {
        eventBus.emit('ACTIVATE_51_ATTACK_MODE');
      }, 50);
      Toast.show("51% Attack Simulator ☠️", "Switched to Chapter 4: 51% Consensus Attack Simulation.", "warning", 4000);
    });

    // Play/Pause Simulation
    const playBtn = document.getElementById('btn-toggle-play');
    playBtn?.addEventListener('click', () => {
      const paused = gameState.toggleSimulation();
      const playIcon = document.getElementById('play-icon');
      const simMode = document.getElementById('hud-sim-mode');

      if (paused) {
        if (playIcon) playIcon.textContent = '▶ Resume';
        if (simMode) simMode.textContent = 'SIMULATION: PAUSED';
        playBtn.classList.remove('primary');
      } else {
        if (playIcon) playIcon.textContent = '⏸ Pause';
        if (simMode) simMode.textContent = 'SIMULATION: LIVE';
        playBtn.classList.add('primary');
      }
    });

    // Listen to KP and XP updates
    const updateKpDisplay = (val) => {
      const xpEl = document.getElementById('player-xp');
      if (xpEl) xpEl.textContent = `${val} KP`;
    };
    eventBus.on('XP_UPDATED', ({ xp }) => updateKpDisplay(xp));
    eventBus.on('KP_UPDATED', ({ kp }) => updateKpDisplay(kp));
  }

  bindModals() {
    const modal = document.getElementById('inspector-modal');
    const openBtn = document.getElementById('btn-inspect-chain');
    const closeBtn = document.getElementById('btn-close-modal');

    openBtn?.addEventListener('click', () => {
      modal?.classList.remove('hidden');
      this.populateInspector();
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Educational Evidence Modal
    const evidenceModal = document.getElementById('tamper-evidence-modal');
    const closeEvidence = document.getElementById('btn-close-evidence-modal');
    const ackEvidence = document.getElementById('btn-ack-evidence');

    closeEvidence?.addEventListener('click', () => evidenceModal?.classList.add('hidden'));
    ackEvidence?.addEventListener('click', () => evidenceModal?.classList.add('hidden'));
    evidenceModal?.addEventListener('click', (e) => {
      if (e.target === evidenceModal) evidenceModal.classList.add('hidden');
    });

    // Educational Proof of Work Modal
    const powModal = document.getElementById('pow-evidence-modal');
    const closePow = document.getElementById('btn-close-pow-modal');
    const ackPow = document.getElementById('btn-ack-pow');

    closePow?.addEventListener('click', () => powModal?.classList.add('hidden'));
    ackPow?.addEventListener('click', () => powModal?.classList.add('hidden'));
    powModal?.addEventListener('click', (e) => {
      if (e.target === powModal) powModal.classList.add('hidden');
    });

    // Educational Digital Signature Modal
    const sigModal = document.getElementById('signature-evidence-modal');
    const closeSig = document.getElementById('btn-close-sig-modal');
    const ackSig = document.getElementById('btn-ack-sig');

    closeSig?.addEventListener('click', () => sigModal?.classList.add('hidden'));
    ackSig?.addEventListener('click', () => sigModal?.classList.add('hidden'));
    sigModal?.addEventListener('click', (e) => {
      if (e.target === sigModal) sigModal.classList.add('hidden');
    });

    eventBus.on('SHOW_SIGNATURE_MODAL', ({ tx }) => {
      const amtEl = document.getElementById('sig-modal-amount');
      const recEl = document.getElementById('sig-modal-recipient');
      const nonceEl = document.getElementById('sig-modal-nonce');
      const sigEl = document.getElementById('sig-modal-signature');

      if (amtEl) amtEl.textContent = `${tx.amount.toFixed(2)} QUEST`;
      if (recEl) recEl.textContent = tx.toName || tx.to;
      if (nonceEl) nonceEl.textContent = `#${tx.nonce}`;
      if (sigEl) sigEl.textContent = tx.signature;

      setTimeout(() => {
        sigModal?.classList.remove('hidden');
      }, 400);

      Toast.show(
        "Transaction Signed 🖋️",
        `Sent ${tx.amount.toFixed(2)} QUEST to ${tx.toName || 'merchant'} with verified signature!`,
        "success",
        5000
      );
    });

    // Educational Consensus / Node Network Modal (Chapter 3)
    const consensusModal = document.getElementById('consensus-evidence-modal');
    const closeConsensus = document.getElementById('btn-close-consensus-modal');
    const ackConsensus = document.getElementById('btn-ack-consensus');

    closeConsensus?.addEventListener('click', () => consensusModal?.classList.add('hidden'));
    ackConsensus?.addEventListener('click', () => consensusModal?.classList.add('hidden'));
    consensusModal?.addEventListener('click', (e) => {
      if (e.target === consensusModal) consensusModal.classList.add('hidden');
    });

    eventBus.on('SHOW_CONSENSUS_MODAL', ({ approvedCount, rejectedCount, consensusApproved, attackScenario }) => {
      const verdictEl = document.getElementById('consensus-modal-verdict');
      const scenarioEl = document.getElementById('consensus-modal-scenario');
      const tallyEl = document.getElementById('consensus-modal-tally');
      const descEl = document.getElementById('consensus-modal-desc');

      if (tallyEl) tallyEl.textContent = `${approvedCount} Approved / ${rejectedCount} Rejected`;

      const scenarioLabels = {
        'VALID': 'Honest Valid Transfer',
        'FORGED_SIGNATURE': 'Attack: Forged Signature',
        'INSUFFICIENT_FUNDS': 'Attack: Insufficient Funds',
        'BAD_NONCE': 'Attack: Invalid/Replayed Nonce',
        'DOUBLE_SPEND': 'Attack: Competing Double-Spend'
      };

      if (scenarioEl) scenarioEl.textContent = scenarioLabels[attackScenario] || attackScenario;

      if (verdictEl) {
        if (consensusApproved) {
          verdictEl.textContent = `APPROVED (${approvedCount}/4 NODES)`;
          verdictEl.style.color = 'var(--accent-green)';
        } else {
          verdictEl.textContent = `REJECTED (${rejectedCount}/4 NODES)`;
          verdictEl.style.color = 'var(--accent-red)';
        }
      }

      if (descEl) {
        if (consensusApproved) {
          descEl.textContent = 'All honest nodes independently verified all 4 invariants. Transaction accepted!';
          descEl.style.color = 'var(--accent-green)';
        } else {
          descEl.textContent = `Network defended against ${scenarioLabels[attackScenario] || 'attack'}! Honest nodes rejected counterfeit packet.`;
          descEl.style.color = 'var(--accent-red)';
        }
      }

      setTimeout(() => {
        consensusModal?.classList.remove('hidden');
      }, 500);

      Toast.show(
        consensusApproved ? "Consensus Approved! 🛡️" : "Attack Defeated! ⚔️",
        consensusApproved 
          ? "All 4 nodes verified invariants and admitted transaction to mempool."
          : `Nodes detected invalid transaction and rejected it (${rejectedCount}/4 votes).`,
        consensusApproved ? "success" : "warning",
        5000
      );
    });

    // Educational 51% Attack Modal (Chapter 4)
    const attack51Modal = document.getElementById('attack51-evidence-modal');
    const close51 = document.getElementById('btn-close-51-modal');
    const ack51 = document.getElementById('btn-ack-51');

    close51?.addEventListener('click', () => attack51Modal?.classList.add('hidden'));
    ack51?.addEventListener('click', () => attack51Modal?.classList.add('hidden'));
    attack51Modal?.addEventListener('click', (e) => {
      if (e.target === attack51Modal) attack51Modal.classList.add('hidden');
    });

    eventBus.on('SHOW_51_ATTACK_MODAL', () => {
      attack51Modal?.classList.remove('hidden');
      Toast.show("51% Attack Analysis 🛡️", "Economic Game Theory proves why 51% attacks are irrational.", "info", 4000);
    });

    // Educational Double-Spend Modal (Chapter 6)
    const doubleSpendModal = document.getElementById('doublespend-evidence-modal');
    const closeDoubleSpend = document.getElementById('btn-close-doublespend-modal');
    const ackDoubleSpend = document.getElementById('btn-ack-doublespend');

    closeDoubleSpend?.addEventListener('click', () => doubleSpendModal?.classList.add('hidden'));
    ackDoubleSpend?.addEventListener('click', () => doubleSpendModal?.classList.add('hidden'));
    doubleSpendModal?.addEventListener('click', (e) => {
      if (e.target === doubleSpendModal) doubleSpendModal.classList.add('hidden');
    });

    eventBus.on('SHOW_DOUBLE_SPEND_MODAL', () => {
      doubleSpendModal?.classList.remove('hidden');
      Toast.show("Double-Spend Prevented! 🛡️", "Sequential account nonces prevent coin duplication.", "success", 4500);
    });

    // Educational Smart Contract Modal (Chapter 7)
    const contractModal = document.getElementById('contract-evidence-modal');
    const closeContract = document.getElementById('btn-close-contract-modal');
    const ackContract = document.getElementById('btn-ack-contract');

    closeContract?.addEventListener('click', () => contractModal?.classList.add('hidden'));
    ackContract?.addEventListener('click', () => contractModal?.classList.add('hidden'));
    contractModal?.addEventListener('click', (e) => {
      if (e.target === contractModal) contractModal.classList.add('hidden');
    });

    eventBus.on('SHOW_CONTRACT_MODAL', () => {
      contractModal?.classList.remove('hidden');
      Toast.show("Smart Contract Invariant 📜", "Self-executing code runs exactly as written.", "info", 4500);
    });

    // Educational Difficulty Retarget Modal (Level 2 PoW Auto-Adjustment)
    const retargetModal = document.getElementById('difficulty-retarget-modal');
    const closeRetarget = document.getElementById('btn-close-retarget-modal');
    const ackRetarget = document.getElementById('btn-ack-retarget');

    closeRetarget?.addEventListener('click', () => retargetModal?.classList.add('hidden'));
    ackRetarget?.addEventListener('click', () => retargetModal?.classList.add('hidden'));
    retargetModal?.addEventListener('click', (e) => {
      if (e.target === retargetModal) retargetModal.classList.add('hidden');
    });

    eventBus.on('DIFFICULTY_RETARGETED', ({ oldDiff, newDiff, avgTime, targetTime, ratio, reason }) => {
      const oldEl = document.getElementById('retarget-old-diff');
      const newEl = document.getElementById('retarget-new-diff');
      const avgEl = document.getElementById('retarget-avg-time');
      const iconEl = document.getElementById('retarget-direction-icon');
      const titleEl = document.getElementById('retarget-direction-title');
      const reasonEl = document.getElementById('retarget-modal-reason');

      if (oldEl) oldEl.textContent = `D${oldDiff} ('${'0'.repeat(oldDiff)}')`;
      if (newEl) newEl.textContent = `D${newDiff} ('${'0'.repeat(newDiff)}')`;
      if (avgEl) avgEl.textContent = `${Number(avgTime).toFixed(2)}s`;
      if (iconEl) iconEl.textContent = newDiff > oldDiff ? '📈' : '📉';
      if (titleEl) {
        titleEl.textContent = newDiff > oldDiff 
          ? `Difficulty Increased (D${oldDiff} ➔ D${newDiff})`
          : `Difficulty Decreased (D${oldDiff} ➔ D${newDiff})`;
        titleEl.style.color = newDiff > oldDiff ? 'var(--accent-amber)' : 'var(--accent-cyan)';
      }
      if (reasonEl) reasonEl.textContent = reason;

      retargetModal?.classList.remove('hidden');

      Toast.show(
        "Difficulty Retargeted! ⚖️",
        `Bitcoin adjusted difficulty to D${newDiff} ('${'0'.repeat(newDiff)}') to keep block time near ~5.0s.`,
        "info",
        6000
      );
    });

    eventBus.on('SHOW_RETARGET_MODAL', () => {
      retargetModal?.classList.remove('hidden');
    });

    // Educational Proof of Stake & Slashing Modal
    const posModal = document.getElementById('pos-evidence-modal');
    const closePos = document.getElementById('btn-close-pos-modal');
    const ackPos = document.getElementById('btn-ack-pos');

    closePos?.addEventListener('click', () => posModal?.classList.add('hidden'));
    ackPos?.addEventListener('click', () => posModal?.classList.add('hidden'));
    posModal?.addEventListener('click', (e) => {
      if (e.target === posModal) posModal.classList.add('hidden');
    });

    eventBus.on('POS_SLASHING_TRIGGERED', (result) => {
      const valEl = document.getElementById('pos-modal-validator');
      const burnedEl = document.getElementById('pos-modal-burned');
      const stakeChangeEl = document.getElementById('pos-modal-stake-change');
      const whistleblowerEl = document.getElementById('pos-modal-whistleblower');
      const offenseEl = document.getElementById('pos-modal-offense');
      const offenseIconEl = document.getElementById('pos-modal-offense-icon');
      const reasonEl = document.getElementById('pos-modal-reason');

      if (valEl && result.validator) valEl.textContent = `${result.validator.avatar} ${result.validator.name}`;
      if (burnedEl) burnedEl.textContent = `-${(result.stakeBurned || result.slashedStake).toFixed(1)} Q (-${result.penaltyPercent}%)`;
      if (stakeChangeEl) stakeChangeEl.textContent = `${result.stakeBefore.toFixed(1)} → ${result.stakeAfter.toFixed(1)} Q`;
      if (whistleblowerEl) {
        if (result.whistleblower) {
          whistleblowerEl.textContent = `${result.whistleblower.avatar} +${result.whistleblower.reward.toFixed(1)} Q`;
          whistleblowerEl.title = `Reporter: ${result.whistleblower.name} awarded 10% bounty`;
        } else {
          whistleblowerEl.textContent = 'Protocol Detection';
        }
      }
      if (offenseEl) offenseEl.textContent = `Slashing Condition: ${result.offenseLabel || 'Rule Violation'}`;
      if (offenseIconEl) offenseIconEl.textContent = result.offenseIcon || '⚔️';
      if (reasonEl) reasonEl.textContent = result.reason;

      posModal?.classList.remove('hidden');

      Toast.show(
        `Validator Slashed! ${result.offenseIcon || '⚔️'}`,
        `${result.validator.name} penalized for ${result.offenseLabel || 'infraction'}. ${(result.stakeBurned || result.slashedStake).toFixed(1)} QUEST burned.`,
        "error",
        6000
      );
    });

    eventBus.on('SHOW_POS_MODAL', () => {
      posModal?.classList.remove('hidden');
    });

    // Educational Nothing-at-Stake Modal
    const nasModal = document.getElementById('nothing-at-stake-modal');
    const closeNas = document.getElementById('btn-close-nas-modal');
    const ackNas = document.getElementById('btn-ack-nas');

    closeNas?.addEventListener('click', () => nasModal?.classList.add('hidden'));
    ackNas?.addEventListener('click', () => nasModal?.classList.add('hidden'));
    nasModal?.addEventListener('click', (e) => {
      if (e.target === nasModal) nasModal.classList.add('hidden');
    });

    eventBus.on('SHOW_NOTHING_AT_STAKE_MODAL', () => {
      nasModal?.classList.remove('hidden');
      Toast.show("Nothing-at-Stake Invariant 📜", "Signing multiple forks costs 100% of your stake via Slashing.", "error", 5000);
    });

    // Educational Long-Range Attack Modal
    const lrModal = document.getElementById('long-range-modal');
    const closeLr = document.getElementById('btn-close-lr-modal');
    const ackLr = document.getElementById('btn-ack-lr');

    closeLr?.addEventListener('click', () => lrModal?.classList.add('hidden'));
    ackLr?.addEventListener('click', () => lrModal?.classList.add('hidden'));
    lrModal?.addEventListener('click', (e) => {
      if (e.target === lrModal) lrModal.classList.add('hidden');
    });

    eventBus.on('SHOW_LONG_RANGE_MODAL', () => {
      lrModal?.classList.remove('hidden');
      Toast.show("Weak Subjectivity Defense 🛡️", "Historical forks past the finality checkpoint are rejected.", "info", 5000);
    });

    // 11. Educational Delegated Staking Modal
    const delegatedModal = document.getElementById('delegated-staking-modal');
    const closeDelegated = document.getElementById('btn-close-delegated-modal');
    const ackDelegated = document.getElementById('btn-ack-delegated');

    closeDelegated?.addEventListener('click', () => delegatedModal?.classList.add('hidden'));
    ackDelegated?.addEventListener('click', () => delegatedModal?.classList.add('hidden'));
    delegatedModal?.addEventListener('click', (e) => {
      if (e.target === delegatedModal) delegatedModal.classList.add('hidden');
    });

    eventBus.on('SHOW_DELEGATED_STAKING_MODAL', () => {
      delegatedModal?.classList.remove('hidden');
      Toast.show("Liquid Staking Protocol 🌊", "Delegating mints 1:1 stQUEST tokens you can trade in DeFi.", "info", 5000);
    });

    // 13. Educational RANDAO & Verifiable Randomness Modal
    const randaoModal = document.getElementById('randao-modal');
    const closeRandao = document.getElementById('btn-close-randao-modal');
    const ackRandao = document.getElementById('btn-ack-randao');

    closeRandao?.addEventListener('click', () => randaoModal?.classList.add('hidden'));
    ackRandao?.addEventListener('click', () => randaoModal?.classList.add('hidden'));
    randaoModal?.addEventListener('click', (e) => {
      if (e.target === randaoModal) randaoModal.classList.add('hidden');
    });

    eventBus.on('SHOW_RANDAO_MODAL', () => {
      randaoModal?.classList.remove('hidden');
      Toast.show("RANDAO Verifiable Randomness 🎲", "Entropy mix XOR prevents validator selection bias.", "info", 5000);
    });

    // 14. Split-Screen Consensus Comparison Modal
    const compareModal = document.getElementById('consensus-compare-modal');
    const closeCompare = document.getElementById('btn-close-compare-modal');
    const ackCompare = document.getElementById('btn-ack-compare');

    closeCompare?.addEventListener('click', () => compareModal?.classList.add('hidden'));
    ackCompare?.addEventListener('click', () => compareModal?.classList.add('hidden'));
    compareModal?.addEventListener('click', (e) => {
      if (e.target === compareModal) compareModal.classList.add('hidden');
    });

    eventBus.on('SHOW_COMPARE_MODAL', () => {
      compareModal?.classList.remove('hidden');
      Toast.show("Consensus Comparison ⚖️", "PoW security = physical resources. PoS security = locked capital. Each has trade-offs.", "info", 5000);
    });

    // 15. PoS Attack Thresholds Educational Modal
    const posThresholdModal = document.getElementById('pos-threshold-attack-modal');
    const closePosThreshold = document.getElementById('btn-close-pos-threshold-modal');
    const ackPosThreshold = document.getElementById('btn-ack-pos-threshold');

    closePosThreshold?.addEventListener('click', () => posThresholdModal?.classList.add('hidden'));
    ackPosThreshold?.addEventListener('click', () => posThresholdModal?.classList.add('hidden'));
    posThresholdModal?.addEventListener('click', (e) => {
      if (e.target === posThresholdModal) posThresholdModal.classList.add('hidden');
    });

    eventBus.on('SHOW_POS_THRESHOLD_MODAL', () => {
      posThresholdModal?.classList.remove('hidden');
      Toast.show("PoS Attack Thresholds ⚔️", "In PoS, attacking means buying most of the supply — which drives the price up — and then losing it to slashing. Economically suicidal.", "info", 5000);
    });

    // 16. PoW vs PoS Finality Comparison Modal
    const finalityModal = document.getElementById('finality-comparison-modal');
    const closeFinality = document.getElementById('btn-close-finality-modal');
    const ackFinality = document.getElementById('btn-ack-finality');

    closeFinality?.addEventListener('click', () => finalityModal?.classList.add('hidden'));
    ackFinality?.addEventListener('click', () => finalityModal?.classList.add('hidden'));
    finalityModal?.addEventListener('click', (e) => {
      if (e.target === finalityModal) finalityModal.classList.add('hidden');
    });

    eventBus.on('SHOW_FINALITY_MODAL', () => {
      finalityModal?.classList.remove('hidden');
      Toast.show("PoW vs PoS Finality 🔒", "PoW has probabilistic finality — the deeper a block, the safer. PoS has deterministic finality — after finalization, reversion is economically impossible.", "info", 5000);
    });

    // 17. The Merge (2022) Educational Modal
    const mergeModal = document.getElementById('merge-educational-modal');
    const closeMergeModal = document.getElementById('btn-close-merge-modal');
    const ackMerge = document.getElementById('btn-ack-merge');

    closeMergeModal?.addEventListener('click', () => mergeModal?.classList.add('hidden'));
    ackMerge?.addEventListener('click', () => mergeModal?.classList.add('hidden'));
    mergeModal?.addEventListener('click', (e) => {
      if (e.target === mergeModal) mergeModal.classList.add('hidden');
    });

    eventBus.on('SHOW_MERGE_MODAL', () => {
      mergeModal?.classList.remove('hidden');
      Toast.show("The Merge (2022) 🐼", "The Merge was the largest upgrade in blockchain history. It swapped consensus engines on a live chain with zero downtime and cut Ethereum's energy use by ~99.95%.", "success", 6000);
    });

    // 18. Soft / Hard Fork Simulator Modal
    const forkModal = document.getElementById('fork-simulator-modal');
    const closeForkModal = document.getElementById('btn-close-fork-modal');
    const ackFork = document.getElementById('btn-ack-fork');

    closeForkModal?.addEventListener('click', () => forkModal?.classList.add('hidden'));
    ackFork?.addEventListener('click', () => forkModal?.classList.add('hidden'));
    forkModal?.addEventListener('click', (e) => {
      if (e.target === forkModal) forkModal.classList.add('hidden');
    });

    eventBus.on('SHOW_FORK_MODAL', () => {
      forkModal?.classList.remove('hidden');
      Toast.show("Soft & Hard Forks 🍴", "Soft forks are backward-compatible rule tightenings. Hard forks are rule changes that split the network unless everyone upgrades.", "info", 5000);
    });

    // 12. Interactive Delegation Action Modal
    const delActionModal = document.getElementById('delegate-action-modal');
    const closeDelAction = document.getElementById('btn-close-delegate-action');
    const cancelDelAction = document.getElementById('btn-cancel-delegate-action');
    const confirmDelAction = document.getElementById('btn-confirm-delegate-action');
    const amtInput = document.getElementById('delegate-action-amount');
    const previewLstEl = document.getElementById('del-modal-preview-lst');
    const walletBalEl = document.getElementById('del-modal-wallet-bal');
    const valNameEl = document.getElementById('del-modal-val-name');
    const valStakeEl = document.getElementById('del-modal-val-stake');

    let currentTargetValId = null;

    closeDelAction?.addEventListener('click', () => delActionModal?.classList.add('hidden'));
    cancelDelAction?.addEventListener('click', () => delActionModal?.classList.add('hidden'));
    delActionModal?.addEventListener('click', (e) => {
      if (e.target === delActionModal) delActionModal.classList.add('hidden');
    });

    function updatePreview() {
      const amt = parseFloat(amtInput?.value || '0');
      if (previewLstEl) {
        previewLstEl.textContent = `+${amt > 0 ? amt.toFixed(2) : '0.00'} stQUEST (1:1)`;
      }
    }

    amtInput?.addEventListener('input', updatePreview);

    document.querySelectorAll('.btn-del-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (!amtInput) return;
        if (val === 'max') {
          amtInput.value = Math.floor(playerWallet.balance);
        } else {
          amtInput.value = val;
        }
        updatePreview();
      });
    });

    eventBus.on('SHOW_DELEGATE_ACTION_MODAL', ({ validatorId }) => {
      const val = consensusPoS.validators.find(v => v.id === validatorId);
      if (!val) return;
      currentTargetValId = validatorId;

      if (valNameEl) valNameEl.textContent = `${val.avatar} ${val.name}`;
      if (valStakeEl) valStakeEl.textContent = `${val.stake.toFixed(1)} QUEST`;
      if (walletBalEl) walletBalEl.textContent = `${playerWallet.balance.toFixed(2)} QUEST`;
      if (amtInput) {
        amtInput.value = Math.min(10, Math.floor(playerWallet.balance)) || 5;
        amtInput.max = Math.floor(playerWallet.balance);
      }
      updatePreview();
      delActionModal?.classList.remove('hidden');
    });

    confirmDelAction?.addEventListener('click', () => {
      if (!currentTargetValId) return;
      const amt = parseFloat(amtInput?.value || '0');
      try {
        const res = consensusPoS.delegatePlayer(currentTargetValId, amt);
        delActionModal?.classList.add('hidden');
        Toast.show(
          "Delegation Successful! 🤝",
          `Minted ${amt.toFixed(1)} stQUEST (LST) and delegated to ${res.validator.name}. Earning rewards minus 10% commission!`,
          "success",
          6000
        );
        // Prompt educational modal to reinforce concept
        setTimeout(() => {
          delegatedModal?.classList.remove('hidden');
        }, 1200);
      } catch (err) {
        Toast.show("Delegation Failed", err.message, "error", 4000);
      }
    });
  }

  /**
   * Block Tamper / Data Edit Modal
   */
  bindTamperConsole() {
    const modal = document.getElementById('block-tamper-modal');
    const closeBtn = document.getElementById('btn-close-tamper-modal');
    const cancelBtn = document.getElementById('btn-cancel-tamper');
    const form = document.getElementById('form-tamper-block');
    const dataInput = document.getElementById('tamper-data-input');
    const indexInput = document.getElementById('tamper-block-index');
    const modalBadge = document.getElementById('tamper-modal-badge');
    const prevHashEl = document.getElementById('tamper-prev-hash');
    const currHashEl = document.getElementById('tamper-curr-hash');
    const hashStatusEl = document.getElementById('tamper-hash-status');

    let originalData = "";

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    async function processTamperPipeline(triggerSource = 'input') {
      const idx = parseInt(indexInput?.value || '1', 10);
      const block = defaultBlockchain.chain[idx];
      if (!block || !dataInput) return;

      const newData = dataInput.value;

      // STAGE 1: Input change
      console.log(`[Tamper Demo] Stage 1: Input change detected for Block #${idx} -> "${newData}" (trigger: ${triggerSource})`);

      // STAGE 2: Hash recalculation (async Web Crypto API SHA-256)
      await defaultBlockchain.tamperBlock(idx, newData);
      const recalculatedHash = block.hash;
      console.log(`[Tamper Demo] Stage 2: Hash recalculation complete -> Block #${idx} hash: ${recalculatedHash}`);

      // STAGE 3: Chain validation (detect severed hash pointers and altered digests)
      const integrity = defaultBlockchain.getChainIntegrity();
      const isValid = !integrity.isCompromised;
      console.log(`[Tamper Demo] Stage 3: Chain validation -> ${isValid ? 'Chain Valid: ✅' : 'Chain Valid: ❌'} (Health: ${integrity.integrityScore}%, Broken links: [${integrity.brokenLinks.join(', ')}], Tampered blocks: [${integrity.invalidBlocks.join(', ')}])`);

      // STAGE 4: UI & Canvas update
      if (currHashEl) currHashEl.textContent = recalculatedHash;

      if (hashStatusEl) {
        hashStatusEl.textContent = isValid ? "Chain Valid: ✅" : "Chain Valid: ❌";
        hashStatusEl.style.color = isValid ? "var(--accent-green)" : "var(--accent-red)";
      }

      const valBannerText = document.getElementById('tamper-chain-validity-text');
      if (valBannerText) {
        valBannerText.textContent = isValid ? "Chain Valid: ✅ (Integrity 100%)" : "Chain Valid: ❌ (Integrity Compromised)";
        valBannerText.style.color = isValid ? "var(--accent-green)" : "var(--accent-red)";
      }

      eventBus.emit('CHAIN_UPDATED', {
        chain: defaultBlockchain.chain,
        candidate: defaultBlockchain.candidateBlock,
        integrity
      });

      console.log(`[Tamper Demo] Stage 4: UI & Canvas updated -> Status: ${isValid ? 'Chain Valid: ✅' : 'Chain Valid: ❌'}`);
    }

    // Preset buttons
    document.getElementById('btn-preset-doublespend')?.addEventListener('click', async () => {
      if (dataInput) dataInput.value = "Alice -> Bob 12.5 BTC & Alice -> Alice 12.5 BTC (DOUBLE SPEND)";
      await processTamperPipeline('preset-doublespend');
    });

    document.getElementById('btn-preset-hacker')?.addEventListener('click', async () => {
      if (dataInput) dataInput.value = "Alice -> Hacker: 50.0 BTC (THEFT)";
      await processTamperPipeline('preset-hacker');
    });

    document.getElementById('btn-preset-restore')?.addEventListener('click', async () => {
      if (dataInput) dataInput.value = originalData;
      await processTamperPipeline('preset-restore');
    });

    // Live keystroke and change listeners for real-time recalculation
    dataInput?.addEventListener('input', () => processTamperPipeline('input'));
    dataInput?.addEventListener('change', () => processTamperPipeline('change'));

    // Open tamper console on block click from canvas
    eventBus.on('BLOCK_CLICKED', ({ index, block }) => {
      indexInput.value = index;
      originalData = block.getSummary();
      if (modalBadge) modalBadge.textContent = index === 0 ? "BLOCK #0 (GENESIS)" : `BLOCK #${index}`;
      if (dataInput) dataInput.value = originalData;
      if (prevHashEl) prevHashEl.textContent = block.previousHash;
      if (currHashEl) currHashEl.textContent = block.hash;

      const integrity = defaultBlockchain.getChainIntegrity();
      const isValid = !integrity.isCompromised;
      if (hashStatusEl) {
        hashStatusEl.textContent = isValid ? "Chain Valid: ✅" : "Chain Valid: ❌";
        hashStatusEl.style.color = isValid ? "var(--accent-green)" : "var(--accent-red)";
      }
      const valBannerText = document.getElementById('tamper-chain-validity-text');
      if (valBannerText) {
        valBannerText.textContent = isValid ? "Chain Valid: ✅ (Integrity 100%)" : "Chain Valid: ❌ (Integrity Compromised)";
        valBannerText.style.color = isValid ? "var(--accent-green)" : "var(--accent-red)";
      }

      modal?.classList.remove('hidden');
    });

    // Form submit: recalculate hash using Web Crypto API and show educational popup if compromised
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await processTamperPipeline('form-submit');
      modal?.classList.add('hidden');

      const idx = parseInt(indexInput.value, 10);
      const integrity = defaultBlockchain.getChainIntegrity();
      const block = defaultBlockchain.chain[idx];
      const nextBlock = defaultBlockchain.chain[idx + 1];

      // If integrity is compromised, show Educational Popup
      if (integrity.isCompromised) {
        const evidenceModal = document.getElementById('tamper-evidence-modal');
        const evBlockNum = document.getElementById('evidence-block-num');
        const evCurrId = document.getElementById('evidence-curr-id');
        const evNextId = document.getElementById('evidence-next-id');
        const evNewHash = document.getElementById('evidence-new-hash');
        const evExpHash = document.getElementById('evidence-exp-hash');

        if (evBlockNum) evBlockNum.textContent = idx;
        if (evCurrId) evCurrId.textContent = idx;
        if (evNextId) evNextId.textContent = nextBlock ? nextBlock.index : idx;
        if (evNewHash) evNewHash.textContent = block.hash;
        if (evExpHash) evExpHash.textContent = nextBlock ? nextBlock.previousHash : 'N/A';

        setTimeout(() => {
          evidenceModal?.classList.remove('hidden');
        }, 400);

        Toast.show("Chain Link Fractured!", "Tampering altered the hash, breaking downstream link.", "error");
      } else {
        Toast.show("Block Updated", "Data restored to valid matching state.", "success");
      }
    });
  }

  /**
   * Monitor chain integrity and update HUD health bar
   */
  bindIntegrityWatcher() {
    const fill = document.getElementById('hud-integrity-fill');
    const text = document.getElementById('hud-integrity-text');

    function updateHUD(integrity) {
      if (!fill || !text) return;
      const score = integrity.integrityScore;

      fill.style.width = `${score}%`;
      text.textContent = `${score}%`;

      fill.classList.remove('warning', 'critical');
      if (score >= 80) {
        text.style.color = 'var(--accent-green)';
      } else if (score >= 40) {
        text.style.color = 'var(--accent-amber)';
        fill.classList.add('warning');
      } else {
        text.style.color = 'var(--accent-red)';
        fill.classList.add('critical');
      }
    }

    eventBus.on('CHAIN_UPDATED', ({ integrity }) => updateHUD(integrity));
    eventBus.on('CHAIN_TAMPERED', ({ integrity }) => updateHUD(integrity));
    eventBus.on('CHAIN_REPAIRED', ({ integrity }) => {
      updateHUD(integrity);
      Toast.show("Chain Repaired!", "Re-mined proof-of-work hashes. 100% integrity restored!", "success");
    });
  }

  /**
   * Monitor Proof of Work mining telemetry and handle celebration / popup
   */
  bindMiningWatcher() {
    const hashrateEl = document.getElementById('hud-mining-hashrate');
    const targetEl = document.getElementById('hud-mining-target');
    const heightEl = document.getElementById('hud-block-height');

    eventBus.on('MINING_PROGRESS', ({ hashRate, targetPrefix }) => {
      if (hashrateEl) hashrateEl.textContent = `${hashRate.toLocaleString()} H/s`;
      if (targetEl) targetEl.textContent = targetPrefix;
    });

    eventBus.on('DIFFICULTY_CHANGED', ({ prefix }) => {
      if (targetEl) targetEl.textContent = prefix;
    });

    eventBus.on('MINING_STOPPED', () => {
      if (hashrateEl) hashrateEl.textContent = 'IDLE';
    });

    eventBus.on('MINING_SUCCESS', ({ block, stats, reward }) => {
      if (hashrateEl) hashrateEl.textContent = 'MINED! 🎉';
      if (heightEl) heightEl.textContent = `#${defaultBlockchain.chain.length - 1}`;

      // Award XP & Knowledge Points
      gameState.addXP(100);
      gameState.addKP(50);

      // Populate & Display Educational Proof-of-Work Popup
      const powModal = document.getElementById('pow-evidence-modal');
      const modalBlockNum = document.getElementById('pow-modal-block-num');
      const modalDiffTarget = document.getElementById('pow-modal-diff-target');
      const modalNonce = document.getElementById('pow-modal-nonce');
      const modalAttempts = document.getElementById('pow-modal-attempts');
      const modalTime = document.getElementById('pow-modal-time');
      const modalHash = document.getElementById('pow-modal-hash');
      const modalCostAttempts = document.getElementById('pow-modal-cost-attempts');
      const modalHashrate = document.getElementById('pow-modal-hashrate');
      const modalEnergy = document.getElementById('pow-modal-energy');
      const modalReward = document.getElementById('pow-modal-reward');

      const joules = stats.joulesBurned !== undefined ? stats.joulesBurned : Number((stats.attempts * 0.05).toFixed(2));
      const wattHours = stats.wattHours !== undefined ? stats.wattHours : Number((joules / 3600).toFixed(4));
      const blockReward = reward || stats.blockReward || 50.0;

      if (modalBlockNum) modalBlockNum.textContent = block.index;
      if (modalDiffTarget) modalDiffTarget.textContent = '0'.repeat(stats.difficulty);
      if (modalNonce) modalNonce.textContent = (stats.winningNonce !== undefined ? stats.winningNonce : block.nonce).toLocaleString();
      if (modalAttempts) modalAttempts.textContent = `${stats.attempts.toLocaleString()} nonces`;
      if (modalTime) modalTime.textContent = `${(stats.timeMs / 1000).toFixed(2)}s`;
      if (modalHashrate) modalHashrate.textContent = `${stats.hashRate.toLocaleString()} H/s`;
      if (modalEnergy) modalEnergy.textContent = `${joules.toLocaleString()} J (${wattHours} Wh)`;
      if (modalReward) modalReward.textContent = `+${blockReward.toFixed(1)} QUEST`;
      if (modalHash) modalHash.textContent = block.hash;
      if (modalCostAttempts) modalCostAttempts.textContent = `${stats.attempts.toLocaleString()}`;

      setTimeout(() => {
        powModal?.classList.remove('hidden');
      }, 500);

      Toast.show(
        "Proof of Work Solved! ⛏️",
        `Block #${block.index} mined in ${(stats.timeMs / 1000).toFixed(2)}s (${stats.attempts.toLocaleString()} attempts). Earned +${blockReward} QUEST! (+50 KP)`,
        "success",
        5000
      );
    });
  }

  populateInspector() {
    const content = document.getElementById('modal-content');
    if (!content) return;

    const chain = defaultBlockchain.chain.map(b => ({
      index: b.index,
      timestamp: b.timestamp,
      data: b.data,
      previousHash: b.previousHash,
      hash: b.hash,
      nonce: b.nonce,
      isValid: b.isValid()
    }));

    const integrity = defaultBlockchain.getChainIntegrity();

    content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <strong style="color: ${integrity.isCompromised ? 'var(--accent-red)' : 'var(--accent-green)'};">
            LEDGER STATUS: ${integrity.integrityScore}% HEALTH (${integrity.isCompromised ? 'COMPROMISED' : 'VERIFIED'})
          </strong>
          <span style="color: var(--accent-cyan);">Total Blocks: ${chain.length}</span>
        </div>
        <pre style="background: rgba(0,0,0,0.5); padding: 14px; border-radius: 6px; overflow-x: auto; color: #a5b4fc; font-size: 11px; line-height: 1.5;">${JSON.stringify(chain, null, 2)}</pre>
      </div>
    `;
  }

  loadChapter(chapterId) {
    this.missionManager.loadChapter(chapterId);
    const mission = this.missionManager.activeMission;
    if (!mission) return;

    // Update Level Map Header Button & Progress
    const headerLevelText = document.getElementById('header-level-text');
    const meta = LEVEL_METADATA[mission.id];
    if (headerLevelText) {
      headerLevelText.textContent = `LEVEL 0${mission.id} / 07`;
    }

    const progressBar = document.getElementById('global-progress-bar');
    const progressText = document.getElementById('global-progress-text');
    if (progressBar) progressBar.style.width = `${Math.round((mission.id / 7) * 100)}%`;
    if (progressText) progressText.textContent = `${mission.id} / 7`;

    const kpEl = document.getElementById('player-xp');
    if (kpEl) kpEl.textContent = `${gameState.knowledgePoints} KP`;

    // Update Dropdown selector
    const chapterSelect = document.getElementById('chapter-select');
    if (chapterSelect && chapterSelect.value !== String(chapterId)) {
      chapterSelect.value = String(chapterId);
    }

    // Update Banner
    const banner = document.getElementById('canvas-overlay-banner');
    const bannerBadge = document.getElementById('canvas-banner-badge');
    const bannerTitle = document.getElementById('canvas-banner-title');
    const bannerDesc = document.getElementById('canvas-banner-desc');

    if (banner) {
      if (bannerBadge) bannerBadge.textContent = `LEVEL 0${mission.id}`;
      if (bannerTitle) bannerTitle.textContent = mission.title;
      if (bannerDesc) bannerDesc.textContent = mission.subtitle;

      banner.classList.remove('hidden');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 5000);
    }

    // Render Theory
    const theoryContainer = document.getElementById('theory-container');
    if (theoryContainer && mission.theory) {
      theoryContainer.innerHTML = `
        <div class="theory-hero">
          <span class="chapter-number">LEVEL 0${mission.id} • ${meta?.role || 'EXPLORER'}</span>
          <h2 class="theory-title">${mission.theory.heroTitle}</h2>
        </div>

        ${mission.theory.sections.map(sec => `
          <div class="theory-card">
            <h4 class="card-title"><span class="icon">◆</span> ${sec.title}</h4>
            ${sec.content ? `<p>${sec.content}</p>` : ''}
            ${sec.highlight ? `<div class="theory-highlight">${sec.highlight.replace(/\n/g, '<br>')}</div>` : ''}
          </div>
        `).join('')}

        ${mission.theory.concepts ? `
          <div class="key-concepts-grid">
            ${mission.theory.concepts.map(c => `
              <div class="concept-box">
                <strong>${c.name}</strong>
                <span>${c.desc}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    }

    // Render Lab Tool
    const labContainer = document.getElementById('lab-widget-container');
    const labTitle = document.getElementById('lab-tool-title');
    if (labTitle) {
      if (mission.id === 1) labTitle.textContent = "Hash Chain Guardian Controls";
      else if (mission.id === 2) labTitle.textContent = "Proof of Work Mining Rig";
      else if (mission.id === 3) labTitle.textContent = "Sovereign Wallet & Signature Console";
      else if (mission.id === 4) labTitle.textContent = "P2P Gossip Network Simulator";
      else if (mission.id === 5) labTitle.textContent = "Security Attack Defense Console";
      else if (mission.id === 6) labTitle.textContent = "Smart Contract Runtime & AMM";
      else if (mission.id === 7) labTitle.textContent = "Merkle Tree & State Proof Console";
      else labTitle.textContent = "Chain Explorer Controls";
    }

    if (labContainer && mission.initLab) {
      mission.initLab(labContainer, (state) => {
        this.missionManager.updateState(state);
      });
    }

    // Render Why This Matters Tab
    this.renderWhyThisMatters(mission.id);

    // Update Mission Hint Box dynamically based on level
    const hintText = document.getElementById('mission-hint-text');
    if (hintText) {
      if (mission.id === 2) {
        hintText.textContent = "Open the 🧪 Lab Tool tab → switch to 🌱 PoS mode → stake coins → advance slots until a block reaches 2/3 attestation.";
      } else if (mission.id === 7) {
        hintText.textContent = "Open the 🧪 Lab Tool tab → Build the Merkle Tree → Test avalanche effect and SPV inclusion proofs.";
      } else {
        hintText.textContent = "Click any block card directly on the canvas to open the Tamper Console.";
      }
    }

    // Attention badge on Lab Tool tab for Level 2
    const labTabBtn = document.getElementById('btn-tab-lab');
    const existingDot = document.getElementById('lab-tab-dot');
    if (mission.id === 2 && !localStorage.getItem('lvl2_labOpened')) {
      if (!existingDot && labTabBtn) {
        const dot = document.createElement('span');
        dot.id = 'lab-tab-dot';
        dot.className = 'tab-attention-dot';
        dot.title = 'Open Lab Tool';
        labTabBtn.appendChild(dot);
      }
    } else {
      if (existingDot) existingDot.remove();
    }

    // Initial objectives render
    this.missionManager.renderObjectives();
  }

  renderWhyThisMatters(levelId) {
    const whyContainer = document.getElementById('why-container');
    if (!whyContainer) return;

    const whyData = WHY_IT_MATTERS_CONTENT[levelId] || WHY_IT_MATTERS_CONTENT[1];
    const caseStudy = whyData.caseStudyKey ? REAL_WORLD_CASE_STUDIES[whyData.caseStudyKey] : null;
    const secondaryCaseStudy = whyData.secondaryCaseStudyKey ? REAL_WORLD_CASE_STUDIES[whyData.secondaryCaseStudyKey] : null;

    whyContainer.innerHTML = `
      <div class="theory-hero" style="border-left-color: var(--accent-amber);">
        <span class="chapter-number" style="color: var(--accent-amber);">REAL-WORLD IMPLICATIONS</span>
        <h2 class="theory-title">${whyData.title}</h2>
      </div>

      <!-- Problem Card -->
      <div class="theory-card" style="border-left: 3px solid var(--accent-red); background: rgba(255, 51, 102, 0.06);">
        <h4 class="card-title" style="color: var(--accent-red);"><span class="icon">⚠️</span> ${whyData.problem.title}</h4>
        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5;">${whyData.problem.desc}</p>
      </div>

      <!-- Solution Card -->
      <div class="theory-card" style="border-left: 3px solid var(--accent-green); background: rgba(0, 255, 136, 0.06);">
        <h4 class="card-title" style="color: var(--accent-green);"><span class="icon">🛡️</span> ${whyData.solution.title}</h4>
        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5;">${whyData.solution.desc}</p>
      </div>

      <!-- Real World Adoption Card -->
      <div class="theory-card" style="border-left: 3px solid var(--accent-cyan); background: rgba(0, 240, 255, 0.06);">
        <h4 class="card-title" style="color: var(--accent-cyan);"><span class="icon">🌐</span> ${whyData.realWorldCase.title}</h4>
        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5;">${whyData.realWorldCase.desc}</p>
      </div>

      <!-- Featured Case Study (Bitcoin, Ethereum, Uniswap) -->
      ${caseStudy ? `
        <div class="theory-card" style="background: linear-gradient(145deg, #181c2e, #0e1220); border-color: ${caseStudy.accentColor}; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">${caseStudy.logo}</span>
              <div>
                <strong style="color: #fff; font-size: 12px;">${caseStudy.title}</strong>
                <div style="font-size: 9.5px; color: ${caseStudy.accentColor};">${caseStudy.subtitle}</div>
              </div>
            </div>
            <span class="badge-label" style="background: rgba(255,255,255,0.1); color: #fff; font-size: 8px;">FEATURED SYSTEM</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            ${caseStudy.metrics.map(m => `
              <div style="background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 9.5px;">
                <span style="color: #94a3b8;">${m.label}:</span> <strong style="color: ${caseStudy.accentColor};">${m.value}</strong>
              </div>
            `).join('')}
          </div>

          <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.45; margin-bottom: 8px;">
            ${caseStudy.summary}
          </p>

          <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 10px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px;">
            ${caseStudy.deepDive}
          </div>

          <div style="font-size: 10px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">
            ${caseStudy.takeaways.map(t => `
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span style="color: ${caseStudy.accentColor}; font-weight: bold;">•</span>
                <span>${t}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${secondaryCaseStudy ? `
        <div class="theory-card" style="background: linear-gradient(145deg, #25091a, #14050e); border-color: ${secondaryCaseStudy.accentColor}; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">${secondaryCaseStudy.logo}</span>
              <div>
                <strong style="color: #fff; font-size: 12px;">${secondaryCaseStudy.title}</strong>
                <div style="font-size: 9.5px; color: ${secondaryCaseStudy.accentColor};">${secondaryCaseStudy.subtitle}</div>
              </div>
            </div>
            <span class="badge-label" style="background: rgba(255,255,255,0.1); color: #fff; font-size: 8px;">DEFI PROTOCOL</span>
          </div>

          <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.45; margin-bottom: 8px;">
            ${secondaryCaseStudy.summary}
          </p>

          <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            ${secondaryCaseStudy.deepDive}
          </div>
        </div>
      ` : ''}
    `;
  }
}
