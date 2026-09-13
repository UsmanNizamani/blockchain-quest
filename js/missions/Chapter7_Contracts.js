import { smartContractEngine } from '../blockchain/SmartContract.js';
import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Chapter7_Contracts = {
  id: 7,
  title: "Smart Contracts & EVM Logic",
  subtitle: "Autonomous Code, Deterministic Addressing, and On-Chain Execution",
  xpReward: 500,

  theory: {
    heroTitle: "Chapter 7: Smart Contracts & Self-Executing Logic",
    sections: [
      {
        title: "The Autonomous Code Revolution",
        content: `Traditional legal contracts and banking agreements require trusted third parties—escrow agents, lawyers, or central clearing houses—to enforce agreements. <strong>Smart Contracts</strong> replace intermediaries with cryptographic mathematics and distributed consensus.`
      },
      {
        title: "The Code is Law Invariant",
        highlight: "Smart contracts are self-executing code on the blockchain. They run exactly as written — no one can stop or alter them.\n\nOnce deployed to the decentralized ledger, contract bytecode is immutable. Neither the original author, miners, nor external authorities can tamper with the logic or censor valid executions."
      },
      {
        title: "Deterministic Contract Address Derivation",
        content: `When a contract is deployed, its address is not chosen randomly. It is deterministically derived from the deployer's account address and current sequence nonce:\n\n<code>ContractAddress = 0x + SHA-256(bytecode + deployerAddress + nonce)[0..40]</code>\n\nThis guarantees that every contract deployment has a globally unique, mathematically predictable address across all nodes.`
      },
      {
        title: "The Cryptographic Execution Pipeline",
        content: `Interacting with a smart contract requires creating a <strong>Call Transaction</strong>. The caller signs the call payload with their private key, nodes verify signatures and nonces, and the contract's EVM runtime executes the requested function to mutate on-chain state storage.`
      }
    ],
    concepts: [
      { name: "Smart Contract", desc: "Autonomous self-executing program residing on the blockchain" },
      { name: "Deterministic Address", desc: "Address derived via 0x + hash(code + deployer + nonce)" },
      { name: "State Storage", desc: "Persistent on-chain variables modified strictly by contract rules" },
      { name: "Event Logs", desc: "Append-only cryptographic receipts emitted during contract execution" }
    ]
  },

  objectives: [
    {
      id: "ch7_obj1",
      title: "1. Deploy an Autonomous Smart Contract",
      desc: "Deploy an Escrow, Voting, or ERC-20 Token contract and verify deterministic address generation.",
      xp: 120,
      completed: false,
      check: (state) => state.hasDeployedContract === true
    },
    {
      id: "ch7_obj2",
      title: "2. Invoke a Cryptographically Signed Function",
      desc: "Call an on-chain contract method with a signed transaction verified through the network pipeline.",
      xp: 150,
      completed: false,
      check: (state) => state.totalInvocations >= 1
    },
    {
      id: "ch7_obj3",
      title: "3. Trigger State Transition & Inspect Receipts",
      desc: "Mutate stored contract state (e.g. deposit/release escrow, cast vote, or transfer/mint tokens).",
      xp: 230,
      completed: false,
      check: (state) => state.hasMutatedState === true
    }
  ],

  initLab(container, onStateChange) {
    let selectedContractType = 'escrow'; // 'escrow' | 'voting' | 'token'
    let lastCallReceipt = null;

    const missionState = {
      hasDeployedContract: smartContractEngine.activeContract !== null,
      totalInvocations: 0,
      hasMutatedState: false
    };

    function notifyState() {
      onStateChange({ ...missionState });
    }

    function getCodeSnippet(type) {
      if (type === 'escrow') {
        return `contract TrustlessEscrow {
    address public buyer;
    address public seller;
    uint256 public amount = 20.0 QUEST;
    bool public isFunded;
    bool public buyerApproved;
    bool public sellerApproved;

    function deposit() external payable;
    function approveRelease() external;
    function refund() external;
}`;
      } else if (type === 'voting') {
        return `contract DAOVoting {
    string public proposal = "Upgrade Hash to SHA-3";
    uint256 public yesVotes;
    uint256 public noVotes;
    bool public isFinalized;
    mapping(address => bool) public hasVoted;

    function voteYes() external;
    function voteNo() external;
    function finalizeProposal() external;
}`;
      } else {
        return `contract QuestXToken {
    string public name = "QuestX Utility Token";
    string public symbol = "QTX";
    uint256 public totalSupply = 1000;
    mapping(address => uint256) public balanceOf;

    function transfer(address to, uint256 amount) external;
    function mint(uint256 amount) external;
}`;
      }
    }

    function renderLabUI() {
      const activeContract = smartContractEngine.activeContract;
      const predictedAddr = smartContractEngine.calculateContractAddress(
        selectedContractType === 'escrow' ? "contract TrustlessEscrow { ... }" : (selectedContractType === 'voting' ? "contract DAOVoting { ... }" : "contract QuestXToken { ... }"),
        playerWallet.address,
        playerWallet.nonce
      );

      container.innerHTML = `
        <!-- Chapter 7 Header Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--accent-purple); text-transform: uppercase; letter-spacing: 0.5px;">
            ⚙️ EVM Runtime Console
          </div>
          <button id="btn-show-contract-theory" class="hud-btn" style="font-size: 10px; padding: 3px 8px; border-color: var(--accent-purple); color: #d8b4fe;">
            📜 Explain Invariant
          </button>
        </div>

        <!-- 1. Contract Type Selection Tabs -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 12px;">
          <button id="btn-select-escrow" class="hud-btn ${selectedContractType === 'escrow' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 2px;">
            ⚖️ Escrow
          </button>
          <button id="btn-select-voting" class="hud-btn ${selectedContractType === 'voting' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 2px;">
            🗳️ Voting
          </button>
          <button id="btn-select-token" class="hud-btn ${selectedContractType === 'token' ? 'primary' : ''}" style="justify-content: center; font-size: 10px; padding: 6px 2px;">
            🪙 ERC-20
          </button>
        </div>

        <!-- 2. Deployment Preview Card -->
        <div class="theory-card" style="background: linear-gradient(145deg, #18112b, #0d0c1e); border-color: var(--accent-purple); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="color: var(--accent-purple); font-size: 11px;">
              📦 DEPLOYMENT COMPILER: ${selectedContractType.toUpperCase()}
            </strong>
            <span class="badge-label" style="background: rgba(157, 78, 221, 0.2); color: #c084fc; font-size: 9px;">
              SOLC v0.8.20
            </span>
          </div>

          <!-- Code Snippet -->
          <pre style="background: rgba(0,0,0,0.6); padding: 8px 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 9.5px; line-height: 1.4; color: #a5b4fc; overflow-x: auto; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05);">${getCodeSnippet(selectedContractType)}</pre>

          <!-- Deterministic Address Calculation formula -->
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; border: 1px dashed rgba(157, 78, 221, 0.3); font-family: var(--font-mono); font-size: 9.5px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Deployer:</span>
              <span style="color: #cbd5e1;">${playerWallet.address.substring(0, 10)}...${playerWallet.address.substring(34)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Sequence Nonce:</span>
              <span style="color: var(--accent-amber);">#${playerWallet.nonce}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
              <span style="color: var(--accent-purple); font-weight: bold;">Deterministic Target:</span>
              <strong style="color: var(--accent-cyan); font-size: 9.5px;">${predictedAddr.substring(0, 12)}...${predictedAddr.substring(32)}</strong>
            </div>
          </div>

          <!-- Deploy Button -->
          <button id="btn-deploy-contract" class="hud-btn primary" style="width: 100%; justify-content: center; background: var(--accent-purple); font-weight: bold; padding: 8px;">
            🚀 Deploy ${selectedContractType.toUpperCase()} to Blockchain
          </button>
        </div>

        ${activeContract ? `
          <!-- 3. ACTIVE DEPLOYED CONTRACT CONSOLE -->
          <div class="theory-card" style="background: linear-gradient(145deg, #0e1a2f, #081120); border-color: var(--accent-cyan); margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
              <div>
                <strong style="color: var(--accent-cyan); font-size: 11px;">
                  ⚡ ACTIVE INSTANCE: ${activeContract.name}
                </strong>
              </div>
              <span class="badge-label" style="background: rgba(0, 255, 136, 0.15); color: var(--accent-green); font-size: 9px;">
                ON-CHAIN
              </span>
            </div>

            <!-- Address Banner -->
            <div style="background: rgba(0,0,0,0.5); padding: 6px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 9px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border: 1px solid rgba(0, 240, 255, 0.2);">
              <span style="color: #94a3b8;">Address:</span>
              <strong style="color: #fff;">${activeContract.address}</strong>
            </div>

            <!-- Live State Inspector Grid -->
            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">
              📊 ON-CHAIN STATE VARIABLES:
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
              ${Object.entries(activeContract.state).map(([k, v]) => {
                let displayVal = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
                const isPositive = v === true || displayVal.includes('PASSED') || displayVal.includes('Completed');
                const isNegative = v === false || displayVal.includes('REJECTED') || displayVal.includes('Refunded');
                return `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8;">${k}:</span>
                    <strong style="color: ${isPositive ? 'var(--accent-green)' : (isNegative ? 'var(--accent-red)' : '#fff')};">
                      ${displayVal.length > 28 ? displayVal.substring(0, 26) + '...' : displayVal}
                    </strong>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Contract Method Execution Form -->
            <div style="font-size: 10px; font-weight: bold; color: var(--accent-amber); margin-bottom: 6px;">
              ✍️ CALL CONTRACT FUNCTIONS (SIGNED BY YOU):
            </div>

            ${activeContract.type === 'escrow' ? `
              <!-- ESCROW METHODS -->
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <button id="btn-escrow-deposit" class="hud-btn" style="justify-content: center; font-size: 10px; border-color: var(--accent-green); color: var(--accent-green);" ${activeContract.state.isFunded ? 'disabled' : ''}>
                  💰 deposit(20.0 QUEST)
                </button>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <button id="btn-escrow-approve" class="hud-btn primary" style="justify-content: center; font-size: 10px;" ${!activeContract.state.isFunded || activeContract.state.status.includes('Completed') ? 'disabled' : ''}>
                    ✓ approveRelease()
                  </button>
                  <button id="btn-escrow-refund" class="hud-btn" style="justify-content: center; font-size: 10px; border-color: var(--accent-red); color: var(--accent-red);" ${!activeContract.state.isFunded || activeContract.state.status.includes('Completed') ? 'disabled' : ''}>
                    ✕ refund()
                  </button>
                </div>
              </div>
            ` : activeContract.type === 'voting' ? `
              <!-- VOTING METHODS -->
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <button id="btn-vote-yes" class="hud-btn primary" style="justify-content: center; font-size: 10px; background: rgba(0, 255, 136, 0.2); border-color: var(--accent-green); color: #fff;" ${activeContract.state.isFinalized ? 'disabled' : ''}>
                    👍 voteYes()
                  </button>
                  <button id="btn-vote-no" class="hud-btn" style="justify-content: center; font-size: 10px; background: rgba(255, 51, 102, 0.2); border-color: var(--accent-red); color: #fff;" ${activeContract.state.isFinalized ? 'disabled' : ''}>
                    👎 voteNo()
                  </button>
                </div>
                <button id="btn-vote-finalize" class="hud-btn" style="justify-content: center; font-size: 10px; border-color: var(--accent-cyan); color: var(--accent-cyan);" ${activeContract.state.isFinalized ? 'disabled' : ''}>
                  ⚖️ finalizeProposal()
                </button>
              </div>
            ` : `
              <!-- TOKEN METHODS -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Transfer sub-form -->
                <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                  <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">transfer(to, amount)</div>
                  <div style="display: grid; grid-template-columns: 1.5fr 1fr auto; gap: 4px;">
                    <select id="token-recipient-select" class="tx-input" style="font-size: 9.5px; padding: 4px;">
                      <option value="${NPC_MERCHANTS[0].address}">Bob (${NPC_MERCHANTS[0].address.substring(0, 8)}...)</option>
                      <option value="${NPC_MERCHANTS[1].address}">Alice (${NPC_MERCHANTS[1].address.substring(0, 8)}...)</option>
                    </select>
                    <input type="number" id="token-transfer-amount" class="tx-input" value="50" min="1" max="1000" style="font-size: 9.5px; padding: 4px;" />
                    <button id="btn-token-transfer" class="hud-btn primary" style="font-size: 9.5px; padding: 4px 8px;">
                      Send
                    </button>
                  </div>
                </div>

                <!-- Mint sub-form -->
                <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                  <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">mint(amount)</div>
                  <div style="display: grid; grid-template-columns: 1fr auto; gap: 4px;">
                    <input type="number" id="token-mint-amount" class="tx-input" value="250" min="1" style="font-size: 9.5px; padding: 4px;" />
                    <button id="btn-token-mint" class="hud-btn" style="font-size: 9.5px; padding: 4px 10px; border-color: var(--accent-purple); color: var(--accent-purple);">
                      Mint Supply
                    </button>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- 4. Last Call Receipt & Events Card -->
          ${lastCallReceipt ? `
            <div class="theory-card" style="background: rgba(0,0,0,0.5); border-color: var(--accent-green); margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: var(--accent-green); font-size: 10px;">
                  ✓ TRANSACTION RECEIPT: ${lastCallReceipt.fnName}()
                </strong>
                <span style="font-size: 8.5px; color: #94a3b8; font-family: var(--font-mono);">
                  NONCE #${lastCallReceipt.tx.nonce}
                </span>
              </div>
              <div style="font-family: var(--font-mono); font-size: 9px; line-height: 1.4; color: #cbd5e1; margin-bottom: 4px;">
                <div><span style="color: #64748b;">TxHash:</span> ${lastCallReceipt.tx.hash.substring(0, 24)}...</div>
                <div><span style="color: #64748b;">Signer:</span> ${lastCallReceipt.tx.from.substring(0, 14)}...</div>
                <div><span style="color: #64748b;">Return:</span> <span style="color: var(--accent-cyan);">${lastCallReceipt.resultMessage}</span></div>
              </div>
            </div>
          ` : ''}

          <!-- 5. Event Logs -->
          ${activeContract.eventLogs.length > 0 ? `
            <div class="theory-card" style="background: rgba(0,0,0,0.4); border-color: var(--border-subtle);">
              <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 6px;">
                📜 CRYPTOGRAPHIC EVENT LOGS (${activeContract.eventLogs.length}):
              </div>
              <div style="max-height: 110px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
                ${activeContract.eventLogs.slice().reverse().map(log => `
                  <div style="background: rgba(255,255,255,0.03); padding: 4px 6px; border-radius: 3px; font-family: var(--font-mono); font-size: 8.5px; border-left: 2px solid var(--accent-purple);">
                    <span style="color: var(--accent-amber); font-weight: bold;">event ${log.event}</span>
                    <span style="color: #94a3b8;">${JSON.stringify(log.payload)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        ` : ''}
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      // Contract tab buttons
      document.getElementById('btn-select-escrow')?.addEventListener('click', () => {
        selectedContractType = 'escrow';
        renderLabUI();
      });
      document.getElementById('btn-select-voting')?.addEventListener('click', () => {
        selectedContractType = 'voting';
        renderLabUI();
      });
      document.getElementById('btn-select-token')?.addEventListener('click', () => {
        selectedContractType = 'token';
        renderLabUI();
      });

      // Theory popup button
      document.getElementById('btn-show-contract-theory')?.addEventListener('click', () => {
        eventBus.emit('SHOW_CONTRACT_MODAL');
      });

      // Deploy Button
      document.getElementById('btn-deploy-contract')?.addEventListener('click', () => {
        try {
          const contract = smartContractEngine.deploy(selectedContractType, playerWallet);
          missionState.hasDeployedContract = true;
          notifyState();

          Toast.show(
            "Contract Deployed! 🚀",
            `${contract.name} live at deterministic address ${contract.address.substring(0, 10)}...`,
            "success",
            5000
          );

          // Show educational modal on deployment
          eventBus.emit('SHOW_CONTRACT_MODAL');

          renderLabUI();
        } catch (err) {
          Toast.show("Deployment Error", err.message, "error");
        }
      });

      const active = smartContractEngine.activeContract;
      if (!active) return;

      // --- ESCROW ACTIONS ---
      document.getElementById('btn-escrow-deposit')?.addEventListener('click', () => {
        executeFunctionCall('deposit', {});
      });
      document.getElementById('btn-escrow-approve')?.addEventListener('click', () => {
        executeFunctionCall('approveRelease', {});
      });
      document.getElementById('btn-escrow-refund')?.addEventListener('click', () => {
        executeFunctionCall('refund', {});
      });

      // --- VOTING ACTIONS ---
      document.getElementById('btn-vote-yes')?.addEventListener('click', () => {
        executeFunctionCall('voteYes', {});
      });
      document.getElementById('btn-vote-no')?.addEventListener('click', () => {
        executeFunctionCall('voteNo', {});
      });
      document.getElementById('btn-vote-finalize')?.addEventListener('click', () => {
        executeFunctionCall('finalizeProposal', {});
      });

      // --- TOKEN ACTIONS ---
      document.getElementById('btn-token-transfer')?.addEventListener('click', () => {
        const toEl = document.getElementById('token-recipient-select');
        const amtEl = document.getElementById('token-transfer-amount');
        const to = toEl?.value || NPC_MERCHANTS[0].address;
        const amount = Number(amtEl?.value) || 50;
        executeFunctionCall('transfer', { to, amount });
      });
      document.getElementById('btn-token-mint')?.addEventListener('click', () => {
        const amtEl = document.getElementById('token-mint-amount');
        const amount = Number(amtEl?.value) || 250;
        executeFunctionCall('mint', { amount });
      });
    }

    function executeFunctionCall(fnName, args) {
      const active = smartContractEngine.activeContract;
      if (!active) return;

      try {
        const { tx, resultMessage, state } = smartContractEngine.callFunction(
          active.address,
          fnName,
          args,
          playerWallet
        );

        lastCallReceipt = {
          fnName,
          tx,
          resultMessage,
          timestamp: Date.now()
        };

        missionState.totalInvocations++;
        missionState.hasMutatedState = true;
        notifyState();

        Toast.show(
          `Method Executed: ${fnName}() ⚡`,
          resultMessage,
          "success",
          4500
        );

        renderLabUI();
      } catch (err) {
        Toast.show("EVM Revert / Failure", err.message, "error", 5000);
      }
    }

    renderLabUI();
    notifyState();
  }
};
