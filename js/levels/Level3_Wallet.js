import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level3_Wallet = {
  id: 3,
  title: "Level 3: Wallet Owner",
  role: "Sovereign Wallet Owner",
  kpReward: 250,
  subtitle: "Asymmetric Keypairs, Digital Signatures, and Sequential Nonces",
  codexUnlockIds: ["asymmetric_crypto", "private_key", "digital_signature", "account_nonce"],

  theory: {
    heroTitle: "Level 3: Cryptographic Wallets & Digital Signatures",
    sections: [
      {
        title: "The Power of Asymmetric Cryptography",
        content: `Traditional banking systems rely on usernames and passwords stored on a central bank server. Blockchains have no server. Instead, ownership is governed by <strong>Asymmetric Cryptography</strong>—a mathematical keypair consisting of a <strong>Private Key</strong> (kept secret) and a <strong>Public Key</strong> (shared openly as your address).`
      },
      {
        title: "The Golden Rule of Self-Custody",
        highlight: "The private key proves ownership. Only you can create a valid signature. Anyone can verify it with your public key.\n\nBecause the digital signature is mathematically bound to BOTH the transaction details and your private key, an attacker cannot copy your signature to authorize a different transaction!"
      },
      {
        title: "The Account Nonce: Replay Defense",
        content: `Each transaction broadcast from your wallet includes an incrementing sequence number called an <strong>Account Nonce</strong> (#0, #1, #2...). This guarantees that an attacker cannot intercept your signed transfer and replay it to drain your wallet a second time.`
      }
    ],
    concepts: [
      { name: "Private Key", desc: "256-bit secret that unlocks and signs transactions" },
      { name: "Public Key / Address", desc: "Mathematical derivative used to receive funds" },
      { name: "Digital Signature", desc: "Unforgeable cryptographic proof of authorization" },
      { name: "Account Nonce", desc: "Sequential counter preventing transaction replay" }
    ]
  },

  objectives: [
    {
      id: "lvl3_obj1",
      title: "1. Reveal Your Private Key",
      desc: "Click the reveal eye button (👁️) on your wallet to inspect your 256-bit private secret.",
      xp: 60,
      completed: false,
      check: (state) => state.hasRevealedKey === true
    },
    {
      id: "lvl3_obj2",
      title: "2. Sign & Send Coins to a Merchant",
      desc: "Send coins to Merchant Bob, Alice, or Charlie with a cryptographically signed transaction.",
      xp: 100,
      completed: false,
      check: (state) => state.transactionsSent > 0
    },
    {
      id: "lvl3_obj3",
      title: "3. Inspect Digital Signature Verification",
      desc: "Click on any transaction signature in your history to verify its mathematical validity.",
      xp: 90,
      completed: false,
      check: (state) => state.hasInspectedSig === true
    }
  ],

  initLab(container, onStateChange) {
    const wallet = playerWallet;
    let isKeyRevealed = false;

    const missionState = {
      hasRevealedKey: false,
      transactionsSent: wallet.txHistory.length,
      hasInspectedSig: false
    };

    function notifyState() {
      onStateChange({ ...missionState });
    }

    eventBus.on('TRANSACTION_SENT', () => {
      missionState.transactionsSent = wallet.txHistory.length;
      notifyState();
      renderLabUI();
    });

    function renderLabUI() {
      container.innerHTML = `
        <!-- Wallet Card -->
        <div class="theory-card" style="background: linear-gradient(145deg, #111d33, #0b1220); border-color: var(--accent-cyan); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 12px;">💼 YOUR SOVEREIGN WALLET</strong>
              <button class="btn-explain" data-explain="ch6_private_key" title="Explain Wallet & Keys">ℹ️ Explain</button>
            </div>
            <span class="badge-label" style="background: rgba(0, 255, 136, 0.15); color: var(--accent-green); font-size: 9px;">
              AUTHENTICATED
            </span>
          </div>

          <!-- Balance -->
          <div style="margin: 12px 0 8px 0;">
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Spendable Balance</div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 26px; font-weight: 800; color: #fff; font-family: var(--font-mono);">${wallet.balance.toFixed(2)}</span>
              <span style="color: var(--accent-cyan); font-weight: bold; font-size: 13px;">QUEST</span>
            </div>
          </div>

          <!-- Address -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; border: 1px solid var(--border-subtle); margin-bottom: 8px;">
            <div style="color: #64748b; font-size: 9px; margin-bottom: 2px;">YOUR PUBLIC ADDRESS:</div>
            <div style="color: #cbd5e1; word-break: break-all;">${wallet.address}</div>
          </div>

          <!-- Private Key with Reveal Button -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; border: 1px solid ${isKeyRevealed ? 'var(--accent-red)' : 'var(--border-subtle)'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="color: ${isKeyRevealed ? 'var(--accent-red)' : '#64748b'}; font-size: 9px; font-weight: bold;">
                ${isKeyRevealed ? '⚠️ 256-BIT PRIVATE KEY (SECRET):' : '🔒 PRIVATE KEY (HIDDEN):'}
              </span>
              <button id="btn-toggle-key" style="background: none; border: none; cursor: pointer; font-size: 12px;" title="${isKeyRevealed ? 'Hide Private Key' : 'Reveal Private Key'}">
                ${isKeyRevealed ? '🙈 Hide' : '👁️ Reveal'}
              </button>
            </div>
            <div id="key-display-text" style="color: ${isKeyRevealed ? '#ffb703' : '#64748b'}; word-break: break-all;">
              ${isKeyRevealed ? wallet.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-top: 8px; color: #94a3b8;">
            <span>Current Account Nonce:</span>
            <span style="color: var(--accent-amber); font-family: var(--font-mono); font-weight: bold;">#${wallet.nonce}</span>
          </div>
        </div>

        <!-- Send Coins Form -->
        <div class="theory-card" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 class="card-title" style="margin-bottom: 0;">📤 Send Digitally Signed Coins</h4>
            <button class="btn-explain" data-explain="ch6_digital_sig" title="Explain Signatures">ℹ️ Explain</button>
          </div>

          <div class="lab-field-group">
            <label class="lab-field-label" style="font-size: 10.5px;">RECIPIENT MERCHANT</label>
            <select id="wallet-recipient-select" class="tx-input" style="width: 100%; padding: 6px 8px; font-size: 11px;">
              ${NPC_MERCHANTS.map(m => `
                <option value="${m.id}">${m.name} (${m.address.substring(0, 8)}...)</option>
              `).join('')}
            </select>
          </div>

          <div class="lab-field-group" style="margin-top: 8px;">
            <label class="lab-field-label" style="font-size: 10.5px;">TRANSFER AMOUNT (QUEST)</label>
            <input type="number" id="wallet-amount-input" class="tx-input" value="12.5" min="1" max="${wallet.balance}" step="0.5" style="width: 100%; padding: 6px 8px; font-size: 11px;" />
          </div>

          <button id="btn-wallet-send" class="action-btn primary-action" style="width: 100%; justify-content: center; margin-top: 10px;">
            <span class="btn-text">🖋️ Sign & Broadcast Transaction</span>
            <span class="btn-subtext">Signs payload with your 256-bit private key</span>
          </button>
        </div>

        <!-- Transaction History -->
        <div class="theory-card" style="background: rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h4 class="card-title" style="margin-bottom: 0; font-size: 11px;">📜 Signed Transaction History (${wallet.txHistory.length})</h4>
          </div>
          ${wallet.txHistory.length === 0 ? `
            <div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 6px 0;">No transactions broadcast yet. Send your first payment above!</div>
          ` : `
            <div style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
              ${wallet.txHistory.slice().reverse().map((tx, idx) => `
                <div class="tx-history-row" data-tx-index="${wallet.txHistory.length - 1 - idx}" style="background: rgba(255, 255, 255, 0.04); padding: 6px 8px; border-radius: 4px; border-left: 2px solid var(--accent-green); cursor: pointer;" title="Click to inspect cryptographic signature">
                  <div style="display: flex; justify-content: space-between; font-size: 10.5px;">
                    <strong style="color: #fff;">-${tx.amount.toFixed(2)} QUEST</strong>
                    <span style="color: var(--accent-cyan); font-family: var(--font-mono);">Nonce #${tx.nonce}</span>
                  </div>
                  <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">To: ${tx.toName || tx.to.substring(0, 10)}...</div>
                  <div style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono); margin-top: 2px;">Sig: ${tx.signature.substring(0, 18)}... [Click to Inspect]</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      // Toggle private key reveal
      document.getElementById('btn-toggle-key')?.addEventListener('click', () => {
        isKeyRevealed = !isKeyRevealed;
        if (isKeyRevealed) {
          missionState.hasRevealedKey = true;
          notifyState();
        }
        renderLabUI();
      });

      // Send transaction
      document.getElementById('btn-wallet-send')?.addEventListener('click', () => {
        const select = document.getElementById('wallet-recipient-select');
        const amtInput = document.getElementById('wallet-amount-input');
        const merchantId = select?.value;
        const amount = parseFloat(amtInput?.value);

        const merchant = NPC_MERCHANTS.find(m => m.id === merchantId) || NPC_MERCHANTS[0];

        if (!wallet || typeof wallet.sendTransaction !== 'function') {
          console.error('[level3:send] wallet not ready:', wallet);
          console.error('[level3:send] wallet proto:',
            wallet && Object.getOwnPropertyNames(Object.getPrototypeOf(wallet)));
          Toast.show("Wallet not ready. Please try again.", "", "error");
          return;
        }

        try {
          const tx = wallet.sendTransaction({
            to: merchant.address,
            amount: amount,
            name: merchant.name
          });
          missionState.transactionsSent = wallet.txHistory.length;
          notifyState();
          renderLabUI();

          eventBus.emit('SHOW_SIGNATURE_MODAL', { tx });
        } catch (err) {
          console.error('[level3:send] failed:', err);
          Toast.show("Transaction Failed", err.message, "error");
        }
      });

      // Click history row to inspect signature
      document.querySelectorAll('.tx-history-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.getAttribute('data-tx-index'), 10);
          const tx = wallet.txHistory[idx];
          if (tx) {
            missionState.hasInspectedSig = true;
            notifyState();
            eventBus.emit('SHOW_SIGNATURE_MODAL', { tx });
          }
        });
      });
    }

    renderLabUI();
    notifyState();
  }
};
