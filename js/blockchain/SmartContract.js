import { Crypto } from './Crypto.js';
import { Transaction } from './Transaction.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Base Smart Contract Class
 */
export class SmartContract {
  constructor(address, type, name, code, state = {}) {
    this.address = address;
    this.type = type; // 'escrow' | 'voting' | 'token'
    this.name = name;
    this.code = code;
    this.state = state;
    this.eventLogs = [];
  }

  logEvent(eventName, payload) {
    const entry = {
      event: eventName,
      payload,
      timestamp: Date.now()
    };
    this.eventLogs.push(entry);
    eventBus.emit('CONTRACT_EVENT_LOGGED', { contract: this, entry });
  }
}

/**
 * 1. Escrow Smart Contract
 * Holds funds trustlessly until buyer and seller authorize release or refund.
 */
export class EscrowContract extends SmartContract {
  constructor(address, buyerAddress, sellerAddress, depositAmount = 20.0) {
    const code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TrustlessEscrow {
    address public buyer;
    address public seller;
    uint256 public amount;
    bool public isFunded;
    bool public buyerApproved;
    bool public sellerApproved;
    enum State { AwaitingDeposit, Funded, Completed, Refunded }
    State public state;

    function deposit() external payable {
        require(!isFunded, "Already funded");
        isFunded = true;
        state = State.Funded;
    }

    function approveRelease() external {
        require(isFunded, "Not funded");
        if (msg.sender == buyer) buyerApproved = true;
        if (msg.sender == seller) sellerApproved = true;
        if (buyerApproved && sellerApproved) {
            state = State.Completed;
            payable(seller).transfer(amount);
        }
    }

    function refund() external {
        require(isFunded && state != State.Completed, "Cannot refund");
        state = State.Refunded;
        payable(buyer).transfer(amount);
    }
}`;

    const initialState = {
      buyer: buyerAddress,
      seller: sellerAddress,
      depositAmount: depositAmount,
      isFunded: false,
      buyerApproved: false,
      sellerApproved: false,
      escrowBalance: 0.0,
      status: "Awaiting Deposit"
    };

    super(address, 'escrow', 'Trustless Escrow Service', code, initialState);
  }

  deposit(callerTx) {
    if (this.state.isFunded) {
      throw new Error("Contract is already funded!");
    }
    this.state.isFunded = true;
    this.state.escrowBalance = this.state.depositAmount;
    this.state.status = "Funded (Locked in Escrow)";
    this.logEvent("FundsDeposited", { amount: this.state.depositAmount, by: callerTx.from });
    return `Deposited ${this.state.depositAmount} QUEST into Escrow contract.`;
  }

  approveRelease(callerTx) {
    if (!this.state.isFunded) {
      throw new Error("Escrow must be funded before release!");
    }
    if (this.state.status === "Completed") {
      throw new Error("Escrow is already completed and funds released.");
    }

    // In simulation, player call marks buyer approval; simulated merchant approves too
    this.state.buyerApproved = true;
    this.state.sellerApproved = true;
    this.state.status = "Completed (Released to Seller)";
    const releasedAmt = this.state.escrowBalance;
    this.state.escrowBalance = 0.0;

    this.logEvent("EscrowCompleted", { releasedAmount: releasedAmt, recipient: this.state.seller });
    return `Dual approvals confirmed! ${releasedAmt} QUEST released to ${this.state.seller.substring(0, 10)}...`;
  }

  refund(callerTx) {
    if (!this.state.isFunded) {
      throw new Error("Cannot refund an unfunded escrow.");
    }
    if (this.state.status === "Completed") {
      throw new Error("Cannot refund: funds already released to seller.");
    }
    this.state.status = "Refunded (Returned to Buyer)";
    const refundAmt = this.state.escrowBalance;
    this.state.escrowBalance = 0.0;
    this.logEvent("EscrowRefunded", { refundedAmount: refundAmt, to: this.state.buyer });
    return `Escrow cancelled. ${refundAmt} QUEST refunded to buyer.`;
  }
}

/**
 * 2. Voting Smart Contract (DAO Governance)
 * Implements decentralized voting with one vote per address.
 */
export class VotingContract extends SmartContract {
  constructor(address, proposal = "Upgrade Hash Algorithm to SHA-3") {
    const code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DAOVoting {
    string public proposal;
    uint256 public yesVotes;
    uint256 public noVotes;
    bool public isFinalized;
    mapping(address => bool) public hasVoted;

    function voteYes() external {
        require(!isFinalized, "Voting finalized");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;
        yesVotes += 1;
    }

    function voteNo() external {
        require(!isFinalized, "Voting finalized");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;
        noVotes += 1;
    }

    function finalizeProposal() external returns (string memory) {
        require(!isFinalized, "Already finalized");
        isFinalized = true;
        return yesVotes > noVotes ? "PASSED" : "REJECTED";
    }
}`;

    const initialState = {
      proposal,
      yesVotes: 0,
      noVotes: 0,
      voters: {},
      isFinalized: false,
      outcome: "Active Voting"
    };

    super(address, 'voting', 'DAO Governance Ballot', code, initialState);
  }

  voteYes(callerTx) {
    if (this.state.isFinalized) {
      throw new Error("Voting is already finalized!");
    }
    if (this.state.voters[callerTx.from]) {
      throw new Error("This address has already cast a ballot!");
    }
    this.state.voters[callerTx.from] = 'YES';
    this.state.yesVotes += 1;
    this.logEvent("VoteCast", { voter: callerTx.from, choice: "YES", totalYes: this.state.yesVotes });
    return `Vote YES recorded for ${callerTx.from.substring(0, 10)}... (Total YES: ${this.state.yesVotes})`;
  }

  voteNo(callerTx) {
    if (this.state.isFinalized) {
      throw new Error("Voting is already finalized!");
    }
    if (this.state.voters[callerTx.from]) {
      throw new Error("This address has already cast a ballot!");
    }
    this.state.voters[callerTx.from] = 'NO';
    this.state.noVotes += 1;
    this.logEvent("VoteCast", { voter: callerTx.from, choice: "NO", totalNo: this.state.noVotes });
    return `Vote NO recorded for ${callerTx.from.substring(0, 10)}... (Total NO: ${this.state.noVotes})`;
  }

  finalizeProposal(callerTx) {
    if (this.state.isFinalized) {
      throw new Error("Voting is already finalized.");
    }
    this.state.isFinalized = true;
    const passed = this.state.yesVotes > this.state.noVotes;
    this.state.outcome = passed ? "Proposal PASSED ✅" : "Proposal REJECTED ✕";
    this.logEvent("ProposalFinalized", { outcome: this.state.outcome, yes: this.state.yesVotes, no: this.state.noVotes });
    return `Proposal finalized: ${this.state.outcome} (${this.state.yesVotes} YES vs ${this.state.noVotes} NO)`;
  }
}

/**
 * 3. ERC-20 Token Smart Contract
 * Implements a fungible token standard with balance ledger and transfers.
 */
export class TokenContract extends SmartContract {
  constructor(address, ownerAddress, name = "QuestX Utility Token", symbol = "QTX", initialSupply = 1000) {
    const code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QuestXToken {
    string public name = "QuestX Token";
    string public symbol = "QTX";
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function mint(uint256 amount) external {
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
    }
}`;

    const initialState = {
      name,
      symbol,
      totalSupply: initialSupply,
      owner: ownerAddress,
      balances: {
        [ownerAddress]: initialSupply
      }
    };

    super(address, 'token', 'QuestX ERC-20 Token', code, initialState);
  }

  transfer(toAddress, amount, callerTx) {
    const numAmt = Number(amount);
    const senderBal = this.state.balances[callerTx.from] || 0;
    if (senderBal < numAmt) {
      throw new Error(`Insufficient ${this.state.symbol} balance: Have ${senderBal}, requested ${numAmt}.`);
    }
    this.state.balances[callerTx.from] = senderBal - numAmt;
    this.state.balances[toAddress] = (this.state.balances[toAddress] || 0) + numAmt;

    this.logEvent("Transfer", { from: callerTx.from, to: toAddress, amount: numAmt });
    return `Transferred ${numAmt} ${this.state.symbol} to ${toAddress.substring(0, 10)}... (Remaining: ${this.state.balances[callerTx.from]})`;
  }

  mint(amount, callerTx) {
    const numAmt = Number(amount);
    this.state.totalSupply += numAmt;
    this.state.balances[callerTx.from] = (this.state.balances[callerTx.from] || 0) + numAmt;
    this.logEvent("Mint", { by: callerTx.from, amount: numAmt, newSupply: this.state.totalSupply });
    return `Minted ${numAmt} ${this.state.symbol}. Total supply is now ${this.state.totalSupply} ${this.state.symbol}.`;
  }
}

/**
 * Smart Contract Engine Singleton
 * Manages deployment, deterministic address derivation, and function execution pipelines.
 */
export class SmartContractEngine {
  constructor() {
    this.deployedContracts = new Map();
    this.activeContract = null;
  }

  /**
   * Calculates deterministic contract address: 0x + hash(code + deployer + nonce)[0..40]
   */
  calculateContractAddress(code, deployerAddress, nonce) {
    const preimage = `${code}|${deployerAddress}|${nonce}`;
    return '0x' + Crypto.hashSync(preimage).substring(0, 40);
  }

  /**
   * Deploy a new contract of the specified type
   * @param {'escrow'|'voting'|'token'} type
   * @param {import('./Wallet.js').Wallet} deployerWallet
   * @param {Object} customParams
   * @returns {SmartContract}
   */
  deploy(type, deployerWallet, customParams = {}) {
    let dummyCode = "";
    if (type === 'escrow') dummyCode = "contract TrustlessEscrow { ... }";
    else if (type === 'voting') dummyCode = "contract DAOVoting { ... }";
    else dummyCode = "contract QuestXToken { ... }";

    const contractAddress = this.calculateContractAddress(
      dummyCode,
      deployerWallet.address,
      deployerWallet.nonce
    );

    let contract = null;
    if (type === 'escrow') {
      const seller = customParams.seller || "0xBob8940128394012839012839012839012839012";
      contract = new EscrowContract(contractAddress, deployerWallet.address, seller, customParams.amount || 20.0);
    } else if (type === 'voting') {
      contract = new VotingContract(contractAddress, customParams.proposal || "Upgrade Hash Algorithm to SHA-3");
    } else {
      contract = new TokenContract(contractAddress, deployerWallet.address, "QuestX Utility Token", "QTX", 1000);
    }

    // Deployer wallet nonce incremented as in real EVM
    deployerWallet.nonce++;

    this.deployedContracts.set(contractAddress, contract);
    this.activeContract = contract;

    eventBus.emit('CONTRACT_DEPLOYED', {
      contract,
      contractAddress,
      deployer: deployerWallet.address,
      type
    });

    return contract;
  }

  /**
   * Calls a contract function through the verification pipeline
   */
  callFunction(contractAddress, fnName, args, callerWallet) {
    const contract = this.deployedContracts.get(contractAddress);
    if (!contract) {
      throw new Error(`Contract not found at address ${contractAddress}`);
    }

    // 1. Create Call Transaction
    const tx = new Transaction(
      callerWallet.address,
      contractAddress,
      0, // Call value
      callerWallet.nonce,
      `${contract.name}.${fnName}()`,
      Date.now()
    );

    // 2. Cryptographic signature by caller
    tx.sign(callerWallet.privateKey);

    // 3. Verification Pipeline: Signature & Nonce check
    const isValidSig = tx.verify(callerWallet.privateKey);
    if (!isValidSig) {
      throw new Error("Cryptographic signature verification failed on contract call!");
    }

    // Advance nonce
    callerWallet.nonce++;

    // 4. Execute Contract Logic
    let resultMessage = "";
    if (contract.type === 'escrow') {
      if (fnName === 'deposit') {
        if (callerWallet.balance < contract.state.depositAmount) {
          throw new Error(`Insufficient wallet balance: have ${callerWallet.balance} QUEST, need ${contract.state.depositAmount} QUEST.`);
        }
        resultMessage = contract.deposit(tx);
        callerWallet.balance = Math.max(0, callerWallet.balance - contract.state.depositAmount);
        eventBus.emit('WALLET_UPDATED', { address: callerWallet.address, balance: callerWallet.balance });
      } else if (fnName === 'approveRelease') {
        resultMessage = contract.approveRelease(tx);
      } else if (fnName === 'refund') {
        resultMessage = contract.refund(tx);
        callerWallet.balance += contract.state.depositAmount;
        eventBus.emit('WALLET_UPDATED', { address: callerWallet.address, balance: callerWallet.balance });
      }
    } else if (contract.type === 'voting') {
      if (fnName === 'voteYes') resultMessage = contract.voteYes(tx);
      else if (fnName === 'voteNo') resultMessage = contract.voteNo(tx);
      else if (fnName === 'finalizeProposal') resultMessage = contract.finalizeProposal(tx);
    } else if (contract.type === 'token') {
      if (fnName === 'transfer') resultMessage = contract.transfer(args.to, args.amount, tx);
      else if (fnName === 'mint') resultMessage = contract.mint(args.amount, tx);
    }

    eventBus.emit('CONTRACT_INVOKED', {
      contract,
      fnName,
      tx,
      resultMessage,
      updatedState: contract.state
    });

    return { tx, resultMessage, state: contract.state };
  }
}

export const smartContractEngine = new SmartContractEngine();
