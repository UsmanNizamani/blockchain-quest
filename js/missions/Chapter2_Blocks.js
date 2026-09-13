import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { eventBus } from '../core/EventBus.js';

export const Chapter2_Blocks = {
  id: 2,
  title: "The Genesis & The Chain",
  subtitle: "Chain Guardian — Ledger Immutability & Tamper-Evidence",
  xpReward: 200,

  // Educational Content for Theory Tab
  theory: {
    heroTitle: "Chapter 2: The Genesis & The Chain",
    sections: [
      {
        title: "The Cryptographic Chain Link",
        content: `A blockchain is an ordered sequence of blocks cryptographically linked together. Every block includes the <strong>previousHash</strong> of the block preceding it in its header. This single reference creates a strict, unalterable historical timeline starting from <strong>Block #0 (The Genesis Block)</strong>.`
      },
      {
        title: "The Tamper-Evident Domino Effect",
        highlight: "Changing one block changes its hash, which breaks the link to the next block. This is tamper-evidence.\n\nBecause Block #2 contains Block #1's hash in its header, changing even a single Satoshi in Block #1 changes Hash(B1). Immediately, Block #2's recorded previousHash no longer matches, snapping the cryptographic chain in two."
      },
      {
        title: "Why Can't An Attacker Just Change All Hashes?",
        content: `In a live blockchain with Proof-of-Work, recalculating a single hash requires millions or billions of hash guesses (mining). An attacker who tampers with Block #1 would have to re-mine Block #1, Block #2, Block #3, and all new blocks faster than the entire honest network combined. This is why altering history is computationally infeasible.`
      }
    ],
    concepts: [
      { name: "Genesis Block", desc: "Block #0 with prevHash of 64 zeros" },
      { name: "Previous Hash", desc: "Cryptographic pointer to parent block" },
      { name: "Tamper Evidence", desc: "Immediate mathematical detection of alteration" },
      { name: "Cascade Invalidation", desc: "Modifying block N invalidates all blocks > N" }
    ]
  },

  // Mission Objectives
  objectives: [
    {
      id: "ch2_obj1",
      title: "1. Inspect the Genesis Block",
      desc: "Click Block #0 to inspect its previousHash (all zeros) and initial coinbase reward.",
      xp: 40,
      completed: false,
      check: (state) => {
        return state.inspectedBlockIndex === 0;
      }
    },
    {
      id: "ch2_obj2",
      title: "2. Simulate Attacker Tampering",
      desc: "Click Block #1 or #2, modify its transaction data, and trigger a hash mismatch.",
      xp: 60,
      completed: false,
      check: (state) => {
        return state.hasTampered === true;
      }
    },
    {
      id: "ch2_obj3",
      title: "3. Witness the Broken Chain",
      desc: "Observe the Chain Integrity health bar drop below 80% as links fracture in red.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.integrity && state.integrity.integrityScore < 80;
      }
    },
    {
      id: "ch2_obj4",
      title: "4. Restore Ledger Integrity",
      desc: "Use 'Re-mine Chain' or 'Reset Chain' to return Chain Integrity back to 100%.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.hasRestored === true && state.integrity && state.integrity.integrityScore === 100;
      }
    }
  ],

  // Lab Tool for Chapter 2
  initLab(container, onStateChange) {
    const blockchain = defaultBlockchain;
    let missionState = {
      inspectedBlockIndex: null,
      hasTampered: false,
      hasRestored: false,
      integrity: blockchain.getChainIntegrity()
    };

    function renderLabUI() {
      const integrity = blockchain.getChainIntegrity();
      missionState.integrity = integrity;

      const statusColor = integrity.isCompromised ? 'var(--accent-red)' : 'var(--accent-green)';
      const statusText = integrity.isCompromised ? 'COMPROMISED (ATTACK DETECTED)' : 'HEALTHY & VERIFIED';

      container.innerHTML = `
        <div class="lab-field-group">
          <div class="lab-field-label">
            <span>CHAIN INTEGRITY STATUS</span>
            <strong style="color: ${statusColor}; font-family: var(--font-mono);">${integrity.integrityScore}%</strong>
          </div>
          <div class="avalanche-bar-track" style="height: 10px;">
            <div class="avalanche-bar-fill" style="width: ${integrity.integrityScore}%; background: ${statusColor};"></div>
          </div>
          <span style="font-size: 11px; font-family: var(--font-mono); color: ${statusColor}; margin-top: 4px;">
            ${statusText}
          </span>
        </div>

        <div class="theory-card" style="margin-top: 10px;">
          <h4 class="card-title" style="font-size: 13px;">🛡️ Chain Guardian Quick Controls</h4>
          <p style="font-size: 12px; margin-bottom: 8px;">
            Click any block card directly on the canvas to edit its transactions, or trigger quick simulation scenarios below:
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button id="btn-quick-tamper" class="action-btn" style="background: rgba(255, 51, 102, 0.15); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 12px;">
              <span class="btn-text">⚔️ Attacker Hack: Corrupt Block #1</span>
              <span class="btn-subtext">Alter transaction to: Alice -> Hacker (999 BTC)</span>
            </button>
            <button id="btn-quick-remine" class="action-btn" style="background: rgba(0, 240, 255, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 12px;">
              <span class="btn-text">⛏️ Re-mine Chain (Recompute Proofs)</span>
              <span class="btn-subtext">Re-calculate nonces and repair broken hashes</span>
            </button>
            <button id="btn-quick-reset" class="hud-btn" style="justify-content: center;">
              🔄 Reset Chain to Genesis
            </button>
          </div>
        </div>

        <div class="hint-box" style="margin-top: 10px;">
          <span class="hint-icon">💡</span>
          <div class="hint-text">
            <strong>Key Insight:</strong> When you corrupt Block #1, notice that Block #1's hash changes, causing Block #2's <code>previousHash</code> pointer to mismatch. The red severed link visually proves the integrity breach!
          </div>
        </div>
      `;

      // Event listeners
      container.querySelector('#btn-quick-tamper')?.addEventListener('click', async () => {
        await blockchain.tamperBlock(1, {
          tx: "Alice -> Hacker: 999 BTC (FORGED)",
          summary: "Alice -> Hacker: 999 BTC (FORGED)"
        });
        missionState.hasTampered = true;
        renderLabUI();
        if (onStateChange) onStateChange(missionState);
      });

      container.querySelector('#btn-quick-remine')?.addEventListener('click', async () => {
        await blockchain.reMineFrom(1);
        missionState.hasRestored = true;
        renderLabUI();
        if (onStateChange) onStateChange(missionState);
      });

      container.querySelector('#btn-quick-reset')?.addEventListener('click', () => {
        blockchain.resetChain();
        missionState.hasRestored = true;
        renderLabUI();
        if (onStateChange) onStateChange(missionState);
      });
    }

    // Subscribe to blockchain events
    eventBus.on('CHAIN_TAMPERED', () => {
      missionState.hasTampered = true;
      renderLabUI();
      if (onStateChange) onStateChange(missionState);
    });

    eventBus.on('CHAIN_UPDATED', () => {
      renderLabUI();
      if (onStateChange) onStateChange(missionState);
    });

    const handleInspect = ({ index }) => {
      missionState.inspectedBlockIndex = index;
      if (onStateChange) onStateChange(missionState);
    };
    eventBus.on('BLOCK_INSPECTED', handleInspect);
    eventBus.on('BLOCK_CLICKED', handleInspect);
    eventBus.on('BLOCK_SELECTED', handleInspect);

    renderLabUI();
  }
};
