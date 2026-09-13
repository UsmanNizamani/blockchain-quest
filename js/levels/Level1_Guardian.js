import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { Crypto } from '../blockchain/Crypto.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level1_Guardian = {
  id: 1,
  title: "Level 1: Hash Chain Guardian",
  role: "Hash Chain Guardian",
  kpReward: 250,
  subtitle: "Blocks, Hash Pointers, and Tamper-Evidence",
  codexUnlockIds: ["sha256", "avalanche", "block", "hash_pointer", "genesis_block"],

  theory: {
    heroTitle: "Level 1: Hash Chain Guardian",
    sections: [
      {
        title: "The Cryptographic Chain Link",
        content: `A blockchain is an ordered sequence of blocks cryptographically linked together. Every block includes the <strong>previousHash</strong> of the block preceding it in its header. This single reference creates a strict, unalterable historical timeline starting from <strong>Block #0 (The Genesis Block)</strong>.`
      },
      {
        title: "The Tamper-Evident Domino Effect",
        highlight: "Changing one block changes its hash, which breaks the link to the next block. This is tamper-evidence.\n\nBecause Block #2 contains Block #1's hash in its header, changing even a single character in Block #1 changes Hash(B1). Immediately, Block #2's recorded previousHash no longer matches, snapping the cryptographic chain in two."
      },
      {
        title: "The Avalanche Effect & Determinism",
        content: `SHA-256 produces a fixed 64-character hexadecimal digest. Flipping a single bit or adding a space to the input causes an <strong>Avalanche Effect</strong>, randomly flipping approximately 50% of all output bits. This makes guessing inputs mathematically impossible.`
      }
    ],
    concepts: [
      { name: "Genesis Block", desc: "Block #0 with prevHash of 64 zeros" },
      { name: "Previous Hash", desc: "Cryptographic pointer to parent block" },
      { name: "Tamper Evidence", desc: "Immediate mathematical detection of alteration" },
      { name: "Avalanche Effect", desc: "Tiny input change causes massive random output shift" }
    ]
  },

  objectives: [
    {
      id: "lvl1_obj1",
      title: "1. Test the SHA-256 Avalanche Effect",
      desc: "Type into the Cryptographic Playground and observe how changing 1 character flips ~50% of the hash bits.",
      xp: 50,
      completed: false,
      check: (state) => state.hasTestedAvalanche === true
    },
    {
      id: "lvl1_obj2",
      aliasId: "inspect-genesis",
      title: "2. Inspect the Genesis Block (#0)",
      desc: "Click Block #0 to verify its previousHash (all zeros) anchoring the beginning of history.",
      xp: 50,
      completed: false,
      check: (state) => {
        const passed = state.inspectedBlockIndex === 0;
        console.log(`[Objective Check] inspect-genesis check (Block #${state.inspectedBlockIndex}): condition passed = ${passed}`);
        return passed;
      }
    },
    {
      id: "lvl1_obj3",
      title: "3. Simulate Block Tampering",
      desc: "Click Block #1 or #2, modify transaction data, and watch the chain link fracture in red.",
      xp: 75,
      completed: false,
      check: (state) => state.hasTampered === true
    },
    {
      id: "lvl1_obj4",
      title: "4. Restore Chain Integrity",
      desc: "Repair or re-mine the chain until the Chain Integrity health bar reaches 100%.",
      xp: 75,
      completed: false,
      check: (state) => state.hasRestored === true && state.integrity && state.integrity.integrityScore === 100
    }
  ],

  initLab(container, onStateChange) {
    const blockchain = defaultBlockchain;
    let activeSubTab = 'chain'; // 'chain' | 'playground'
    let playgroundText = "Satoshi Nakamoto";
    let playgroundNonce = 0;
    let currentHash = "";
    let previousHashVal = "";
    let avalancheRate = 0;

    const missionState = {
      hasTestedAvalanche: false,
      inspectedBlockIndex: null,
      hasTampered: false,
      hasRestored: false,
      integrity: blockchain.getChainIntegrity()
    };

    function notifyState() {
      missionState.integrity = blockchain.getChainIntegrity();
      onStateChange({ ...missionState });
    }

    let hashFailed = false;

    async function computePlaygroundHash() {
      const payload = playgroundNonce ? `${playgroundText}|${playgroundNonce}` : playgroundText;
      try {
        const newHash = await Crypto.sha256(payload);
        if (!newHash || typeof newHash !== 'string' || newHash.length !== 64) {
          throw new Error('Invalid SHA-256 digest format returned');
        }
        if (previousHashVal && previousHashVal.length === 64) {
          avalancheRate = Crypto.calculateAvalanche(previousHashVal, newHash);
          if (avalancheRate > 20) {
            missionState.hasTestedAvalanche = true;
            notifyState();
          }
        }
        previousHashVal = newHash;
        currentHash = newHash;
        hashFailed = false;
        console.log(`[Hash Playground] SHA-256("${payload}") -> ${newHash}`);
      } catch (err) {
        console.error('[Hash Playground] Hash computation error:', err);
        hashFailed = true;
        currentHash = `⚠️ Hashing Failed: ${err?.message || 'Cryptographic engine error'}`;
      }

      eventBus.emit('INPUT_HASHED', {
        input: playgroundText,
        nonce: playgroundNonce,
        hash: currentHash,
        avalancheRate,
        failed: hashFailed
      });
    }

    computePlaygroundHash();

    // Listen to block inspection and click events from canvas
    const handleBlockInspection = ({ block, index }) => {
      console.log(`[Block Click] Block #${index} inspected | previousHash: ${block?.previousHash}`);
      missionState.inspectedBlockIndex = index;
      missionState.inspectedBlock = block;
      missionState.inspectedPreviousHash = block?.previousHash;
      notifyState();
    };

    eventBus.on('BLOCK_SELECTED', handleBlockInspection);
    eventBus.on('BLOCK_INSPECTED', handleBlockInspection);
    eventBus.on('BLOCK_CLICKED', handleBlockInspection);

    eventBus.on('CHAIN_TAMPERED', () => {
      missionState.hasTampered = true;
      notifyState();
      renderLabUI();
    });

    eventBus.on('CHAIN_REPAIRED', () => {
      missionState.hasRestored = true;
      notifyState();
      renderLabUI();
    });

    eventBus.on('CHAIN_UPDATED', () => {
      notifyState();
      renderLabUI();
    });

    function renderLabUI() {
      const integrity = blockchain.getChainIntegrity();
      const statusColor = integrity.isCompromised ? 'var(--accent-red)' : 'var(--accent-green)';
      const statusText = integrity.isCompromised ? 'COMPROMISED (ATTACK DETECTED)' : 'HEALTHY & VERIFIED';

      container.innerHTML = `
        <!-- Sub-Tab Switcher -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button id="tab-sub-chain" class="hud-btn ${activeSubTab === 'chain' ? 'primary' : ''}" style="justify-content: center; font-size: 11px;">
            🔗 Tampering Demo (Chain)
          </button>
          <button id="tab-sub-playground" class="hud-btn ${activeSubTab === 'playground' ? 'primary' : ''}" style="justify-content: center; font-size: 11px;">
            ⚡ SHA-256 Playground
          </button>
        </div>

        ${activeSubTab === 'chain' ? `
          <!-- BLOCKCHAIN TAMPER LAB -->
          <div class="lab-field-group">
            <div class="lab-field-label">
              <span>CHAIN INTEGRITY HEALTH</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: ${statusColor}; font-family: var(--font-mono);">${integrity.integrityScore}%</strong>
                <button class="btn-explain" data-explain="ch2_integrity_bar" title="Explain Integrity Bar">ℹ️ Explain</button>
              </div>
            </div>
            <div class="meter-bar">
              <div class="meter-fill ${integrity.isCompromised ? 'tampered' : ''}" style="width: ${integrity.integrityScore}%;"></div>
            </div>
            <div style="font-size: 11px; color: ${statusColor}; margin-top: 4px; font-weight: bold;">
              STATUS: ${statusText}
            </div>
          </div>

          <!-- INTERACTIVE TAMPERING DEMO CONSOLE -->
          <div class="theory-card" style="margin-top: 12px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.35);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 0.5px;">BLOCK #1 DATA & TAMPER CONSOLE</span>
              <span id="lab-chain-valid-indicator" style="font-family: var(--font-mono); font-size: 11px; font-weight: bold; color: ${integrity.isCompromised ? 'var(--accent-red)' : 'var(--accent-green)'};">
                ${integrity.isCompromised ? 'Chain Valid: ❌' : 'Chain Valid: ✅'}
              </span>
            </div>
            
            <div class="lab-field-group">
              <label class="lab-field-label" for="lab-tamper-data-input" style="margin-bottom: 4px;">
                <span>Transaction Data Payload</span>
                <span class="badge-label" style="font-size: 9px;">Edit to Corrupt</span>
              </label>
              <input 
                type="text" 
                id="lab-tamper-data-input" 
                class="lab-input" 
                value="${blockchain.chain[1] ? blockchain.chain[1].getSummary() : 'Alice -> Bob: 12.5 BTC'}" 
                placeholder="e.g. Alice -> Bob: 12.5 BTC" 
                style="font-family: var(--font-mono); font-size: 12px;"
              />
            </div>

            <div style="margin-top: 8px;">
              <div style="font-size: 10px; color: #94a3b8; margin-bottom: 2px;">RECALCULATED BLOCK #1 HASH:</div>
              <div id="lab-tamper-hash-val" style="font-family: var(--font-mono); font-size: 10px; word-break: break-all; color: ${integrity.isCompromised ? 'var(--accent-red)' : 'var(--accent-green)'}; padding: 6px 8px; background: rgba(0,0,0,0.5); border-radius: 4px; border: 1px solid var(--border-subtle);">
                ${blockchain.chain[1] ? blockchain.chain[1].hash : ''}
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
              <button type="button" class="hud-btn" id="btn-lab-preset-eve" style="font-size: 10px; padding: 4px 8px;">⚔️ Set: Alice → Eve</button>
              <button type="button" class="hud-btn" id="btn-lab-preset-bob" style="font-size: 10px; padding: 4px 8px;">✓ Restore: Alice → Bob</button>
            </div>
          </div>

          <div class="theory-card" style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 class="card-title" style="margin-bottom: 0;">🛠️ Guardian Control Actions</h4>
              <button class="btn-explain" data-explain="ch2_tamper_console" title="Explain Tampering">ℹ️ Explain</button>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
              Click any block card in the interactive canvas on the left to edit its transaction data and trigger real-time cryptographic fracture.
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button id="btn-quick-tamper" class="action-btn" style="background: rgba(255, 51, 102, 0.15); border: 1px solid var(--accent-red); color: var(--accent-red);">
                <span class="btn-text">⚔️ Tamper Block #1 (Simulate Theft)</span>
                <span class="btn-subtext">Alters transaction data & breaks downstream links</span>
              </button>
              <button id="btn-repair-chain" class="action-btn primary-action" style="background: rgba(0, 255, 136, 0.15); border: 1px solid var(--accent-green); color: var(--accent-green);">
                <span class="btn-text">🛡️ Re-Mine / Repair Chain (PoW)</span>
                <span class="btn-subtext">Recomputes downstream hashes to restore 100% integrity</span>
              </button>
            </div>
          </div>
        ` : `
          <!-- SHA-256 CRYPTOGRAPHIC PLAYGROUND -->
          <div class="lab-field-group">
            <div class="lab-field-label">
              <span>INPUT TEXT (DATA TO HASH)</span>
              <button class="btn-explain" data-explain="ch1_input" title="Explain Input">ℹ️ Explain</button>
            </div>
            <textarea id="playground-input" class="tx-input" rows="3" style="width: 100%; font-family: var(--font-mono); font-size: 12px; resize: vertical;" placeholder="Type anything...">${playgroundText}</textarea>
            <button id="btn-calc-hash" class="action-btn primary-action" style="margin-top: 4px;">Calculate Hash</button>
          </div>

          <div class="lab-field-group" style="margin-top: 10px;">
            <div class="lab-field-label">
              <span>AVALANCHE BIT FLIP DIFFUSION</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span id="avalanche-pct" style="font-family: var(--font-mono); font-weight: bold; color: var(--accent-cyan);">${avalancheRate.toFixed(1)}%</span>
                <button class="btn-explain" data-explain="ch1_avalanche" title="Explain Avalanche">ℹ️ Explain</button>
              </div>
            </div>
            <div class="meter-bar">
              <div id="avalanche-fill" class="meter-fill" style="width: ${Math.min(100, avalancheRate * 2)}%; background: var(--accent-cyan);"></div>
            </div>
          </div>

          <div class="lab-field-group" style="margin-top: 10px;">
            <div class="lab-field-label">
              <span>SHA-256 CRYPTOGRAPHIC DIGEST (64 HEX)</span>
              <button class="btn-explain" data-explain="ch1_output_hash" title="Explain Hash">ℹ️ Explain</button>
            </div>
            <div id="playground-hash" class="hash-display-box" style="background: rgba(0,0,0,0.6); padding: 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; word-break: break-all; color: var(--accent-green); border: 1px solid var(--border-subtle);">
              ${currentHash}
            </div>
          </div>
        `}
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      // Sub-tab switcher
      document.getElementById('tab-sub-chain')?.addEventListener('click', () => {
        activeSubTab = 'chain';
        renderLabUI();
      });
      document.getElementById('tab-sub-playground')?.addEventListener('click', async () => {
        activeSubTab = 'playground';
        renderLabUI();
        await computePlaygroundHash();
        updatePlaygroundDOM();
      });

      // Interactive Lab Tamper Input Handler (4-Stage Pipeline)
      const labDataInput = document.getElementById('lab-tamper-data-input');
      async function handleLabTamper(triggerSource = 'input') {
        if (!labDataInput) return;
        const val = labDataInput.value;

        // STAGE 1: Input Change
        console.log(`[Tamper Demo] Stage 1: Input change detected for Block #1 -> "${val}" (trigger: ${triggerSource})`);

        // STAGE 2: Hash Recalculation
        await blockchain.tamperBlock(1, val);
        const b1 = blockchain.chain[1];
        console.log(`[Tamper Demo] Stage 2: Hash recalculation complete -> Block #1 hash: ${b1.hash}`);

        // STAGE 3: Chain Validation
        const integrity = blockchain.getChainIntegrity();
        const isValid = !integrity.isCompromised;
        console.log(`[Tamper Demo] Stage 3: Chain validation -> ${isValid ? 'Chain Valid: ✅' : 'Chain Valid: ❌'} (Health: ${integrity.integrityScore}%, Broken links: [${integrity.brokenLinks.join(', ')}], Tampered blocks: [${integrity.invalidBlocks.join(', ')}])`);

        missionState.hasTampered = !isValid;
        if (isValid) missionState.hasRestored = true;
        notifyState();

        // STAGE 4: UI & Canvas Update
        const hashValEl = document.getElementById('lab-tamper-hash-val');
        const validIndEl = document.getElementById('lab-chain-valid-indicator');
        if (hashValEl) {
          hashValEl.textContent = b1.hash;
          hashValEl.style.color = isValid ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        if (validIndEl) {
          validIndEl.textContent = isValid ? 'Chain Valid: ✅' : 'Chain Valid: ❌';
          validIndEl.style.color = isValid ? 'var(--accent-green)' : 'var(--accent-red)';
        }

        console.log(`[Tamper Demo] Stage 4: UI & Canvas updated -> Status: ${isValid ? 'Chain Valid: ✅' : 'Chain Valid: ❌'}`);
      }

      labDataInput?.addEventListener('input', () => handleLabTamper('lab-input'));
      labDataInput?.addEventListener('change', () => handleLabTamper('lab-change'));

      document.getElementById('btn-lab-preset-eve')?.addEventListener('click', async () => {
        if (labDataInput) labDataInput.value = "Alice -> Eve";
        await handleLabTamper('preset-eve');
      });

      document.getElementById('btn-lab-preset-bob')?.addEventListener('click', async () => {
        if (labDataInput) labDataInput.value = "Alice -> Bob: 12.5 BTC";
        await handleLabTamper('preset-bob');
      });

      // Quick tamper button
      document.getElementById('btn-quick-tamper')?.addEventListener('click', async () => {
        if (blockchain.chain.length > 1) {
          await blockchain.tamperBlock(1, { tx: "Alice -> Hacker: 50.0 BTC (FORGERY)", summary: "Tampered Transaction" });
          missionState.hasTampered = true;
          notifyState();
          renderLabUI();
          Toast.show("Block #1 Tampered! 🚨", "Hash changed, breaking downstream link to Block #2.", "error");
        }
      });

      // Repair chain button
      document.getElementById('btn-repair-chain')?.addEventListener('click', async () => {
        await blockchain.repairChain();
        missionState.hasRestored = true;
        notifyState();
        renderLabUI();
        Toast.show("Chain Repaired! 🛡️", "All block hashes and links restored to 100% health.", "success");
      });

      function updatePlaygroundDOM() {
        const hashEl = document.getElementById('playground-hash');
        const pctEl = document.getElementById('avalanche-pct');
        const fillEl = document.getElementById('avalanche-fill');
        if (hashEl) {
          hashEl.textContent = currentHash;
          if (hashFailed) {
            hashEl.style.color = 'var(--accent-red)';
            hashEl.style.borderColor = 'var(--accent-red)';
            hashEl.style.background = 'rgba(255, 51, 102, 0.15)';
          } else {
            hashEl.style.color = 'var(--accent-green)';
            hashEl.style.borderColor = 'var(--border-subtle)';
            hashEl.style.background = 'rgba(0, 0, 0, 0.6)';
          }
        }
        if (pctEl) pctEl.textContent = `${avalancheRate.toFixed(1)}%`;
        if (fillEl) fillEl.style.width = `${Math.min(100, avalancheRate * 2)}%`;
      }

      // Playground input listener (keystrokes, change, keyup)
      const textInput = document.getElementById('playground-input');
      const handlePlaygroundInput = async (eventType) => {
        if (!textInput) return;
        playgroundText = textInput.value;
        console.log(`[Hash Playground] ${eventType} event fired -> text: "${playgroundText}" (length: ${playgroundText.length})`);
        await computePlaygroundHash();
        updatePlaygroundDOM();
      };

      textInput?.addEventListener('input', () => handlePlaygroundInput('input'));
      textInput?.addEventListener('change', () => handlePlaygroundInput('change'));
      textInput?.addEventListener('keyup', () => handlePlaygroundInput('keyup'));

      // Calculate hash button listener
      document.getElementById('btn-calc-hash')?.addEventListener('click', () => handlePlaygroundInput('btn-calc-hash'));
    }

    renderLabUI();
    notifyState();
  }
};
