import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { doubleSpendSim, DOUBLE_SPEND_MERCHANTS } from '../blockchain/DoubleSpendSim.js';
import { Crypto } from '../blockchain/Crypto.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Chapter6_Keys = {
  id: 6,
  title: "Digital Signatures & Wallets",
  subtitle: "Asymmetric Cryptography, Keypairs, and Double-Spend Defense",
  xpReward: 400,

  theory: {
    heroTitle: "Chapter 6: Digital Signatures & Nonce Defense",
    sections: [
      {
        title: "The Power of Asymmetric Cryptography",
        content: `Traditional systems rely on usernames and passwords stored on a bank's server. Blockchains have no server. Instead, ownership is governed by <strong>Asymmetric Cryptography</strong>—a mathematical keypair consisting of a <strong>Private Key</strong> (kept secret) and a <strong>Public Key</strong> (shared openly).`
      },
      {
        title: "The Golden Rule of Blockchain",
        highlight: "The private key proves ownership. Only you can create a valid signature. Anyone can verify it with your public key.\n\nBecause the digital signature is mathematically bound to BOTH the transaction details and your private key, an attacker cannot copy your signature to authorize a different transaction!"
      },
      {
        title: "The Nonce: Preventing Double-Spending",
        highlight: "The nonce prevents double-spending. Each transaction from an address must have a unique, sequential number."
      },
      {
        title: "How Digital Signatures Prevent Forgery",
        content: `When you send coins, your wallet takes the transaction hash and encrypts it with your private key to generate a unique <strong>Digital Signature</strong>. If anyone tries to alter the amount or recipient by even 1 digit, the signature mathematically mismatches and every node on the network rejects it immediately.`
      }
    ],
    concepts: [
      { name: "Private Key", desc: "256-bit secret that unlocks and signs transactions" },
      { name: "Public Key / Address", desc: "Mathematical derivative used to receive funds" },
      { name: "Digital Signature", desc: "Cryptographic proof of authorization" },
      { name: "Replay Protection (Nonce)", desc: "Sequential counter preventing double-spends and replays" }
    ]
  },

  objectives: [
    {
      id: "ch6_obj1",
      title: "1. Reveal Your Private Key",
      desc: "Click the reveal eye button (👁️) on your wallet to inspect your 256-bit private secret.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.hasRevealedKey === true;
      }
    },
    {
      id: "ch6_obj2",
      title: "2. Sign & Send Coins to a Merchant",
      desc: "Send coins to Merchant Bob, Alice, or Charlie with a digitally signed transaction.",
      xp: 80,
      completed: false,
      check: (state) => {
        return state.transactionsSent > 0;
      }
    },
    {
      id: "ch6_obj3",
      title: "3. Inspect the Digital Signature",
      desc: "Click on any transaction signature in your history to inspect its mathematical verification.",
      xp: 60,
      completed: false,
      check: (state) => {
        return state.hasInspectedSig === true;
      }
    },
    {
      id: "ch6_obj4",
      title: "4. Defend Against a Double-Spend",
      desc: "Attempt to spend the same 10 coins twice with duplicate Nonce #0, and watch the network reject it with 'NONCE ALREADY USED'.",
      xp: 110,
      completed: false,
      check: (state) => {
        return state.hasWitnessedDoubleSpend === true;
      }
    }
  ],

  initLab(container, onStateChange) {
    const wallet = playerWallet;
    const sim = doubleSpendSim;
    let isKeyRevealed = false;
    let activeSubTab = 'wallet'; // 'wallet' | 'doublespend'

    const missionState = {
      hasRevealedKey: false,
      transactionsSent: wallet.txHistory.length,
      hasInspectedSig: false,
      hasWitnessedDoubleSpend: false
    };

    function renderLabUI() {
      container.innerHTML = `
        <!-- Sub-Mode Switch Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button id="tab-btn-wallet" class="hud-btn ${activeSubTab === 'wallet' ? 'primary' : ''}" style="justify-content: center; font-size: 11px;">
            💼 Standard Wallet
          </button>
          <button id="tab-btn-doublespend" class="hud-btn ${activeSubTab === 'doublespend' ? 'primary' : ''}" style="justify-content: center; font-size: 11px; border-color: ${activeSubTab === 'doublespend' ? 'var(--accent-red)' : 'var(--border-subtle)'};">
            ⚔️ Double-Spend Attack Lab
          </button>
        </div>

        ${activeSubTab === 'wallet' ? `
          <!-- STANDARD WALLET LAB -->
          <!-- Wallet Card -->
          <div class="theory-card" style="background: linear-gradient(145deg, #111d33, #0b1220); border-color: var(--accent-cyan);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              <strong style="color: var(--accent-cyan); font-size: 13px;">💼 YOUR CRYPTO WALLET</strong>
              <span class="badge-label" style="background: rgba(0, 255, 136, 0.15); color: var(--accent-green);">
                AUTHENTICATED
              </span>
            </div>

            <!-- Balance -->
            <div style="margin-top: 10px;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">WALLET BALANCE</span>
              <div style="font-size: 24px; font-weight: 800; color: #fff; font-family: var(--font-mono); margin-top: 2px;">
                ${wallet.balance.toFixed(2)} <span style="font-size: 14px; color: var(--accent-cyan);">QUEST</span>
              </div>
            </div>

            <!-- Public Address -->
            <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 10px; color: #94a3b8;">PUBLIC ADDRESS (DERIVED)</span>
                <button id="btn-copy-address" class="hud-btn" style="padding: 2px 6px; font-size: 9px;">📋 Copy</button>
              </div>
              <div class="hash-hex-display" style="font-size: 10px; padding: 6px; margin-top: 4px; color: #cbd5e1;">
                ${wallet.address}
              </div>
            </div>

            <!-- Private Key (Masked/Revealed) -->
            <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; color: #94a3b8;">PRIVATE KEY (ROOT SECRET)</span>
                <button id="btn-toggle-key" class="hud-btn" style="padding: 2px 8px; font-size: 10px;">
                  ${isKeyRevealed ? '🔒 Hide Secret' : '👁️ Reveal Secret'}
                </button>
              </div>
              <div id="private-key-display" class="hash-hex-display" style="font-size: 10px; padding: 6px; margin-top: 4px; color: ${isKeyRevealed ? 'var(--accent-red)' : 'var(--text-muted)'}; background: ${isKeyRevealed ? 'rgba(255, 51, 102, 0.1)' : 'rgba(0,0,0,0.4)'};">
                ${isKeyRevealed ? wallet.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                ⚠️ Anyone with this key controls your funds. Never share private keys!
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
              <span style="font-size: 10px; color: #94a3b8;">SEQUENCE NONCE: <strong style="color: var(--accent-amber);">#${wallet.nonce}</strong></span>
              <button id="btn-new-keypair" class="hud-btn" style="font-size: 10px; padding: 2px 8px;">🔄 New Keypair</button>
            </div>
          </div>

          <!-- Send Coins Form -->
          <div class="theory-card" style="margin-top: 12px; border-color: var(--accent-purple);">
            <strong style="font-size: 12px; color: var(--accent-purple);">🖋️ SEND DIGITALLY SIGNED COINS</strong>
            
            <form id="form-send-coins" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
              <div>
                <label for="select-merchant" style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 4px;">RECIPIENT MERCHANT</label>
                <select id="select-merchant" class="chapter-dropdown" style="width: 100%; background: var(--bg-darkest); color: #fff; padding: 8px; border: 1px solid var(--border-medium); border-radius: 4px;">
                  ${NPC_MERCHANTS.map(m => `
                    <option value="${m.address}" data-name="${m.name}">
                      ${m.name}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between;">
                  <label for="send-amount-input" style="font-size: 10px; color: #94a3b8;">AMOUNT (QUEST)</label>
                  <span id="btn-amount-max" style="font-size: 10px; color: var(--accent-cyan); cursor: pointer;">USE MAX</span>
                </div>
                <input type="number" id="send-amount-input" min="0.1" max="${wallet.balance}" step="0.1" value="25.0" style="width: 100%; background: var(--bg-darkest); color: #fff; padding: 8px; border: 1px solid var(--border-medium); border-radius: 4px; font-family: var(--font-mono); margin-top: 4px;" />
              </div>

              <!-- Live Signature Preview Box -->
              <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(157, 78, 221, 0.3); padding: 8px; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
                  <span>SIMULATED ECDSA SIGNATURE</span>
                  <span style="color: var(--accent-purple);">SHA-256(txHash + privateKey)</span>
                </div>
                <div id="preview-signature" class="hash-hex-display" style="font-size: 9px; padding: 4px; margin-top: 4px; color: var(--accent-purple);">
                  <!-- Generated dynamically -->
                </div>
              </div>

              <button type="submit" id="btn-submit-tx" class="action-btn primary-action" style="background: var(--accent-purple); color: #fff;">
                <span class="btn-text">🖋️ Sign & Broadcast Transaction</span>
                <span class="btn-subtext">Prove ownership with private key signature</span>
              </button>
            </form>
          </div>

          <!-- Transaction History Feed -->
          <div class="theory-card" style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 12px; color: #fff;">📜 WALLET TRANSACTION HISTORY</strong>
              <span style="font-size: 10px; color: #94a3b8;">${wallet.txHistory.length} TXs</span>
            </div>

            <div id="tx-history-feed" style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
              ${wallet.txHistory.length === 0 ? `
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 8px; text-align: center;">
                  No transactions yet. Send coins to an NPC merchant above!
                </div>
              ` : wallet.txHistory.slice(-4).reverse().map((tx, idx) => `
                <div class="concept-box tx-history-item" data-idx="${wallet.txHistory.length - 1 - idx}" style="cursor: pointer; border-left: 3px solid var(--accent-green); padding: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <strong style="color: #fff;">-${tx.amount.toFixed(2)} QUEST</strong>
                    <span style="color: var(--accent-amber);">Nonce #${tx.nonce}</span>
                  </div>
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
                    To: ${tx.toName || tx.to.substring(0, 14)}...
                  </div>
                  <div style="font-size: 9px; font-family: var(--font-mono); color: var(--accent-purple); margin-top: 4px; word-break: break-all;">
                    Sig: ${tx.signature.substring(0, 24)}... (click to verify)
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- DOUBLE-SPEND ATTACK LAB -->
          <div class="theory-card" style="border-color: var(--accent-red); background: rgba(255, 51, 102, 0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--accent-red); font-size: 12px;">⚔️ DOUBLE-SPEND ATTACK LAB</strong>
              <span class="badge-label" style="background: rgba(255, 51, 102, 0.2); color: var(--accent-red);">
                ${sim.step === 'ready' ? 'STEP 1: READY' : (sim.step === 'mempool' ? 'STEP 2: TX1 IN MEMPOOL' : 'STEP 3: BLOCKED')}
              </span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
              You have <strong>10.00 QUEST</strong>. Attempt to spend the same 10 coins twice: once to Merchant A and once to Merchant B before confirmation!
            </div>
          </div>

          <!-- Scenario Step-by-Step Action Console -->
          <div class="theory-card" style="margin-top: 10px; background: rgba(0,0,0,0.4); border-color: rgba(0, 240, 255, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 11px; color: var(--accent-cyan);">ATTACK CONTROLS</strong>
              <span style="font-size: 10px; color: #ffb703; font-family: var(--font-mono);">Current Nonce: #0</span>
            </div>

            <!-- Step 1 Button -->
            <button id="btn-ds-send-tx1" class="action-btn primary-action" style="margin-top: 10px; ${sim.step !== 'ready' ? 'opacity: 0.5; pointer-events: none;' : ''}">
              <span class="btn-text">1. Send 10 QUEST to Merchant A (Bob)</span>
              <span class="btn-subtext">Signed with Nonce #0 ➔ Enters Mempool queue</span>
            </button>

            <!-- Step 2 Button -->
            <button id="btn-ds-send-tx2" class="action-btn" style="margin-top: 8px; background: var(--accent-red); color: #fff; ${sim.step !== 'mempool' ? 'opacity: 0.5; pointer-events: none;' : ''}">
              <span class="btn-text">2. Attempt Double-Spend to Merchant B (Alice)</span>
              <span class="btn-subtext">Try to spend the SAME 10 coins with DUPLICATE Nonce #0</span>
            </button>

            <!-- Reset Button -->
            <button id="btn-ds-reset" class="hud-btn" style="width: 100%; margin-top: 8px; justify-content: center; font-size: 11px;">
              🔄 Reset Double-Spend Scenario (10 Coins)
            </button>
          </div>

          <!-- Rejection / Collision Box -->
          ${sim.step === 'rejected' ? `
            <div class="theory-card" style="margin-top: 10px; border-color: var(--accent-red); background: rgba(255, 51, 102, 0.12);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: var(--accent-red); font-size: 12px;">🚨 DOUBLE-SPEND DETECTED & BLOCKED!</strong>
                <span class="badge-label" style="background: var(--accent-red); color: #fff; font-size: 9px;">
                  REJECTED
                </span>
              </div>
              <div style="font-family: var(--font-mono); font-size: 11px; margin-top: 6px; color: #fff;">
                Reason: <strong style="color: var(--accent-red);">"${sim.rejectionReason}"</strong>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
                The validator nodes compared the incoming transaction against the unconfirmed mempool queue. Because Nonce #0 was already assigned to Tx1, Tx2 was flagged as a duplicate replay and rejected immediately!
              </div>
              <button id="btn-ds-open-modal" class="hud-btn" style="width: 100%; margin-top: 8px; justify-content: center; font-size: 11px; background: var(--accent-red); color: #fff;">
                📖 View Educational Nonce Defense
              </button>
            </div>
          ` : `
            <div class="theory-card" style="margin-top: 10px; background: rgba(0,0,0,0.3);">
              <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.5;">
                <strong>Why the network catches this:</strong><br>
                Every account has an internal sequence counter (nonce). When you sign a transaction, the nonce is sealed inside the signature. If two transactions share the same nonce, only one can ever be confirmed.
              </div>
            </div>
          `}
        `}
      `;

      // Wire Tab Switchers
      container.querySelector('#tab-btn-wallet')?.addEventListener('click', () => {
        activeSubTab = 'wallet';
        sim.isActive = false;
        renderLabUI();
      });

      container.querySelector('#tab-btn-doublespend')?.addEventListener('click', () => {
        activeSubTab = 'doublespend';
        sim.isActive = true;
        renderLabUI();
      });

      // --- Standard Wallet Event Listeners ---
      if (activeSubTab === 'wallet') {
        container.querySelector('#btn-toggle-key')?.addEventListener('click', () => {
          isKeyRevealed = !isKeyRevealed;
          if (isKeyRevealed) {
            missionState.hasRevealedKey = true;
            if (onStateChange) onStateChange(missionState);
            Toast.show("Private Key Revealed", "The private key is the root secret of your wallet. Never expose it in real life!", "warning");
          }
          renderLabUI();
        });

        container.querySelector('#btn-new-keypair')?.addEventListener('click', () => {
          if (confirm('Generate a new mock keypair? This resets your cryptographic keys.')) {
            wallet.generateKeypair();
            Toast.show("New Keypair Generated", "Derived fresh private key and public address.", "info");
            renderLabUI();
          }
        });

        container.querySelector('#btn-copy-address')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(wallet.address);
          Toast.show("Copied to Clipboard", wallet.address, "info");
        });

        container.querySelector('#btn-amount-max')?.addEventListener('click', () => {
          const input = container.querySelector('#send-amount-input');
          if (input) {
            input.value = wallet.balance;
            updateSigPreview();
          }
        });

        const amountInput = container.querySelector('#send-amount-input');
        const merchantSelect = container.querySelector('#select-merchant');
        const sigPreview = container.querySelector('#preview-signature');

        function updateSigPreview() {
          const amt = Number(amountInput?.value || 0);
          const toAddr = merchantSelect?.value || '';
          const mockHash = Crypto.hashSync(`${wallet.address}|${toAddr}|${amt}|${wallet.nonce}`);
          const mockSig = Crypto.hashSync(`${mockHash}:${wallet.privateKey}`);
          if (sigPreview) {
            sigPreview.textContent = mockSig;
          }
        }

        amountInput?.addEventListener('input', updateSigPreview);
        merchantSelect?.addEventListener('change', updateSigPreview);
        updateSigPreview();

        container.querySelector('#form-send-coins')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const amt = Number(amountInput.value);
          const selectedOption = merchantSelect.options[merchantSelect.selectedIndex];
          const toAddr = selectedOption.value;
          const toName = selectedOption.getAttribute('data-name');

          try {
            const tx = wallet.sendCoins(toAddr, amt, toName);
            missionState.transactionsSent = wallet.txHistory.length;
            if (onStateChange) onStateChange(missionState);
            renderLabUI();
            eventBus.emit('SHOW_SIGNATURE_MODAL', { tx, wallet });
          } catch (err) {
            Toast.show("Transaction Error", err.message, "error");
          }
        });

        container.querySelectorAll('.tx-history-item').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-idx'), 10);
            const txRecord = wallet.txHistory[idx];
            if (txRecord) {
              missionState.hasInspectedSig = true;
              if (onStateChange) onStateChange(missionState);
              Toast.show(
                "Signature Verified! ✅",
                `Signature matches SHA-256(txHash + privateKey). Only ${wallet.address.substring(0, 10)}... could produce this!`,
                "success",
                4500
              );
            }
          });
        });
      }

      // --- Double-Spend Attack Handlers ---
      if (activeSubTab === 'doublespend') {
        container.querySelector('#btn-ds-send-tx1')?.addEventListener('click', () => {
          sim.sendTx1();
          renderLabUI();
          Toast.show("Tx1 Broadcast to Mempool", "10 QUEST sent to Merchant A with Nonce #0.", "info", 4000);
        });

        container.querySelector('#btn-ds-send-tx2')?.addEventListener('click', () => {
          sim.attemptDoubleSpend();
          renderLabUI();
          Toast.show("Attempting Double-Spend...", "Broadcasting Tx2 with duplicate Nonce #0 to Merchant B!", "warning", 3000);
        });

        container.querySelector('#btn-ds-reset')?.addEventListener('click', () => {
          sim.reset();
          renderLabUI();
          Toast.show("Reset Double-Spend Lab", "Wallet balance reset to 10 QUEST (Nonce #0).", "info", 3000);
        });

        container.querySelector('#btn-ds-open-modal')?.addEventListener('click', () => {
          eventBus.emit('SHOW_DOUBLE_SPEND_MODAL', {
            rejectionReason: sim.rejectionReason,
            existingTx: sim.tx1,
            rejectedTx: sim.tx2
          });
        });
      }
    }

    // Double-Spend event listeners
    eventBus.on('DOUBLE_SPEND_REJECTED', () => {
      missionState.hasWitnessedDoubleSpend = true;
      if (onStateChange) onStateChange(missionState);
      if (activeSubTab === 'doublespend') {
        renderLabUI();
      }
    });

    renderLabUI();
  }
};
