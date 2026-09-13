import { nodeNetwork } from '../blockchain/NodeNetwork.js';
import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { eventBus } from '../core/EventBus.js';

export const Chapter3_Network = {
  id: 3,
  title: "The Gossip Web & Distributed Consensus",
  subtitle: "Independent Node Verification & Byzantine Fault Tolerance",
  xpReward: 300,

  theory: {
    heroTitle: "Chapter 3: The Gossip Web & Independent Verification",
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
      { name: "Double-Spend Prevention", desc: "Digital scarcity enforced without central banks" },
      { name: "Byzantine Fault Tolerance", desc: "Resilience against faulty or malicious actors" }
    ]
  },

  objectives: [
    {
      id: "ch3_obj1",
      title: "1. Broadcast a Valid Transaction",
      desc: "Broadcast an honest transaction and watch all 4 nodes independently approve it (4/4).",
      xp: 80,
      completed: false,
      check: (state) => {
        return state.hasApprovedTx === true;
      }
    },
    {
      id: "ch3_obj2",
      title: "2. Simulate a Forged Signature Attack",
      desc: "Select the 'Forged Signature' attack scenario and watch nodes reject it at Check 1.",
      xp: 80,
      completed: false,
      check: (state) => {
        return state.hasTestedForgedSig === true;
      }
    },
    {
      id: "ch3_obj3",
      title: "3. Simulate a Double-Spend Attack",
      desc: "Select the 'Double-Spend' attack scenario and observe nodes catching the conflict at Check 4.",
      xp: 80,
      completed: false,
      check: (state) => {
        return state.hasTestedDoubleSpend === true;
      }
    }
  ],

  initLab(container, onStateChange) {
    const network = nodeNetwork;
    const wallet = playerWallet;

    const missionState = {
      hasApprovedTx: false,
      hasTestedForgedSig: false,
      hasTestedDoubleSpend: false,
      lastConsensus: null
    };

    let selectedScenario = 'VALID';

    function renderLabUI() {
      container.innerHTML = `
        <div class="lab-field-group">
          <div class="lab-field-label">
            <span>SELECT TRANSACTION SCENARIO</span>
            <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan);">P2P SIMULATOR</span>
          </div>
          <select id="select-network-scenario" class="chapter-dropdown" style="background: var(--bg-darkest); border: 1px solid var(--border-medium); padding: 8px 10px; border-radius: 6px; width: 100%; color: #fff; margin-top: 4px;">
            <option value="VALID" ${selectedScenario === 'VALID' ? 'selected' : ''}>✅ Honest Valid Transaction (Normal Transfer)</option>
            <option value="FORGED_SIGNATURE" ${selectedScenario === 'FORGED_SIGNATURE' ? 'selected' : ''}>⚔️ Attack: Forged Digital Signature</option>
            <option value="INSUFFICIENT_FUNDS" ${selectedScenario === 'INSUFFICIENT_FUNDS' ? 'selected' : ''}>⚔️ Attack: Insufficient Balance (Overdraft)</option>
            <option value="BAD_NONCE" ${selectedScenario === 'BAD_NONCE' ? 'selected' : ''}>⚔️ Attack: Invalid / Replayed Nonce</option>
            <option value="DOUBLE_SPEND" ${selectedScenario === 'DOUBLE_SPEND' ? 'selected' : ''}>⚔️ Attack: Competing Double-Spend</option>
          </select>
        </div>

        <div class="theory-card" style="margin-top: 10px; border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--accent-cyan); font-size: 13px;">📡 P2P BROADCAST CONTROLS</strong>
            <span id="broadcast-status-pill" class="badge-label" style="background: ${network.isBroadcasting ? 'rgba(255, 183, 3, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${network.isBroadcasting ? 'var(--accent-amber)' : 'var(--text-secondary)'};">
              ${network.isBroadcasting ? 'BROADCASTING...' : 'NETWORK READY'}
            </span>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px; line-height: 1.5;">
            Broadcast a transaction across the 4 independent validator nodes to watch each node test <strong>Signature</strong>, <strong>Balance</strong>, <strong>Nonce</strong>, and <strong>Double-Spend</strong> in sequence!
          </div>

          <button id="btn-broadcast-tx" class="action-btn primary-action" style="margin-top: 12px;" ${network.isBroadcasting ? 'disabled' : ''}>
            <span class="btn-text">📡 Broadcast to Node Network</span>
            <span class="btn-subtext">Send transaction packets to 4 independent validators</span>
          </button>
        </div>

        <!-- Consensus Scoreboard -->
        <div class="theory-card" style="margin-top: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <strong style="font-size: 12px; color: #fff;">P2P CONSENSUS TALLY</strong>
            <span id="consensus-verdict-badge" style="font-size: 11px; font-weight: bold; color: var(--text-muted);">
              Awaiting Broadcast
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            <div class="concept-box" style="border-left: 3px solid var(--accent-green);">
              <strong style="color: var(--accent-green);">APPROVED NODES</strong>
              <span id="tally-approved" style="font-size: 16px; font-weight: bold; color: #fff;">0 / 4</span>
            </div>
            <div class="concept-box" style="border-left: 3px solid var(--accent-red);">
              <strong style="color: var(--accent-red);">REJECTED NODES</strong>
              <span id="tally-rejected" style="font-size: 16px; font-weight: bold; color: #fff;">0 / 4</span>
            </div>
          </div>
        </div>

        <!-- 4 Node Verification Checklist Status -->
        <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
          ${network.nodes.map(node => `
            <div class="node-lab-card" style="background: var(--bg-darkest); border: 1px solid ${node.status === 'approved' ? 'var(--accent-green)' : node.status === 'rejected' ? 'var(--accent-red)' : 'var(--border-subtle)'}; border-radius: 6px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #fff; font-size: 12px;">${node.avatar} ${node.name}</strong>
                <span class="badge-label" style="font-size: 9px; font-weight: bold; background: ${node.status === 'approved' ? 'rgba(0, 255, 136, 0.2)' : node.status === 'rejected' ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${node.status === 'approved' ? 'var(--accent-green)' : node.status === 'rejected' ? 'var(--accent-red)' : 'var(--text-muted)'};">
                  ${node.status.toUpperCase()}
                </span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; font-family: var(--font-mono); margin-top: 6px;">
                <div style="color: ${node.checks.sig.status === 'pass' ? 'var(--accent-green)' : node.checks.sig.status === 'fail' ? 'var(--accent-red)' : '#64748b'};">
                  ${node.checks.sig.status === 'pass' ? '✓' : node.checks.sig.status === 'fail' ? '✕' : '·'} Signature
                </div>
                <div style="color: ${node.checks.balance.status === 'pass' ? 'var(--accent-green)' : node.checks.balance.status === 'fail' ? 'var(--accent-red)' : '#64748b'};">
                  ${node.checks.balance.status === 'pass' ? '✓' : node.checks.balance.status === 'fail' ? '✕' : '·'} Balance
                </div>
                <div style="color: ${node.checks.nonce.status === 'pass' ? 'var(--accent-green)' : node.checks.nonce.status === 'fail' ? 'var(--accent-red)' : '#64748b'};">
                  ${node.checks.nonce.status === 'pass' ? '✓' : node.checks.nonce.status === 'fail' ? '✕' : '·'} Nonce
                </div>
                <div style="color: ${node.checks.doubleSpend.status === 'pass' ? 'var(--accent-green)' : node.checks.doubleSpend.status === 'fail' ? 'var(--accent-red)' : '#64748b'};">
                  ${node.checks.doubleSpend.status === 'pass' ? '✓' : node.checks.doubleSpend.status === 'fail' ? '✕' : '·'} No Dbl-Spend
                </div>
              </div>
              ${node.failureReason ? `
                <div style="font-size: 10px; color: var(--accent-red); margin-top: 4px; font-family: var(--font-mono);">
                  ⚠️ ${node.failureReason}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;

      // Select scenario
      container.querySelector('#select-network-scenario')?.addEventListener('change', (e) => {
        selectedScenario = e.target.value;
      });

      // Broadcast button
      container.querySelector('#btn-broadcast-tx')?.addEventListener('click', () => {
        const dummyTx = {
          from: wallet.address,
          to: NPC_MERCHANTS[0].address,
          toName: NPC_MERCHANTS[0].name,
          amount: 25.0,
          nonce: wallet.nonce + 1,
          timestamp: Date.now()
        };

        network.broadcastTransaction(dummyTx, selectedScenario);
        renderLabUI();
      });
    }

    // Subscribe to network events
    eventBus.on('NODE_CHECK_PROGRESS', () => renderLabUI());
    eventBus.on('NODE_VERIFIED', () => renderLabUI());

    eventBus.on('CONSENSUS_COMPLETED', ({ approvedCount, rejectedCount, consensusApproved, attackScenario }) => {
      if (attackScenario === 'VALID' && consensusApproved) {
        missionState.hasApprovedTx = true;
      } else if (attackScenario === 'FORGED_SIGNATURE' && !consensusApproved) {
        missionState.hasTestedForgedSig = true;
      } else if (attackScenario === 'DOUBLE_SPEND' && !consensusApproved) {
        missionState.hasTestedDoubleSpend = true;
      }

      missionState.lastConsensus = { approvedCount, rejectedCount, consensusApproved };
      if (onStateChange) onStateChange(missionState);

      renderLabUI();

      // Show Educational Consensus Modal
      eventBus.emit('SHOW_CONSENSUS_MODAL', {
        approvedCount,
        rejectedCount,
        consensusApproved,
        attackScenario
      });
    });

    renderLabUI();
  }
};
