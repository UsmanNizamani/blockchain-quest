import { Crypto } from '../blockchain/Crypto.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export async function sha256(data) {
  return await Crypto.sha256(data);
}

/**
 * Build a binary Merkle tree from an array of transaction objects or hashes.
 * Odd-node convention: if a level has an odd number of nodes, the unpaired
 * final node is carried forward to the next level unchanged without duplicate hashing.
 *
 * @param {Array<Object|string>} transactions
 * @returns {Promise<{ levels: string[][], root: string, valid: boolean }>}
 */
export async function buildMerkleTree(transactions) {
  if (!transactions || transactions.length === 0) {
    return { levels: [[]], root: '', valid: true };
  }

  // Generate leaf hashes from transactions
  const leaves = await Promise.all(
    transactions.map(async (tx) => {
      if (typeof tx === 'string') return tx;
      if (tx.hash) return tx.hash;
      return await Crypto.sha256(JSON.stringify(tx));
    })
  );

  const levels = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(await Crypto.sha256(current[i] + current[i + 1]));
      } else {
        // Odd-node convention: carry unpaired node forward to parent level
        next.push(current[i]);
      }
    }
    levels.push(next);
    current = next;
  }

  return {
    levels,
    root: current[0] || '',
    valid: true
  };
}

/**
 * Generate cryptographic Merkle audit path for a given leaf index.
 * Sibling hashes are tagged with 'left' or 'right' indicating their position
 * relative to the walking node.
 *
 * @param {{ levels: string[][], root: string }} tree
 * @param {number} leafIndex
 * @returns {Array<{ hash: string, position: 'left'|'right' }>}
 */
export function generateMerkleProof(tree, leafIndex) {
  if (!tree || !tree.levels || tree.levels.length === 0) return [];
  const path = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.levels.length - 1; level++) {
    const nodes = tree.levels[level];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < nodes.length) {
      path.push({
        hash: nodes[siblingIdx],
        position: idx % 2 === 0 ? 'right' : 'left'
      });
    }
    idx = Math.floor(idx / 2);
  }

  return path;
}

/**
 * Verify Merkle inclusion proof against an expected block root hash.
 * Walks from leaf to root combining hashes pairwise.
 *
 * @param {string} leafHash
 * @param {Array<{ hash: string, position: 'left'|'right' }>} proof
 * @param {string} expectedRoot
 * @returns {Promise<boolean>}
 */
export async function verifyMerkleProof(leafHash, proof, expectedRoot) {
  let current = leafHash;
  for (const step of proof) {
    current = step.position === 'right'
      ? await Crypto.sha256(current + step.hash)
      : await Crypto.sha256(step.hash + current);
  }
  return current === expectedRoot;
}

export const Level7_Merkle = {
  id: 7,
  title: "Level 7: Merkle Trees & State Proofs",
  role: "Cryptographic Proof Architect",
  kpReward: 300,
  subtitle: "Pairwise Hash Trees, Sibling Proofs, and SPV Light Clients",
  codexUnlockIds: ["merkle_trees", "spv_light_clients", "merkle_proofs"],

  theory: {
    heroTitle: "Level 7: Cryptographic Merkle Trees & State Proofs",
    sections: [
      {
        title: "The Pairwise Aggregation Invariant",
        content: `Blockchains aggregate thousands of transactions into a single 32-byte hash called the <strong>Merkle Root</strong>. Instead of hashing all transactions in a flat linear list, transactions are hashed into leaf nodes and combined pairwise layer-by-layer into a balanced binary tree.`
      },
      {
        title: "The Avalanche Invariant & Tamper-Evidence",
        highlight: "Any modification to even a single transaction cascades exponentially up the tree.\n\nChanging 1 cent or 1 bit in a transaction completely randomizes its leaf hash, its parent hash, and the top-level Merkle root. A block header containing the Merkle root cryptographically commits to all transactions simultaneously."
      },
      {
        title: "Simplified Payment Verification (SPV) & O(log N) Proofs",
        content: `A smartphone or light client does not need to download the full 600 GB blockchain to verify that their payment succeeded. They only download 80-byte block headers and request a <strong>Merkle Proof</strong>: the logarithmic ($O(\\log N)$) chain of sibling hashes from the transaction leaf to the verified block root.`
      },
      {
        title: "Real-World Adoption",
        content: `<strong>Bitcoin:</strong> Merkle trees commit transactions into block headers (Satoshi Nakamoto whitepaper Section 8).\n\n<strong>Ethereum:</strong> Modified Merkle Patricia Tries commit account balances, contract storage, and transaction receipts (stateRoot, transactionsRoot, receiptsRoot).\n\n<strong>Zero-Knowledge Rollups:</strong> ZK-rollups (Arbitrum, zkSync, Starknet) bundle 100,000 off-chain transfers into a single Merkle root verified on Ethereum Layer-1 with constant gas.`
      }
    ],
    concepts: [
      { name: "Merkle Root", desc: "Single top-level cryptographic summary anchoring all transactions" },
      { name: "Audit Path (Proof)", desc: "Logarithmic sibling hashes proving inclusion without full block data" },
      { name: "SPV Light Client", desc: "Node verifying transactions using block headers + proofs in milliseconds" },
      { name: "Avalanche Cascade", desc: "1-bit alteration flips intermediate nodes and radically changes the root" }
    ]
  },

  objectives: [
    {
      id: "lvl7_obj1",
      title: "1. Build a Merkle Tree",
      desc: "Hash 4 transactions pairwise and combine to a single Merkle root. Follow the hash flow.",
      xp: 50,
      completed: false,
      check: (state) => state.hasBuiltMerkleTree === true
    },
    {
      id: "lvl7_obj2",
      title: "2. Witness the Avalanche Effect",
      desc: "Tamper with one transaction and watch the Merkle root change completely — even a single character flip.",
      xp: 50,
      completed: false,
      check: (state) => state.hasWitnessedMerkleAvalanche === true
    },
    {
      id: "lvl7_obj3",
      title: "3. Prove Inclusion with a Merkle Proof",
      desc: "Verify that Tx #3 is in the block using only 2 sibling hashes instead of all 4 transactions. This is how light clients work.",
      xp: 65,
      completed: false,
      check: (state) => state.hasVerifiedMerkleProof === true
    },
    {
      id: "lvl7_obj4",
      title: "4. Reject a Forged Proof",
      desc: "Attempt to verify a Merkle proof for a transaction that was never in the block. Watch verification fail.",
      xp: 65,
      completed: false,
      check: (state) => state.hasRejectedForgedProof === true
    },
    {
      id: "lvl7_obj5",
      title: "5. Compare Full Block vs SPV",
      desc: "See the bandwidth savings — 8 transactions verified by downloading 1 hash per level instead of the full block.",
      xp: 70,
      completed: false,
      check: (state) => state.hasComparedFullVsSPV === true
    }
  ],

  initLab(container, onStateChange = () => {}) {
    if (typeof window !== 'undefined' && Array.isArray(window._level7_unsubs)) {
      window._level7_unsubs.forEach(unsub => {
        try { unsub && unsub(); } catch (e) { /* ignore */ }
      });
    }
    if (typeof window !== 'undefined') {
      window._level7_unsubs = [];
    }
    const _unsubs = (typeof window !== 'undefined') ? window._level7_unsubs : [];

    const BASELINE_TXS = [
      { id: 0, from: '0xAlice894a', to: '0xBob51bf', amount: 1.0 },
      { id: 1, from: '0xCharlie23', to: '0xDavid77', amount: 2.5 },
      { id: 2, from: '0xElena901a', to: '0xFiona33', amount: 0.7 },
      { id: 3, from: '0xGeorge44b', to: '0xHannah8', amount: 4.2 }
    ];

    let transactions = JSON.parse(JSON.stringify(BASELINE_TXS));
    let tree = null;
    let isBuilding = false;
    let isTampered = false;
    let tamperedTxId = null;
    let previousRoot = null;
    let selectedProofLeaf = 2; // Default Tx #3
    let currentProof = null;
    let proofVerificationState = null;
    let spvSelectedN = 8;

    const missionState = {
      hasBuiltMerkleTree: false,
      hasWitnessedMerkleAvalanche: false,
      hasVerifiedMerkleProof: false,
      hasRejectedForgedProof: false,
      hasComparedFullVsSPV: false
    };

    function notifyState() {
      if (typeof onStateChange === 'function') {
        onStateChange({ ...missionState });
      }
    }

    async function refreshLeafHashes() {
      for (const tx of transactions) {
        tx.hash = await Crypto.sha256(JSON.stringify({
          id: tx.id,
          from: tx.from,
          to: tx.to,
          amount: tx.amount
        }));
      }
    }

    refreshLeafHashes().then(() => {
      renderLabUI();
    });

    async function handleBuildTree(animate = true) {
      if (isBuilding) return;
      isBuilding = true;
      renderLabUI();

      await refreshLeafHashes();
      const newTree = await buildMerkleTree(transactions);

      if (animate && (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        await new Promise(r => setTimeout(r, 250));
      }

      tree = newTree;
      isBuilding = false;
      missionState.hasBuiltMerkleTree = true;
      notifyState();

      eventBus.emit('MERKLE_TREE_BUILT', { root: tree.root });
      Toast.show("Merkle Tree Built! 🌳", "Root: " + tree.root.substring(0, 16) + "...", 'success', 3000);

      if (tree) {
        currentProof = generateMerkleProof(tree, selectedProofLeaf);
      }
      renderLabUI();
    }

    async function handleTamperTx(txId) {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;

      const oldRoot = tree ? tree.root : 'None';
      previousRoot = oldRoot;

      tx.amount = Number((tx.amount * 10).toFixed(2));
      isTampered = true;
      tamperedTxId = txId;

      await refreshLeafHashes();
      tree = await buildMerkleTree(transactions);

      missionState.hasWitnessedMerkleAvalanche = true;
      notifyState();

      eventBus.emit('MERKLE_TX_TAMPERED', {
        txId,
        oldRoot,
        newRoot: tree.root
      });

      Toast.show("Avalanche Triggered! ⚡", "Tx #" + (txId + 1) + " altered! Root changed completely.", 'warning', 4000);
      proofVerificationState = null;
      if (tree) {
        currentProof = generateMerkleProof(tree, selectedProofLeaf);
      }
      renderLabUI();
    }

    function handleResetTransactions() {
      transactions = JSON.parse(JSON.stringify(BASELINE_TXS));
      isTampered = false;
      tamperedTxId = null;
      previousRoot = null;
      tree = null;
      currentProof = null;
      proofVerificationState = null;

      refreshLeafHashes().then(() => {
        Toast.show("Transactions Reset 🔄", "Restored baseline transaction pool.", 'info', 2500);
        renderLabUI();
      });
    }

    function handleSelectProofLeaf(leafIdx) {
      selectedProofLeaf = leafIdx;
      proofVerificationState = null;
      if (tree) {
        currentProof = generateMerkleProof(tree, selectedProofLeaf);
        eventBus.emit('MERKLE_PROOF_GENERATED', {
          leafIndex: selectedProofLeaf,
          path: currentProof
        });
      }
      renderLabUI();
    }

    async function handleVerifyProof(forceForged = false) {
      if (!tree) {
        await handleBuildTree(false);
      }

      const leafHash = transactions[selectedProofLeaf].hash;
      let proofToTest = generateMerkleProof(tree, selectedProofLeaf);

      let isForged = false;
      if (forceForged) {
        isForged = true;
        proofToTest = JSON.parse(JSON.stringify(proofToTest));
        if (proofToTest.length > 0) {
          proofToTest[0].hash = 'deadbeefcafe0123456789abcdef0123456789abcdef0123456789abcdef9999';
        }
      }

      let candidate = leafHash;
      for (const step of proofToTest) {
        candidate = step.position === 'right'
          ? await Crypto.sha256(candidate + step.hash)
          : await Crypto.sha256(step.hash + candidate);
      }

      const ok = candidate === tree.root;
      proofVerificationState = {
        ok,
        isForged,
        leafIndex: selectedProofLeaf,
        leafHash,
        computedRoot: candidate,
        expectedRoot: tree.root,
        proof: proofToTest
      };

      if (ok) {
        missionState.hasVerifiedMerkleProof = true;
        notifyState();
        eventBus.emit('MERKLE_PROOF_VERIFIED', { leafIndex: selectedProofLeaf, ok: true });
        Toast.show("Proof Verified! ✅", "Tx #" + (selectedProofLeaf + 1) + " cryptographically proven in block header.", 'success', 4000);
      } else {
        missionState.hasRejectedForgedProof = true;
        notifyState();
        eventBus.emit('MERKLE_PROOF_REJECTED', {
          leafIndex: selectedProofLeaf,
          expectedRoot: tree.root,
          computedRoot: candidate
        });
        Toast.show("Proof Rejected! ❌", "Computed root does not match block header root.", 'error', 4500);
      }

      renderLabUI();
    }

    function handleSelectSPVScale(n) {
      spvSelectedN = n;
      missionState.hasComparedFullVsSPV = true;
      notifyState();
      renderLabUI();
    }

    if (typeof window !== 'undefined') {
      window.level7 = {
        buildTree: () => handleBuildTree(false),
        tamperTx: handleTamperTx,
        resetTxs: handleResetTransactions,
        selectLeaf: handleSelectProofLeaf,
        verifyProof: () => handleVerifyProof(false),
        loadForgedProof: () => handleVerifyProof(true),
        setSPVScale: handleSelectSPVScale,
        getState: () => ({
          transactions,
          tree,
          currentProof,
          proofVerificationState,
          missionState
        })
      };
    }

    function renderLabUI() {
      container.innerHTML = `
        <div class="level7-lab-wrapper" style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-sans);">

          <div class="theory-card" style="background: linear-gradient(145deg, #111a2e, #090e1a); border-color: var(--accent-cyan); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.25); padding-bottom: 6px; margin-bottom: 10px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">📦 TRANSACTION POOL (BLOCK DATA PAYLOAD)</strong>
              <div style="display: flex; gap: 6px;">
                <button id="btn-build-merkle-tree" class="hud-btn primary" style="font-size: 10px; padding: 4px 10px;" ${isBuilding ? 'disabled' : ''}>
                  ${isBuilding ? '⏳ Hashing...' : '🌳 Build Tree'}
                </button>
                <button id="btn-reset-merkle-txs" class="hud-btn" style="font-size: 10px; padding: 4px 8px;">
                  🔄 Reset
                </button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; margin-bottom: 8px;">
              ${transactions.map((tx, idx) => {
                const isSelected = selectedProofLeaf === idx;
                const isThisTampered = isTampered && tamperedTxId === idx;
                return `
                  <div class="tx-card" style="background: rgba(0,0,0,0.35); border: 1px solid ${isThisTampered ? 'var(--accent-red)' : (isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)')}; border-radius: 6px; padding: 6px 8px; font-size: 9.5px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <strong style="color: ${isThisTampered ? 'var(--accent-red)' : '#fff'};">TX #${idx + 1}</strong>
                        <span style="font-family: var(--font-mono); color: var(--accent-green); font-weight: bold;">${tx.amount.toFixed(1)} Q</span>
                      </div>
                      <div style="color: #94a3b8; font-size: 8.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tx.from} ➔ ${tx.to}</div>
                      <div style="margin-top: 4px; font-family: var(--font-mono); font-size: 8px; color: ${isThisTampered ? '#ff6688' : '#38bdf8'}; word-break: break-all;">
                        #${tx.hash ? tx.hash.substring(0, 12) + '...' : 'pending'}
                      </div>
                    </div>
                    <button class="btn-tamper-tx" data-tx-id="${idx}" style="margin-top: 6px; padding: 3px 6px; font-size: 8.5px; border-radius: 3px; border: 1px solid rgba(255,51,102,0.4); background: rgba(255,51,102,0.12); color: #ff6688; cursor: pointer;">
                      ⚠️ Tamper Tx #${idx + 1}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            ${isTampered ? `
              <div style="background: rgba(255, 51, 102, 0.1); border: 1px solid var(--accent-red); border-radius: 4px; padding: 6px 8px; font-size: 9.5px; color: #ff99aa; display: flex; flex-direction: column; gap: 3px;">
                <div style="display: flex; justify-content: space-between;">
                  <strong>⚡ AVALANCHE EFFECT DETECTED:</strong>
                  <span>Tx #${tamperedTxId + 1} Altered</span>
                </div>
                <div style="font-family: var(--font-mono); font-size: 8.5px; color: #cbd5e1;">
                  Previous Root: <span style="color: #64748b;">${previousRoot ? previousRoot.substring(0, 24) + '...' : 'None'}</span><br>
                  New Tampered Root: <strong style="color: var(--accent-red);">${tree ? tree.root.substring(0, 24) + '...' : 'None'}</strong>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="theory-card" style="background: linear-gradient(145deg, #0b111e, #05080f); border-color: var(--accent-amber); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 183, 3, 0.25); padding-bottom: 6px; margin-bottom: 8px;">
              <strong style="color: var(--accent-amber); font-size: 11px;">🌳 MERKLE TREE HIERARCHY (SVG PROJECTION)</strong>
              <span style="font-size: 9.5px; color: #94a3b8;">Topology: 4 Leaves ➔ 2 Mid ➔ 1 Root</span>
            </div>

            ${renderTreeSVG(tree, selectedProofLeaf, isTampered, tamperedTxId, proofVerificationState)}

            <pre style="display: none;" aria-label="Text alternative for Merkle Tree hashes">
Root: ${tree ? tree.root : 'Not built'}
Level 1: ${tree && tree.levels[1] ? tree.levels[1].join(' | ') : 'Not built'}
Leaves: ${tree && tree.levels[0] ? tree.levels[0].join(' | ') : 'Not built'}
            </pre>
          </div>

          <div class="theory-card" style="background: linear-gradient(145deg, #181126, #0c0814); border-color: var(--accent-purple); margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(157, 78, 221, 0.25); padding-bottom: 6px; margin-bottom: 8px;">
              <strong style="color: var(--accent-purple); font-size: 11px;">📜 SPV INCLUSION PROOF CONSOLE</strong>
              <div style="display: flex; align-items: center; gap: 6px;">
                <label for="select-proof-leaf" style="font-size: 9.5px; color: #cbd5e1;">Target Tx:</label>
                <select id="select-proof-leaf" style="background: #1e1533; border: 1px solid var(--accent-purple); color: #fff; font-size: 9.5px; border-radius: 4px; padding: 2px 6px;">
                  <option value="0" ${selectedProofLeaf === 0 ? 'selected' : ''}>Tx #1 (Alice)</option>
                  <option value="1" ${selectedProofLeaf === 1 ? 'selected' : ''}>Tx #2 (Charlie)</option>
                  <option value="2" ${selectedProofLeaf === 2 ? 'selected' : ''}>Tx #3 (Elena)</option>
                  <option value="3" ${selectedProofLeaf === 3 ? 'selected' : ''}>Tx #4 (George)</option>
                </select>
              </div>
            </div>

            <div style="background: rgba(0,0,0,0.4); border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 9.5px;">
              <div style="color: #94a3b8; margin-bottom: 4px;">Sibling Audit Path (Length: ${currentProof ? currentProof.length : 0} hashes for 4 leaves):</div>
              ${currentProof && currentProof.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 8.5px;">
                  ${currentProof.map((step, sIdx) => `
                    <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 3px 6px; border-radius: 3px;">
                      <span style="color: var(--accent-cyan);">Level ${sIdx} [${step.position.toUpperCase()} Sibling]:</span>
                      <span style="color: #e2e8f0;">${step.hash.substring(0, 20)}...</span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="color: #64748b; font-style: italic;">Build the Merkle Tree to generate the cryptographic sibling path.</div>
              `}
            </div>

            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
              <button id="btn-verify-merkle-proof" class="action-btn primary-action" style="flex: 1; background: rgba(0, 255, 136, 0.15); border: 1px solid var(--accent-green); color: var(--accent-green); padding: 6px; font-size: 10px; justify-content: center;" ${!tree ? 'disabled' : ''}>
                ✅ Verify Proof (Light Client SPV)
              </button>
              <button id="btn-load-forged-proof" class="action-btn" style="flex: 1; background: rgba(255, 51, 102, 0.15); border: 1px solid var(--accent-red); color: #ff6688; padding: 6px; font-size: 10px; justify-content: center;" ${!tree ? 'disabled' : ''}>
                ⚔️ Load Forged Proof (Attack)
              </button>
            </div>

            ${proofVerificationState ? `
              <div style="background: ${proofVerificationState.ok ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 51, 102, 0.15)'}; border: 1px solid ${proofVerificationState.ok ? 'var(--accent-green)' : 'var(--accent-red)'}; border-radius: 4px; padding: 6px 8px; font-size: 9.5px; color: #fff; margin-bottom: 8px;">
                <div style="font-weight: bold; color: ${proofVerificationState.ok ? 'var(--accent-green)' : '#ff6688'}; margin-bottom: 2px;">
                  ${proofVerificationState.ok ? 'VALID INCLUSION PROOF' : 'FORGED PROOF REJECTED (CRYPTOGRAPHIC MISMATCH)'}
                </div>
                <div style="font-size: 8.5px; font-family: var(--font-mono); color: #cbd5e1; line-height: 1.4;">
                  Recomputed Root: <span style="color: ${proofVerificationState.ok ? 'var(--accent-green)' : '#ff6688'};">0x${proofVerificationState.computedRoot.substring(0, 24)}...</span><br>
                  Expected Header Root: <span style="color: var(--accent-cyan);">0x${proofVerificationState.expectedRoot.substring(0, 24)}...</span>
                </div>
                ${!proofVerificationState.ok ? `
                  <div style="font-size: 8.5px; color: #ff99aa; margin-top: 3px;">
                    Explanation: The sibling hash was forged or mismatched. The calculated root deviates from the header root — the node safely drops the invalid proof without downloading the block!
                  </div>
                ` : `
                  <div style="font-size: 8.5px; color: #a7f3d0; margin-top: 3px;">
                    Verification succeeded! A light client mathematically verified Tx #${proofVerificationState.leafIndex + 1} using only 2 sibling hashes ($O(\\log N)$ bandwidth).
                  </div>
                `}
              </div>
            ` : ''}

            <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; margin-top: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 9.5px; color: var(--accent-amber); font-weight: bold;">📊 FULL BLOCK vs SPV BANDWIDTH SCALING</span>
                <span style="font-size: 8.5px; color: #94a3b8;">Full = N × 250 B | SPV = log₂(N) × 32 B + 80 B</span>
              </div>

              <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                ${[4, 8, 16, 32, 1000].map(n => `
                  <button class="hud-btn btn-spv-n ${spvSelectedN === n ? 'primary' : ''}" data-n="${n}" style="flex: 1; padding: 3px 2px; font-size: 8.5px; justify-content: center;">
                    N=${n}
                  </button>
                `).join('')}
              </div>

              ${(() => {
                const fullBytes = spvSelectedN * 250;
                const spvBytes = Math.ceil(Math.log2(spvSelectedN)) * 32 + 80;
                const savingsPct = ((1 - (spvBytes / fullBytes)) * 100).toFixed(1);
                return `
                  <div style="background: rgba(0,0,0,0.3); border-radius: 4px; padding: 6px 8px; font-size: 9px; font-family: var(--font-mono); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; text-align: center;">
                    <div>
                      <div style="color: var(--accent-red);">Full Block</div>
                      <strong>${fullBytes.toLocaleString()} B</strong>
                    </div>
                    <div>
                      <div style="color: var(--accent-cyan);">SPV Proof</div>
                      <strong>${spvBytes} B</strong>
                    </div>
                    <div>
                      <div style="color: var(--accent-green);">Bandwidth Saved</div>
                      <strong>${savingsPct}%</strong>
                    </div>
                  </div>
                `;
              })()}
            </div>

          </div>

        </div>
      `;

      attachLabListeners();
    }

    function renderTreeSVG(currentTree, leafIdx, tampered, tamperedId, verifyState) {
      if (!currentTree || !currentTree.levels || currentTree.levels.length < 3) {
        return `
          <div style="text-align: center; padding: 36px 12px; color: #64748b; font-size: 11px;">
            Click <strong>"Build Tree"</strong> above to compute pairwise SHA-256 leaf and parent hashes.
          </div>
        `;
      }

      const l0 = currentTree.levels[0];
      const l1 = currentTree.levels[1];
      const rootHash = currentTree.root;

      const coords = {
        root: { x: 270, y: 25 },
        mid0: { x: 140, y: 85 },
        mid1: { x: 400, y: 85 },
        leaf0: { x: 75, y: 155 },
        leaf1: { x: 205, y: 155 },
        leaf2: { x: 335, y: 155 },
        leaf3: { x: 465, y: 155 }
      };

      const isPath0 = leafIdx === 0 || leafIdx === 1;
      const isPath1 = leafIdx === 2 || leafIdx === 3;

      const strokeCol = (isActiveBranch) => isActiveBranch ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)';

      return `
        <svg viewBox="0 0 540 190" style="width: 100%; height: auto; display: block; overflow: visible;" aria-label="Merkle tree diagram showing 4 leaves combining into 2 intermediate nodes and 1 root node">
          <defs>
            <linearGradient id="gradRoot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#00ff88" stop-opacity="0.3"/>
            </linearGradient>
            <linearGradient id="gradTampered" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff3366" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#ffb703" stop-opacity="0.4"/>
            </linearGradient>
          </defs>

          <line x1="${coords.root.x}" y1="${coords.root.y + 12}" x2="${coords.mid0.x}" y2="${coords.mid0.y - 12}" stroke="${strokeCol(isPath0)}" stroke-width="2"/>
          <line x1="${coords.root.x}" y1="${coords.root.y + 12}" x2="${coords.mid1.x}" y2="${coords.mid1.y - 12}" stroke="${strokeCol(isPath1)}" stroke-width="2"/>

          <line x1="${coords.mid0.x}" y1="${coords.mid0.y + 12}" x2="${coords.leaf0.x}" y2="${coords.leaf0.y - 12}" stroke="${strokeCol(leafIdx === 0)}" stroke-width="1.8"/>
          <line x1="${coords.mid0.x}" y1="${coords.mid0.y + 12}" x2="${coords.leaf1.x}" y2="${coords.leaf1.y - 12}" stroke="${strokeCol(leafIdx === 1)}" stroke-width="1.8"/>
          <line x1="${coords.mid1.x}" y1="${coords.mid1.y + 12}" x2="${coords.leaf2.x}" y2="${coords.leaf2.y - 12}" stroke="${strokeCol(leafIdx === 2)}" stroke-width="1.8"/>
          <line x1="${coords.mid1.x}" y1="${coords.mid1.y + 12}" x2="${coords.leaf3.x}" y2="${coords.leaf3.y - 12}" stroke="${strokeCol(leafIdx === 3)}" stroke-width="1.8"/>

          <g transform="translate(${coords.root.x}, ${coords.root.y})">
            <rect x="-85" y="-14" width="170" height="26" rx="13" fill="${tampered ? 'url(#gradTampered)' : 'url(#gradRoot)'}" stroke="${tampered ? 'var(--accent-red)' : 'var(--accent-cyan)'}" stroke-width="1.5"/>
            <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff" font-family="monospace">
              ROOT: ${rootHash ? rootHash.substring(0, 12) + '...' : ''}
            </text>
            <title>${rootHash}</title>
          </g>

          <g transform="translate(${coords.mid0.x}, ${coords.mid0.y})">
            <rect x="-65" y="-12" width="130" height="24" rx="6" fill="rgba(15,23,42,0.8)" stroke="${tampered && (tamperedId === 0 || tamperedId === 1) ? 'var(--accent-red)' : 'var(--border-medium)'}" stroke-width="1.2"/>
            <text x="0" y="3" text-anchor="middle" font-size="8.5" fill="${tampered && (tamperedId === 0 || tamperedId === 1) ? '#ff6688' : '#38bdf8'}" font-family="monospace">
              H(0,1): ${l1[0] ? l1[0].substring(0, 10) + '...' : ''}
            </text>
            <title>${l1[0]}</title>
          </g>

          <g transform="translate(${coords.mid1.x}, ${coords.mid1.y})">
            <rect x="-65" y="-12" width="130" height="24" rx="6" fill="rgba(15,23,42,0.8)" stroke="${tampered && (tamperedId === 2 || tamperedId === 3) ? 'var(--accent-red)' : 'var(--border-medium)'}" stroke-width="1.2"/>
            <text x="0" y="3" text-anchor="middle" font-size="8.5" fill="${tampered && (tamperedId === 2 || tamperedId === 3) ? '#ff6688' : '#38bdf8'}" font-family="monospace">
              H(2,3): ${l1[1] ? l1[1].substring(0, 10) + '...' : ''}
            </text>
            <title>${l1[1]}</title>
          </g>

          ${[0, 1, 2, 3].map(i => {
            const pos = [coords.leaf0, coords.leaf1, coords.leaf2, coords.leaf3][i];
            const isTarget = leafIdx === i;
            const isAltered = tampered && tamperedId === i;
            const nodeCol = isAltered ? 'var(--accent-red)' : (isTarget ? 'var(--accent-cyan)' : 'var(--border-subtle)');
            return `
              <g transform="translate(${pos.x}, ${pos.y})">
                <rect x="-55" y="-11" width="110" height="22" rx="5" fill="rgba(0,0,0,0.65)" stroke="${nodeCol}" stroke-width="${isTarget || isAltered ? '1.6' : '1'}"/>
                <text x="0" y="3" text-anchor="middle" font-size="8" fill="${isAltered ? '#ff6688' : (isTarget ? 'var(--accent-cyan)' : '#cbd5e1')}" font-family="monospace">
                  L${i}: ${l0[i] ? l0[i].substring(0, 8) + '...' : ''}
                </text>
                <title>Leaf #${i + 1} Hash: ${l0[i]}</title>
              </g>
            `;
          }).join('')}
        </svg>
      `;
    }

    function attachLabListeners() {
      document.getElementById('btn-build-merkle-tree')?.addEventListener('click', () => {
        handleBuildTree(true);
      });

      document.getElementById('btn-reset-merkle-txs')?.addEventListener('click', () => {
        handleResetTransactions();
      });

      const leafSelect = document.getElementById('select-proof-leaf');
      leafSelect?.addEventListener('change', (e) => {
        handleSelectProofLeaf(parseInt(e.target.value, 10));
      });

      document.getElementById('btn-verify-merkle-proof')?.addEventListener('click', () => {
        handleVerifyProof(false);
      });

      document.getElementById('btn-load-forged-proof')?.addEventListener('click', () => {
        handleVerifyProof(true);
      });

      if (typeof container?.querySelectorAll === 'function') {
        container.querySelectorAll('.btn-tamper-tx').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const txId = parseInt(btn.getAttribute('data-tx-id'), 10);
            handleTamperTx(txId);
          });
        });

        container.querySelectorAll('.btn-spv-n').forEach(btn => {
          btn.addEventListener('click', () => {
            const n = parseInt(btn.getAttribute('data-n'), 10);
            handleSelectSPVScale(n);
          });
        });
      }
    }

    renderLabUI();
    notifyState();
  }
};
