import { nodeNetwork } from '../blockchain/NodeNetwork.js';
import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level4_Node = {
  id: 4,
  title: "Level 4: Node Operator",
  role: "P2P Node Operator",
  kpReward: 250,
  subtitle: "Peer-to-Peer Gossip Mesh & Zero-Trust Verification",
  codexUnlockIds: ["p2p_network", "byzantine_fault"],

  theory: {
    heroTitle: "Level 4: The Gossip Web & Independent Verification",
    sections: [
      {
        title: "No Central Server, No Single Point of Failure",
        content: `In Web2, a bank or cloud server decides whether your payment is allowed. In Web3, there is no master server. Instead, transactions are broadcast across a <strong>Peer-to-Peer (P2P) Gossip Network</strong> to thousands of independent validator nodes.`
      },
      {
        title: "The Four Invariant Checks",
        highlight: "Every node verifies independently. An attacker can't fool the network because honest nodes outnumber malicious ones.\n\nEach node executes 4 rigorous mathematical and state checks before passing a transaction into its mempool:\n1. Signature Valid: Proves ownership via public key.\n2. Sufficient Balance: Prevents overdrafts.\n3. Nonce Correct: Enforces strict order and blocks replay attacks.\n4. No Double-Spend: Verifies the same coins haven't been pledged twice."
      },
      {
        title: "Why Attackers Cannot Cheat",
        content: `If a rogue actor creates a counterfeit transaction with a forged signature or double-spent coins, they cannot force the network to accept it. Honest nodes independently run the verification algorithms, detect the invalid check, and reject the transaction with a hard mathematical veto.`
      }
    ],
    concepts: [
      { name: "P2P Gossip Protocol", desc: "Data spreads exponentially like rumors between peers" },
      { name: "Independent Verification", desc: "Don't Trust, Verify: Every node checks all rules" },
      { name: "Zero-Trust Consensus", desc: "Decisions made via mathematical invariant enforcement" },
      { name: "Byzantine Fault Tolerance", desc: "Resilience against faulty or malicious actors" }
    ]
  },

  objectives: [
    {
      id: "lvl4_obj1",
      title: "1. Broadcast an Honest Valid Transaction",
      desc: "Broadcast an honest transaction and watch all 4 nodes independently approve it (4/4).",
      xp: 75,
      completed: false,
      check: (state) => state.hasApprovedTx === true
    },
    {
      id: "lvl4_obj2",
      title: "2. Simulate a Forged Signature Attack",
      desc: "Select the 'Forged Signature' attack scenario and watch nodes reject it at Check 1.",
      xp: 85,
      completed: false,
      check: (state) => state.hasTestedForgedSig === true
    },
    {
      id: "lvl4_obj3",
      title: "3. Simulate a Double-Spend Conflict",
      desc: "Select the 'Double-Spend' attack scenario and observe nodes catching the conflict at Check 4.",
      xp: 90,
      completed: false,
      check: (state) => state.hasTestedDoubleSpend === true
    }
  ],

  _unsubs: [],

  initLab(container, onStateChange) {
    const network = nodeNetwork;
    const wallet = playerWallet;

    if (this._unsubs && this._unsubs.length) {
      this._unsubs.forEach(unsub => typeof unsub === 'function' && unsub());
    }
    this._unsubs = [];

    const missionState = {
      hasApprovedTx: false,
      hasTestedForgedSig: false,
      hasTestedDoubleSpend: false,
      lastConsensus: null,
      level4Step: 1
    };

    let selectedScenario = 'VALID';
    let currentBroadcastId = 0;

    function notifyState() {
      onStateChange({ ...missionState });
    }

    // Reactive listeners for node mesh updates
    this._unsubs.push(eventBus.on('NODE_STATUS_CHANGED', ({ node }) => {
      renderLabUI();
    }));

    this._unsubs.push(eventBus.on('NODE_CHECK_PROGRESS', ({ node, checkKey, pass }) => {
      renderLabUI();
      console.log('[level4:node]', node.id, checkKey, pass ? 'pass' : 'fail');
    }));

    this._unsubs.push(eventBus.on('NODE_VERIFIED', ({ node, allPass }) => {
      renderLabUI();
      console.log('[level4:node]', node.id, 'verified →', allPass ? 'approved' : 'rejected');
    }));

    const onBroadcastComplete = (summary) => {
      console.log('[level4:broadcast] complete', summary);
      const { approvedCount, rejectedCount, consensusApproved, attackScenario, watchdog } = summary;

      missionState.lastConsensus = { approvedCount, rejectedCount, consensusApproved, attackScenario, watchdog };
      if (attackScenario === 'VALID' && consensusApproved) {
        missionState.hasApprovedTx = true;
      } else if (attackScenario === 'FORGED_SIGNATURE' && !consensusApproved) {
        missionState.hasTestedForgedSig = true;
      } else if (attackScenario === 'DOUBLE_SPEND' && !consensusApproved) {
        missionState.hasTestedDoubleSpend = true;
      }

      if (missionState.level4Step < 2) {
        missionState.level4Step = 2;
      }

      notifyState();
      renderLabUI();

      if (watchdog) {
        Toast.show("Broadcast Timeout", "Broadcast timed out. Click Retry.", "error");
      } else {
        eventBus.emit('SHOW_CONSENSUS_MODAL', {
          approvedCount,
          rejectedCount,
          consensusApproved,
          attackScenario
        });
      }
    };

    this._unsubs.push(eventBus.on('CONSENSUS_COMPLETED', (summary) => {
      console.log('[level4:consensus]', summary);
      onBroadcastComplete(summary);
    }));

    function renderLabUI() {
      container.innerHTML = `
        <div class="lab-field-group">
          <div class="lab-field-label">
            <span>SELECT TRANSACTION SCENARIO</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 9px;">P2P SIMULATOR</span>
              <button class="btn-explain" data-explain="ch3_node_checks" title="Explain Checks">ℹ️ Explain</button>
            </div>
          </div>
          <select id="select-network-scenario" class="chapter-dropdown" style="background: var(--bg-darkest); border: 1px solid var(--border-medium); padding: 8px 10px; border-radius: 6px; width: 100%; color: #fff; margin-top: 4px; font-size: 11px;">
            <option value="VALID" ${selectedScenario === 'VALID' ? 'selected' : ''}>✅ Honest Valid Transaction (Normal Transfer)</option>
            <option value="FORGED_SIGNATURE" ${selectedScenario === 'FORGED_SIGNATURE' ? 'selected' : ''}>⚔️ Attack: Forged Digital Signature</option>
            <option value="INSUFFICIENT_FUNDS" ${selectedScenario === 'INSUFFICIENT_FUNDS' ? 'selected' : ''}>⚔️ Attack: Insufficient Balance (Overdraft)</option>
            <option value="BAD_NONCE" ${selectedScenario === 'BAD_NONCE' ? 'selected' : ''}>⚔️ Attack: Invalid / Replayed Nonce</option>
            <option value="DOUBLE_SPEND" ${selectedScenario === 'DOUBLE_SPEND' ? 'selected' : ''}>⚔️ Attack: Competing Double-Spend</option>
          </select>
        </div>

        <div class="theory-card" style="margin-top: 10px; border-color: var(--accent-cyan); background: linear-gradient(145deg, #0e1d33, #091322);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: var(--accent-cyan); font-size: 11px;">📡 P2P BROADCAST CONTROLS</strong>
            <button class="btn-explain" data-explain="ch3_broadcast" title="Explain Broadcast">ℹ️ Explain</button>
          </div>

          <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
            When you click broadcast, an unconfirmed transaction packet flies across the gossip mesh to 4 independent validator nodes. Each node tests all 4 invariants.
          </p>

          <button id="btn-broadcast-tx" class="action-btn primary-action" style="width: 100%; justify-content: center;" ${network.isBroadcasting ? 'disabled' : ''}>
            <span class="btn-text">${network.isBroadcasting ? '⏳ Gossip In Progress...' : (missionState.lastConsensus ? '✅ Gossip Complete (Click to Re-run)' : '🚀 Gossip Broadcast to 4 Nodes')}</span>
            <span class="btn-subtext">${selectedScenario === 'VALID' ? 'Broadcast honest packet' : 'Test network defense against attack'}</span>
          </button>

          ${missionState.lastConsensus?.watchdog ? `
            <button id="btn-retry-broadcast" class="action-btn" style="width: 100%; margin-top: 8px; justify-content: center; background: #dc2626; color: #fff;">
              <span class="btn-text">🔄 Retry Broadcast</span>
            </button>
          ` : ''}
        </div>

        <!-- Node Status Grid Preview -->
        <div class="theory-card" style="margin-top: 10px; background: rgba(0,0,0,0.3);">
          <div style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">
            🖥️ Validator Nodes Mesh Status:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            ${network.nodes.map(n => `
              <div style="background: rgba(255,255,255,0.03); padding: 6px 8px; border-radius: 4px; border-left: 3px solid ${n.status === 'approved' ? 'var(--accent-green)' : (n.status === 'rejected' || n.status === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)')};">
                <div style="font-size: 10px; font-weight: bold; color: #fff;">${n.name}</div>
                <div style="font-size: 9px; color: ${n.status === 'approved' ? 'var(--accent-green)' : (n.status === 'rejected' || n.status === 'error' ? 'var(--accent-red)' : '#94a3b8')}; text-transform: uppercase;">
                  ${n.status}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      const select = document.getElementById('select-network-scenario');
      select?.addEventListener('change', (e) => {
        selectedScenario = e.target.value;
        network.resetAll();
        renderLabUI();
      });

      document.getElementById('btn-broadcast-tx')?.addEventListener('click', () => {
        currentBroadcastId++;
        console.log('[level4:broadcast] start', selectedScenario);

        const dummyTx = {
          from: wallet.address,
          to: NPC_MERCHANTS[0].address,
          toName: NPC_MERCHANTS[0].name,
          amount: selectedScenario === 'INSUFFICIENT_FUNDS' ? 9999.0 : 15.0,
          nonce: selectedScenario === 'BAD_NONCE' ? wallet.nonce + 99 : wallet.nonce,
          signature: selectedScenario === 'FORGED_SIGNATURE' ? '0xDEADBEEF_FORGED_SIGNATURE_BAD_HASH_99999' : '0xVALID_ECDSA_SIG_f0a9bc4389'
        };

        network.broadcastTransaction(dummyTx, selectedScenario);
        renderLabUI();
      });

      document.getElementById('btn-retry-broadcast')?.addEventListener('click', () => {
        network.resetAll();
        renderLabUI();
      });
    }

    renderLabUI();
    notifyState();
  }
};
