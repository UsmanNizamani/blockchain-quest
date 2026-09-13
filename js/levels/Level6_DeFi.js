import { smartContractEngine } from '../blockchain/SmartContract.js';
import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level6_DeFi = {
  id: 6,
  title: "Level 6: DeFi Trader",
  role: "Decentralized Finance Architect",
  kpReward: 300,
  subtitle: "Smart Contracts, Deterministic Addressing, and Uniswap AMM",
  codexUnlockIds: ["smart_contract", "evm", "deterministic_address", "erc20", "defi", "amm", "liquidity_pool", "dao"],

  theory: {
    heroTitle: "Level 6: Smart Contracts & Decentralized Finance (DeFi)",
    sections: [
      {
        title: "The Autonomous Code Revolution",
        content: `Traditional legal contracts and financial agreements require trusted third parties—escrow agents, lawyers, or central clearing houses—to enforce agreements. <strong>Smart Contracts</strong> replace intermediaries with cryptographic mathematics and distributed consensus.`
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
        title: "Uniswap & The Constant-Product Formula (x · y = k)",
        content: `Decentralized exchanges like Uniswap eliminate central limit order books using Automated Market Makers (AMMs). Liquidity pools maintain the invariant <code>x · y = k</code>. Trades shift token balances along a hyperbolic curve, automatically adjusting prices based on supply and demand without human market makers.`
      }
    ],
    concepts: [
      { name: "Smart Contract", desc: "Autonomous self-executing program residing on the blockchain" },
      { name: "Deterministic Address", desc: "Address derived via 0x + hash(code + deployer + nonce)" },
      { name: "State Storage", desc: "Persistent on-chain variables modified strictly by contract rules" },
      { name: "Uniswap AMM (x · y = k)", desc: "Constant product formula providing algorithmic liquidity" }
    ]
  },

  objectives: [
    {
      id: "lvl6_obj1",
      title: "1. Deploy an Autonomous Smart Contract",
      desc: "Deploy an Escrow, Voting, or ERC-20 Token contract and verify deterministic address generation.",
      xp: 75,
      completed: false,
      check: (state) => state.hasDeployedContract === true
    },
    {
      id: "lvl6_obj2",
      title: "2. Invoke a Cryptographically Signed Function",
      desc: "Call an on-chain contract method with a signed transaction verified through the network pipeline.",
      xp: 75,
      completed: false,
      check: (state) => state.totalInvocations >= 1
    },
    {
      id: "lvl6_obj3",
      title: "3. Trigger State Transition & Inspect Receipts",
      desc: "Mutate stored contract state (e.g. deposit/release escrow, cast vote, or transfer/mint tokens).",
      xp: 75,
      completed: false,
      check: (state) => state.hasMutatedState === true
    },
    {
      id: "lvl6_obj4",
      title: "4. Test the Uniswap AMM Swap (x · y = k)",
      desc: "Execute a simulated constant-product token swap to observe how the algorithmic price curve shifts.",
      xp: 75,
      completed: false,
      check: (state) => state.hasTestedAMM === true
    }
  ],

  initLab(container, onStateChange) {
    let selectedContractType = 'escrow'; // 'escrow' | 'voting' | 'token'
    let lastCallReceipt = null;
    let activeSubTab = 'contract'; // 'contract' | 'amm'

    let selectedPair = 'stquest'; // 'stquest' (stQUEST / QUEST) | 'eth' (ETH / QUEST)

    // Simulated AMM pool reserves (ETH / QUEST)
    const ammPoolETH = {
      reserveETH: 10.0,
      reserveQUEST: 1000.0,
      get k() { return this.reserveETH * this.reserveQUEST; }
    };

    // Simulated Liquid Staking AMM pool (stQUEST / QUEST)
    const ammPoolLST = {
      reserveLST: 500.0,
      reserveQUEST: 500.0,
      get k() { return this.reserveLST * this.reserveQUEST; }
    };

    const missionState = {
      hasDeployedContract: smartContractEngine.activeContract !== null,
      totalInvocations: 0,
      hasMutatedState: false,
      hasTestedAMM: false
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
    function deposit() external payable;
    function approveRelease() external;
    function refund() external;
}`;
      } else if (type === 'voting') {
        return `contract DAOVoting {
    string public proposal = "Upgrade Hash to SHA-3";
    uint256 public yesVotes;
    uint256 public noVotes;
    function voteYes() external;
    function voteNo() external;
    function finalizeProposal() external;
}`;
      } else {
        return `contract QuestXToken {
    string public symbol = "QTX";
    uint256 public totalSupply = 1000;
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

      const isLST = selectedPair === 'stquest';
      const activePool = isLST ? ammPoolLST : ammPoolETH;
      const spotPrice = isLST 
        ? (ammPoolLST.reserveQUEST / ammPoolLST.reserveLST).toFixed(3)
        : (ammPoolETH.reserveQUEST / ammPoolETH.reserveETH).toFixed(2);

      container.innerHTML = `
        <!-- Sub-Tab Switcher -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button id="tab-sub-contracts" class="hud-btn ${activeSubTab === 'contract' ? 'primary' : ''}" style="justify-content: center; font-size: 11px;">
            ⚙️ Smart Contract Runtime
          </button>
          <button id="tab-sub-amm" class="hud-btn ${activeSubTab === 'amm' ? 'primary' : ''}" style="justify-content: center; font-size: 11px; border-color: ${activeSubTab === 'amm' ? '#ff007a' : 'var(--border-subtle)'};">
            🦄 Uniswap AMM (x · y = k)
          </button>
        </div>

        ${activeSubTab === 'contract' ? `
          <!-- CONTRACT RUNTIME -->
          <!-- Contract Type Selector -->
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

          <!-- Deployment Preview Card -->
          <div class="theory-card" style="background: linear-gradient(145deg, #18112b, #0d0c1e); border-color: var(--accent-purple); margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
              <strong style="color: var(--accent-purple); font-size: 11px;">
                📦 DEPLOYMENT COMPILER: ${selectedContractType.toUpperCase()}
              </strong>
              <button class="btn-explain" data-explain="ch7_deterministic_addr" title="Explain Addressing">ℹ️ Explain</button>
            </div>

            <pre style="background: rgba(0,0,0,0.6); padding: 6px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 9px; line-height: 1.35; color: #a5b4fc; overflow-x: auto; margin-bottom: 8px;">${getCodeSnippet(selectedContractType)}</pre>

            <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 4px; border: 1px dashed rgba(157, 78, 221, 0.3); font-family: var(--font-mono); font-size: 9px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Deployer Nonce:</span>
                <span style="color: var(--accent-amber);">#${playerWallet.nonce}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--accent-purple); font-weight: bold;">Predicted Address:</span>
                <strong style="color: var(--accent-cyan);">${predictedAddr.substring(0, 12)}...${predictedAddr.substring(34)}</strong>
              </div>
            </div>

            <button id="btn-deploy-contract" class="hud-btn primary" style="width: 100%; justify-content: center; background: var(--accent-purple); font-weight: bold; padding: 7px;">
              🚀 Deploy ${selectedContractType.toUpperCase()} to Blockchain
            </button>
          </div>

          ${activeContract ? `
            <!-- Active Contract Controls -->
            <div class="theory-card" style="background: linear-gradient(145deg, #0e1a2f, #081120); border-color: var(--accent-cyan); margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
                <strong style="color: var(--accent-cyan); font-size: 11px;">
                  ⚡ ACTIVE INSTANCE: ${activeContract.name}
                </strong>
                <button class="btn-explain" data-explain="ch7_contract_call" title="Explain Contract Calls">ℹ️ Explain</button>
              </div>

              <!-- Methods -->
              ${activeContract.type === 'escrow' ? `
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
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: grid; grid-template-columns: 1.5fr 1fr auto; gap: 4px;">
                    <select id="token-recipient-select" class="tx-input" style="font-size: 9.5px; padding: 4px;">
                      <option value="${NPC_MERCHANTS[0].address}">Bob</option>
                      <option value="${NPC_MERCHANTS[1].address}">Alice</option>
                    </select>
                    <input type="number" id="token-transfer-amount" class="tx-input" value="50" min="1" max="1000" style="font-size: 9.5px; padding: 4px;" />
                    <button id="btn-token-transfer" class="hud-btn primary" style="font-size: 9.5px; padding: 4px 8px;">
                      Transfer
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr auto; gap: 4px;">
                    <input type="number" id="token-mint-amount" class="tx-input" value="250" min="1" style="font-size: 9.5px; padding: 4px;" />
                    <button id="btn-token-mint" class="hud-btn" style="font-size: 9.5px; padding: 4px 10px; border-color: var(--accent-purple); color: var(--accent-purple);">
                      Mint Supply
                    </button>
                  </div>
                </div>
              `}
            </div>
          ` : ''}
        ` : `
          <!-- UNISWAP AMM SIMULATOR -->
          <div class="theory-card" style="background: linear-gradient(145deg, #25091a, #14050e); border-color: #ff007a; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 0, 122, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #ff007a; font-size: 11px;">🦄 UNISWAP V2 AMM SIMULATOR</strong>
                <span class="badge-label" style="background: rgba(255,0,122,0.2); color: #ff007a; font-size: 8px;">x · y = k</span>
              </div>
              <button class="btn-explain" data-explain="defi_amm" title="Explain AMM">ℹ️ Explain</button>
            </div>

            <!-- Pair Selector -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
              <button id="btn-pair-stquest" class="hud-btn ${isLST ? 'primary' : ''}" style="justify-content: center; font-size: 9.5px; padding: 5px; ${isLST ? 'background: #ff007a; border-color: #ff007a;' : ''}">
                🌊 stQUEST / QUEST (LST)
              </button>
              <button id="btn-pair-eth" class="hud-btn ${!isLST ? 'primary' : ''}" style="justify-content: center; font-size: 9.5px; padding: 5px; ${!isLST ? 'background: #ff007a; border-color: #ff007a;' : ''}">
                💎 ETH / QUEST
              </button>
            </div>

            <!-- Player Holdings Banner -->
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); padding: 6px 8px; border-radius: 4px; font-size: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8;">Your Wallet:</span>
              <div style="display: flex; gap: 10px; font-family: var(--font-mono); font-weight: bold;">
                <span style="color: var(--accent-green);"><span style="color: #94a3b8; font-weight: normal;">QUEST:</span> ${playerWallet.balance.toFixed(2)}</span>
                <span style="color: var(--accent-cyan);"><span style="color: #94a3b8; font-weight: normal;">stQUEST:</span> ${(playerWallet.stQuestBalance || 0).toFixed(2)}</span>
              </div>
            </div>

            ${(playerWallet.stQuestBalance || 0) > 0 ? `
              <div style="background: rgba(0, 240, 255, 0.1); border-left: 3px solid var(--accent-cyan); padding: 6px 8px; border-radius: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.4;">
                <strong style="color: var(--accent-cyan);">🌊 Liquid Staking Token (stQUEST) Detected:</strong>
                You hold <strong>${(playerWallet.stQuestBalance || 0).toFixed(2)} stQUEST</strong> from your PoS validator delegation! You can trade it here on the Uniswap AMM for instant liquidity without waiting for validator unbonding!
              </div>
            ` : ''}

            <!-- Pool Reserves -->
            <div style="font-family: var(--font-mono); font-size: 10px; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Reserve X (${isLST ? 'stQUEST (LST)' : 'ETH'}):</span>
                <span style="color: var(--accent-cyan); font-weight: bold;">${isLST ? ammPoolLST.reserveLST.toFixed(2) + ' stQUEST' : ammPoolETH.reserveETH.toFixed(3) + ' ETH'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Reserve Y (QUEST):</span>
                <span style="color: var(--accent-green); font-weight: bold;">${activePool.reserveQUEST.toFixed(2)} QUEST</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
                <span style="color: #ff007a; font-weight: bold;">Constant Invariant k (x · y):</span>
                <strong style="color: #fff;">${activePool.k.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Instant Spot Price:</span>
                <span style="color: var(--accent-amber); font-weight: bold;">1 ${isLST ? 'stQUEST' : 'ETH'} = ${spotPrice} QUEST</span>
              </div>
            </div>

            <!-- Swap Form -->
            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 6px;">
              SWAP INPUT (${isLST ? 'stQUEST ➔ QUEST' : 'ETH ➔ QUEST'}):
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 6px; margin-bottom: 8px;">
              <input type="number" id="amm-swap-amount" class="tx-input" value="${isLST ? Math.min(10, Math.floor(playerWallet.stQuestBalance || 5)) || 5 : 1.0}" min="0.1" max="${isLST ? 100 : 5}" step="${isLST ? '1' : '0.5'}" style="padding: 6px; font-size: 11px;" />
              <button id="btn-amm-swap" class="hud-btn primary" style="background: #ff007a; font-weight: bold; font-size: 10.5px; padding: 6px 12px;">
                Swap for QUEST 🦄
              </button>
            </div>
            <div id="amm-swap-feedback" style="font-size: 9.5px; color: var(--accent-green); font-family: var(--font-mono); line-height: 1.4;"></div>
          </div>
        `}
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      // Sub-tab switcher
      document.getElementById('tab-sub-contracts')?.addEventListener('click', () => {
        activeSubTab = 'contract';
        renderLabUI();
      });
      document.getElementById('tab-sub-amm')?.addEventListener('click', () => {
        activeSubTab = 'amm';
        renderLabUI();
      });

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

      // Deploy Button
      document.getElementById('btn-deploy-contract')?.addEventListener('click', () => {
        try {
          const contract = smartContractEngine.deploy(selectedContractType, playerWallet);
          missionState.hasDeployedContract = true;
          notifyState();
          Toast.show("Contract Deployed! 🚀", `${contract.name} at ${contract.address.substring(0, 10)}...`, "success");
          eventBus.emit('SHOW_CONTRACT_MODAL');
          renderLabUI();
        } catch (err) {
          Toast.show("Deployment Error", err.message, "error");
        }
      });

      // Contract Method calls
      document.getElementById('btn-escrow-deposit')?.addEventListener('click', () => executeCall('deposit', {}));
      document.getElementById('btn-escrow-approve')?.addEventListener('click', () => executeCall('approveRelease', {}));
      document.getElementById('btn-escrow-refund')?.addEventListener('click', () => executeCall('refund', {}));
      document.getElementById('btn-vote-yes')?.addEventListener('click', () => executeCall('voteYes', {}));
      document.getElementById('btn-vote-no')?.addEventListener('click', () => executeCall('voteNo', {}));
      document.getElementById('btn-vote-finalize')?.addEventListener('click', () => executeCall('finalizeProposal', {}));
      document.getElementById('btn-token-transfer')?.addEventListener('click', () => {
        const toEl = document.getElementById('token-recipient-select');
        const amtEl = document.getElementById('token-transfer-amount');
        executeCall('transfer', { to: toEl?.value || NPC_MERCHANTS[0].address, amount: Number(amtEl?.value) || 50 });
      });
      document.getElementById('btn-token-mint')?.addEventListener('click', () => {
        const amtEl = document.getElementById('token-mint-amount');
        executeCall('mint', { amount: Number(amtEl?.value) || 250 });
      });

      // AMM Pair Switcher
      document.getElementById('btn-pair-stquest')?.addEventListener('click', () => {
        selectedPair = 'stquest';
        renderLabUI();
      });
      document.getElementById('btn-pair-eth')?.addEventListener('click', () => {
        selectedPair = 'eth';
        renderLabUI();
      });

      // AMM Swap execution
      document.getElementById('btn-amm-swap')?.addEventListener('click', () => {
        const amtInput = document.getElementById('amm-swap-amount');
        const deltaX = parseFloat(amtInput?.value) || 1.0;
        if (deltaX <= 0) return;

        if (selectedPair === 'stquest') {
          // Liquid Staking Swap: stQUEST -> QUEST
          if ((playerWallet.stQuestBalance || 0) < deltaX) {
            Toast.show("Insufficient stQUEST", `You have ${(playerWallet.stQuestBalance || 0).toFixed(2)} stQUEST. Delegate in Level 2 PoS to mint more!`, "error");
            return;
          }

          const newX = ammPoolLST.reserveLST + deltaX;
          const newY = ammPoolLST.k / newX;
          const deltaY = Number((ammPoolLST.reserveQUEST - newY).toFixed(2));

          ammPoolLST.reserveLST = newX;
          ammPoolLST.reserveQUEST = newY;

          playerWallet.stQuestBalance = Number((playerWallet.stQuestBalance - deltaX).toFixed(2));
          playerWallet.balance = Number((playerWallet.balance + deltaY).toFixed(2));

          eventBus.emit('WALLET_UPDATED', {
            address: playerWallet.address,
            balance: playerWallet.balance,
            stQuestBalance: playerWallet.stQuestBalance,
            publicKey: playerWallet.publicKey
          });

          missionState.hasTestedAMM = true;
          notifyState();
          renderLabUI();

          const feedbackEl = document.getElementById('amm-swap-feedback');
          if (feedbackEl) {
            feedbackEl.innerHTML = `✓ Swapped <strong>${deltaX.toFixed(2)} stQUEST (LST)</strong> for <strong>${deltaY.toFixed(2)} QUEST</strong>!<br>Constant Invariant k preserved: ${ammPoolLST.k.toLocaleString()}`;
          }
          Toast.show("LST Swap Completed! 🦄", `Exchanged ${deltaX.toFixed(1)} stQUEST for ${deltaY.toFixed(1)} QUEST via constant product curve.`, "success", 5000);
        } else {
          // ETH -> QUEST swap
          const newX = ammPoolETH.reserveETH + deltaX;
          const newY = ammPoolETH.k / newX;
          const deltaY = ammPoolETH.reserveQUEST - newY;

          ammPoolETH.reserveETH = newX;
          ammPoolETH.reserveQUEST = newY;

          missionState.hasTestedAMM = true;
          notifyState();
          renderLabUI();

          const feedbackEl = document.getElementById('amm-swap-feedback');
          if (feedbackEl) {
            feedbackEl.innerHTML = `✓ Swapped <strong>${deltaX.toFixed(2)} ETH</strong> for <strong>${deltaY.toFixed(2)} QUEST</strong>!<br>Invariant k preserved: ${ammPoolETH.k.toLocaleString()}`;
          }
          Toast.show("AMM Swap Executed! 🦄", `Received ${deltaY.toFixed(2)} QUEST at constant product k.`, "success", 4000);
        }
      });
    }

    function executeCall(fnName, args) {
      const active = smartContractEngine.activeContract;
      if (!active) return;
      try {
        const { tx, resultMessage } = smartContractEngine.callFunction(active.address, fnName, args, playerWallet);
        missionState.totalInvocations++;
        missionState.hasMutatedState = true;
        notifyState();
        renderLabUI();
        Toast.show(`Executed: ${fnName}() ⚡`, resultMessage, "success");
      } catch (err) {
        Toast.show("Call Revert", err.message, "error");
      }
    }

    renderLabUI();
    notifyState();
  }
};
