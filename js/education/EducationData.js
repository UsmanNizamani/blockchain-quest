/**
 * Blockchain Quest - Comprehensive Educational Data Repository
 * Unifies Glossary, Level Quizzes, "Explain This" Micro-Explanations,
 * Level Completion Summaries, and Real-World Case Studies (Bitcoin, Ethereum, Uniswap, etc.)
 */

export const LEVEL_METADATA = {
  1: {
    id: 1,
    title: "Level 1: Hash Chain Guardian",
    role: "Hash Chain Guardian",
    icon: "🛡️",
    badge: "FOUNDATIONS",
    kpReward: 250,
    subtitle: "Block Headers, Hash Pointers, and Tamper-Evidence",
    desc: "Master cryptographic hashing, build the Genesis block, and defend the chain against fraudulent data tampering.",
    codexUnlockIds: ["sha256", "avalanche", "block", "hash_pointer", "genesis_block"]
  },
  2: {
    id: 2,
    title: "Level 2: Miner",
    role: "Proof-of-Work Miner",
    icon: "⛏️",
    badge: "THERMODYNAMICS",
    kpReward: 250,
    subtitle: "Proof of Work, Nonce Computation, and Target Difficulty",
    desc: "Harness physical computing power to discover winning nonces and understand Bitcoin's thermodynamic security model.",
    codexUnlockIds: ["pow", "nonce", "difficulty"]
  },
  3: {
    id: 3,
    title: "Level 3: Wallet Owner",
    role: "Sovereign Wallet Owner",
    icon: "💼",
    badge: "CRYPTOGRAPHY",
    kpReward: 250,
    subtitle: "Asymmetric Keypairs, Digital Signatures, and Sequential Nonces",
    desc: "Generate unforgeable private keys, authorize transactions with digital signatures, and prevent replayed transfers.",
    codexUnlockIds: ["asymmetric_crypto", "private_key", "digital_signature", "account_nonce"]
  },
  4: {
    id: 4,
    title: "Level 4: Node Operator",
    role: "P2P Node Operator",
    icon: "📡",
    badge: "CONSENSUS",
    kpReward: 250,
    subtitle: "Peer-to-Peer Gossip Mesh & Zero-Trust Verification",
    desc: "Run a decentralized network node, gossip transactions across peers, and enforce 4-point invariant checks without central authority.",
    codexUnlockIds: ["p2p_network", "byzantine_fault"]
  },
  5: {
    id: 5,
    title: "Level 5: Defender",
    role: "Network Security Defender",
    icon: "⚔️",
    badge: "GAME THEORY",
    kpReward: 250,
    subtitle: "51% Majority Attack Defense & Double-Spend Collision Prevention",
    desc: "Defend against a 60% hashrate reorganization attack and watch validator nodes reject duplicate-nonce double-spend attempts.",
    codexUnlockIds: ["attack_51", "double_spending"]
  },
  6: {
    id: 6,
    title: "Level 6: DeFi Trader",
    role: "Decentralized Finance Architect",
    icon: "🏛️",
    badge: "SMART CONTRACTS",
    kpReward: 300,
    subtitle: "Smart Contracts, Deterministic Addressing, and Uniswap AMM",
    desc: "Deploy autonomous contracts (Escrow, Voting, ERC-20 Tokens), call EVM methods on-chain, and explore Uniswap's constant-product formula.",
    codexUnlockIds: ["smart_contract", "evm", "deterministic_address", "erc20", "defi", "amm", "liquidity_pool", "dao"]
  },
  7: {
    id: 7,
    title: "Level 7: Merkle Trees & State Proofs",
    role: "Cryptographic Proof Architect",
    icon: "🌳",
    badge: "STATE PROOFS",
    kpReward: 300,
    subtitle: "Pairwise Hash Trees, Sibling Proofs, and SPV Light Clients",
    desc: "Construct binary Merkle trees, witness avalanche effects across parent hashes, verify logarithmic inclusion proofs, and explore SPV light client scaling.",
    codexUnlockIds: ["merkle_trees", "spv_light_clients", "merkle_proofs"]
  }
};

export const LEVEL_SUMMARIES = {
  1: {
    levelId: 1,
    title: "Level 1 Mastered: Hash Chain Guardian!",
    role: "Chain Guardian",
    kpEarned: 250,
    conceptsMastered: [
      "SHA-256 One-Way Deterministic Digest",
      "Avalanche Diffusion Behavior (~50% bit flip)",
      "Block Structure (Index, Timestamp, Data, Nonce, PrevHash)",
      "Cryptographic Hash Pointers Linking Blocks",
      "Genesis Block Bedrock (#0)"
    ],
    summary: "You have mastered the foundational building blocks of all distributed ledgers. By modifying transactions inside historical blocks, you observed firsthand how SHA-256 causes immediate downstream hash mismatches, rendering historical tampering mathematically impossible.",
    realWorldAnchor: "Git commit history and corporate double-entry accounting ledgers utilize this exact hash-pointer architecture to eliminate undetected balance-sheet fraud.",
    nextTeaser: "In Level 2, you will step into the shoes of a Proof-of-Work Miner and burn computational cycles to secure the chain."
  },
  2: {
    levelId: 2,
    title: "Level 2 Mastered: Proof-of-Work Miner!",
    role: "Thermodynamic Miner",
    kpEarned: 250,
    conceptsMastered: [
      "Proof of Work (PoW) Puzzle Solving",
      "Nonce Incrementing & Brute-Force Search",
      "Self-Adjusting Difficulty Target Prefixes",
      "Hashrate Measurement (Hashes / Second)",
      "Thermodynamic Invariant: Anchoring Digital Truth to Energy"
    ],
    summary: "You demonstrated why decentralized consensus requires physical energy expenditure. By varying arbitrary nonces until discovering a hash starting with the difficulty target, you experienced the thermodynamic work required to produce valid blocks.",
    realWorldAnchor: "Bitcoin secures over $1 Trillion in global wealth through this thermodynamic puzzle, adjusting difficulty every 2,016 blocks so money cannot be printed by political decree.",
    nextTeaser: "In Level 3, you will take ownership of your personal cryptographic keypair and author unforgeable digital signatures."
  },
  3: {
    levelId: 3,
    title: "Level 3 Mastered: Sovereign Wallet Owner!",
    role: "Wallet Owner",
    kpEarned: 250,
    conceptsMastered: [
      "Asymmetric Cryptography (Private Key & Public Address)",
      "ECDSA Mathematical Digital Signatures",
      "Unforgeable Proof of Authorization",
      "Sequential Account Nonces (#0, #1, #2...)"
    ],
    summary: "You mastered the sovereign ownership model of Web3: 'Not your keys, not your coins'. Your 256-bit private key acts as an unstealable master seal, signing transactions that anyone worldwide can verify using your public address without intermediaries.",
    realWorldAnchor: "Asymmetric cryptography powers every cryptocurrency wallet (Ledger, MetaMask) as well as end-to-end HTTPS internet security.",
    nextTeaser: "In Level 4, you will step outside your wallet and operate an independent P2P network node that verifies incoming transactions."
  },
  4: {
    levelId: 4,
    title: "Level 4 Mastered: P2P Node Operator!",
    role: "Node Operator",
    kpEarned: 250,
    conceptsMastered: [
      "Peer-to-Peer (P2P) Gossip Mesh Propagation",
      "Zero-Trust Independent Invariant Verification",
      "Mempool Queuing & Validation",
      "4-Point Invariant Rule Enforcement (Sig, Balance, Nonce, Conflict)"
    ],
    summary: "You experienced how decentralized consensus functions without a CEO or central server. By routing transactions to independent validator nodes, you witnessed honest nodes independently verify signatures, balances, and nonces before admitting packets to the mempool.",
    realWorldAnchor: "Tens of thousands of independent Bitcoin and Ethereum nodes across the globe prevent authoritarian censorship, payment freezing, and single-point-of-failure cloud outages.",
    nextTeaser: "In Level 5, you will defend the network against majority 51% hashrate reorganizations and malicious double-spend attempts."
  },
  5: {
    levelId: 5,
    title: "Level 5 Mastered: Network Security Defender!",
    role: "Defender",
    kpEarned: 250,
    conceptsMastered: [
      "51% Majority Consensus Attack Dynamics",
      "Nakamoto Longest-Chain Rule & Reorganization",
      "Nash Equilibrium & Economic Game Theory",
      "Double-Spend Nonce Collision Prevention ('NONCE ALREADY USED')"
    ],
    summary: "You explored the ultimate attack vectors of blockchain technology. You witnessed why 51% attacks are theoretically possible under majority hashrate but economically irrational, and verified how sequential account nonces eliminate double-spending in the mempool.",
    realWorldAnchor: "Game theory guarantees that an entity commanding majority hashrate earns vastly more capital by mining honestly than by attacking the network.",
    nextTeaser: "In Level 6, you will ascend to the final frontier: writing self-executing Smart Contracts and exploring Uniswap DeFi liquidity pools."
  },
  6: {
    levelId: 6,
    title: "Level 6 Mastered: Decentralized Finance Architect!",
    role: "DeFi Architect",
    kpEarned: 300,
    conceptsMastered: [
      "Autonomous Smart Contracts (Code is Law)",
      "Ethereum Virtual Machine (EVM) World Computer",
      "Deterministic Contract Addressing (0x + SHA-256)",
      "Escrow, Voting, and ERC-20 Fungible Tokens",
      "Uniswap Automated Market Maker Invariant (x · y = k)"
    ],
    summary: "You have completed the full journey of the Blockchain Explorer. By deploying trustless escrows, DAO ballots, and custom ERC-20 tokens with deterministic addressing, you proved that computer code can enforce complex financial agreements without human middlemen.",
    realWorldAnchor: "Ethereum and Uniswap process over $1.5 Trillion in automated trades through mathematical liquidity pools, replacing Wall Street brokerage desks with transparent, self-executing software.",
    nextTeaser: "In Level 7, you will explore Merkle Trees, cryptographic audit paths, and SPV light client scaling."
  },
  7: {
    levelId: 7,
    title: "Level 7 Mastered: Cryptographic Proof Architect!",
    role: "Proof Architect",
    kpEarned: 300,
    conceptsMastered: [
      "Pairwise Binary Merkle Tree Construction",
      "Cryptographic Avalanche Effect on Intermediate Nodes",
      "Logarithmic O(log N) Sibling Audit Paths",
      "Cryptographic Forgery Rejection",
      "SPV Light Client Bandwidth Scalability"
    ],
    summary: "You mastered the mathematical engine that allows global blockchains to scale. By constructing pairwise Merkle trees and verifying O(log N) inclusion proofs, you proved how smartphones can securely verify transactions without downloading hundreds of gigabytes of raw block history.",
    realWorldAnchor: "Bitcoin and Ethereum light clients, ZK-Rollups (Starknet, zkSync), and IPFS content networks all rely on Merkle proofs to verify massive datasets with negligible computational overhead.",
    nextTeaser: "🎉 Congratulations! You have conquered all 7 levels and earned the official 'Blockchain Complete!' Master Certificate!"
  }
};

export const GLOSSARY_TERMS = [
  {
    id: "sha256",
    term: "SHA-256",
    category: "Cryptography",
    badge: "HASHING",
    unlockLevel: 1,
    summary: "Secure Hash Algorithm generating a fixed 256-bit (64 hex char) digital fingerprint.",
    definition: "A cryptographic one-way mathematical function designed by the NSA. It transforms any arbitrary input data (from a single letter to an entire encyclopedia) into a deterministic 256-bit string. It is computationally infeasible to invert (find the input from the hash) or find two different inputs that produce the identical hash.",
    realWorld: "Used by Bitcoin for Proof of Work and address derivation, and by Git for tracking code commits.",
    keyTakeaway: "One-way street: Easy to calculate forward, impossible to reverse."
  },
  {
    id: "avalanche",
    term: "Avalanche Effect",
    category: "Cryptography",
    badge: "DIFFUSION",
    unlockLevel: 1,
    summary: "A tiny 1-character input change flips approximately 50% of all output hash bits.",
    definition: "A crucial property of secure cryptographic hash functions and block ciphers. If an input changes slightly (even flipping a single bit), the output changes drastically and pseudo-randomly. This guarantees that attackers cannot detect patterns or predict hash outputs.",
    realWorld: "Prevents attackers from using mathematical gradient descent to guess passwords or cryptographic secrets.",
    keyTakeaway: "Changing 'cat' to 'Cat' produces completely unrelated hashes."
  },
  {
    id: "block",
    term: "Block",
    category: "Architecture",
    badge: "CONTAINER",
    unlockLevel: 1,
    summary: "A cryptographic package of verified transactions linked to previous history.",
    definition: "The fundamental unit of a blockchain ledger. A block contains a block header (index, timestamp, previous block hash, Merkle root, difficulty target, nonce) and a body containing a batch of verified transactions.",
    realWorld: "Bitcoin blocks average 1MB to 2MB every ~10 minutes; Ethereum blocks process every ~12 seconds.",
    keyTakeaway: "A digital ledger page permanently stamped with cryptographic seal."
  },
  {
    id: "hash_pointer",
    term: "Hash Pointer / Chain Link",
    category: "Architecture",
    badge: "LINKAGE",
    unlockLevel: 1,
    summary: "A cryptographic pointer that references both the location and hash of previous data.",
    definition: "Unlike a regular memory pointer that only tells you WHERE data is stored, a hash pointer also stores the cryptographic hash of that data. If any earlier block is altered, its hash changes, causing an immediate mismatch with the hash pointer stored in the subsequent block.",
    realWorld: "Git commit history and Merkle trees rely on hash pointers to detect silent corruption.",
    keyTakeaway: "Provides mathematical tamper-evidence from the genesis block to the tip of the chain."
  },
  {
    id: "genesis_block",
    term: "Genesis Block (Block #0)",
    category: "Architecture",
    badge: "ORIGIN",
    unlockLevel: 1,
    summary: "The very first block ever mined on a blockchain network.",
    definition: "Block zero has no previous block to reference, so its previousHash is hardcoded to all zeros (e.g., 0000...0000). It establishes the initial rules, parameters, and token distribution of the network.",
    realWorld: "Bitcoin Block #0 was mined on Jan 3, 2009, containing Satoshi's famous newspaper headline: 'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks.'",
    keyTakeaway: "The immutable bedrock upon which the entire ledger is built."
  },
  {
    id: "pow",
    term: "Proof of Work (PoW)",
    category: "Consensus",
    badge: "ENERGY SECURITY",
    unlockLevel: 2,
    summary: "Consensus mechanism requiring miners to expend physical computational energy.",
    definition: "Invented to prevent spam and Sybil attacks by requiring proof that real computational work was performed. In Nakamoto Consensus, nodes always adopt the valid chain with the most accumulated Proof of Work ('longest chain rule').",
    realWorld: "Bitcoin Network secures over $1 Trillion in value through thermodynamic energy expenditure.",
    keyTakeaway: "Tethers digital ledger truth directly to physical laws of thermodynamics and electricity."
  },
  {
    id: "nonce",
    term: "Nonce (Number Used Once)",
    category: "Consensus & Mining",
    badge: "COUNTER",
    unlockLevel: 2,
    summary: "An arbitrary counter value varied by miners to solve a cryptographic puzzle.",
    definition: "In Proof of Work, the block data and previous hash are fixed. The nonce is the only variable the miner can change. Miners increment the nonce millions of times per second until the SHA-256 hash of the block satisfies the network's current difficulty target (e.g. starts with N leading zeros).",
    realWorld: "Bitcoin miners test billions of nonces per second across specialized ASIC chips.",
    keyTakeaway: "The cryptographic lottery ticket miners scratch repeatedly until hitting a winning hash."
  },
  {
    id: "difficulty",
    term: "Mining Difficulty Target",
    category: "Consensus",
    badge: "EQUILIBRIUM",
    unlockLevel: 2,
    summary: "A self-adjusting target that keeps block generation times stable regardless of total hashrate.",
    definition: "As more miners join the network and hashrate increases, blocks would be found too quickly. The protocol automatically adjusts the difficulty (increasing required leading zeros) so that blocks arrive at a predictable cadence.",
    realWorld: "Bitcoin recalibrates difficulty every 2,016 blocks (~2 weeks) to maintain a strict 10-minute average block time.",
    keyTakeaway: "A decentralized thermostat regulating block creation speed."
  },
  {
    id: "asymmetric_crypto",
    term: "Asymmetric Cryptography (Public-Key)",
    category: "Cryptography",
    badge: "KEYPAIR",
    unlockLevel: 3,
    summary: "Cryptographic system using a pair of keys: a private secret key and a public address.",
    definition: "Unlike symmetric cryptography where the same password encrypts and decrypts, asymmetric systems use mathematical one-way trapdoors (like Elliptic Curves or RSA). The private key signs messages; anyone with the public key can verify the signature without knowing the private key.",
    realWorld: "Underpins all cryptocurrency wallets, SSL/TLS web certificates (HTTPS), and SSH access keys.",
    keyTakeaway: "Public key is your mailbox address; Private key is the only key that unlocks the mail."
  },
  {
    id: "private_key",
    term: "Private Key",
    category: "Cryptography",
    badge: "IDENTITY",
    unlockLevel: 3,
    summary: "A 256-bit secret number that confers total ownership and authorization over blockchain funds.",
    definition: "A randomly generated 256-bit integer (typically displayed as 64 hex characters or a 12-word seed phrase). It is mathematically bound to your public address. Losing your private key means your funds are permanently inaccessible; revealing it lets anyone steal your funds.",
    realWorld: "'Not your keys, not your coins' — the foundational principle of financial self-sovereignty.",
    keyTakeaway: "The ultimate cryptographic master key. Never share it with anyone."
  },
  {
    id: "digital_signature",
    term: "Digital Signature",
    category: "Cryptography",
    badge: "AUTHORIZATION",
    unlockLevel: 3,
    summary: "A mathematical proof that a specific transaction was authorized by the account private key holder.",
    definition: "Created by combining the transaction hash with the sender's private key. The signature is mathematically unique to both that specific transaction and that specific key. If an attacker alters the recipient or amount by 1 cent, the signature becomes invalid.",
    realWorld: "Bitcoin uses ECDSA (secp256k1) and Schnorr signatures to authorize all UTXO spending.",
    keyTakeaway: "Unforgeable proof of intent that cannot be copied or replayed for different amounts."
  },
  {
    id: "account_nonce",
    term: "Account Nonce (Replay Protection)",
    category: "Architecture",
    badge: "ANTI-DOUBLE-SPEND",
    unlockLevel: 3,
    summary: "A strictly sequential counter tracking transaction order from an account to prevent replay attacks.",
    definition: "In account-based blockchains (like Ethereum), each account has an integer nonce starting at 0. Each outgoing transaction must specify the exact next nonce (0, 1, 2...). Nodes reject any transaction with a duplicate or out-of-order nonce, making double-spending mathematically impossible.",
    realWorld: "Ethereum rejects transactions with 'nonce too low' or 'nonce already used'.",
    keyTakeaway: "Guarantees digital scarcity by enforcing strict, irreversible transaction order."
  },
  {
    id: "p2p_network",
    term: "Peer-to-Peer (P2P) Gossip Network",
    category: "Consensus",
    badge: "NETWORK",
    unlockLevel: 4,
    summary: "A decentralized mesh where every node communicates directly without a central server.",
    definition: "Instead of relying on a central database server (like AWS or Visa), blockchain transactions and blocks are propagated using a peer-to-peer gossip protocol. Each node shares new valid packets with its neighboring peers until the entire global network achieves synchronization.",
    realWorld: "Similar to BitTorrent file sharing, ensuring resilience against single-point-of-failure outages or government takedowns.",
    keyTakeaway: "No central server to attack, subpoena, or censor."
  },
  {
    id: "byzantine_fault",
    term: "Byzantine Fault Tolerance (BFT)",
    category: "Consensus",
    badge: "GAME THEORY",
    unlockLevel: 4,
    summary: "The ability of a distributed network to reach consensus even if some nodes lie or act maliciously.",
    definition: "Derived from the classical 'Byzantine Generals Problem', where generals must coordinate an attack over untrusted messengers. In blockchain networks, honest nodes outvote and reject dishonest nodes by enforcing strict mathematical invariants.",
    realWorld: "Allows Bitcoin and Ethereum to operate securely across thousands of anonymous, untrusted global computers.",
    keyTakeaway: "Trust the math and consensus incentives, not individual participants."
  },
  {
    id: "attack_51",
    term: "51% Attack",
    category: "Consensus",
    badge: "THREAT MODEL",
    unlockLevel: 5,
    summary: "An attack where an entity controls majority hashrate to rewrite recent blocks and double-spend.",
    definition: "If a single coalition controls >50% of the network's mining power, they can secretly mine a longer private chain and broadcast it to cause a chain reorganization. However, they cannot steal other users' private keys or forge arbitrary transactions.",
    realWorld: "Economically irrational on large networks like Bitcoin, where the hardware and energy cost exceeds billions of dollars, and successful attacks crash the coin's market value.",
    keyTakeaway: "Theoretically possible, but defended by overwhelming game-theoretic and financial moats."
  },
  {
    id: "double_spending",
    term: "Double-Spending",
    category: "Threat Model",
    badge: "FRAUD",
    unlockLevel: 5,
    summary: "The fraudulent attempt to spend the exact same digital token in two separate transactions.",
    definition: "Because digital files (like MP3s or PDFs) can be duplicated endlessly, digital money historically required trusted central banks to prevent copying. Blockchain solved double-spending decentralized via sequential nonces and Proof of Work consensus.",
    realWorld: "Prevented in Bitcoin by UTXO validation and in Ethereum by account nonces and mempool collision checks.",
    keyTakeaway: "The historic computer science problem that Satoshi Nakamoto solved in 2008."
  },
  {
    id: "smart_contract",
    term: "Smart Contract",
    category: "Smart Contracts",
    badge: "AUTONOMOUS CODE",
    unlockLevel: 6,
    summary: "Self-executing code stored on the blockchain that runs exactly as written without intermediaries.",
    definition: "Programs deployed to deterministic addresses on a decentralized virtual machine. Their state variables are stored on-chain, and their methods can be invoked via signed transactions. Once deployed, their execution is unstoppable, censorship-resistant, and immutable.",
    realWorld: "Ethereum introduced Turing-complete smart contracts in 2015, powering over $100B in DeFi protocols.",
    keyTakeaway: "Code is Law: Contracts enforce their own execution without judges, banks, or escrow agents."
  },
  {
    id: "evm",
    term: "Ethereum Virtual Machine (EVM)",
    category: "Smart Contracts",
    badge: "VIRTUAL MACHINE",
    unlockLevel: 6,
    summary: "The decentralized global computing runtime that executes smart contract bytecode across all nodes.",
    definition: "A quasi-Turing-complete stack machine embedded within every Ethereum node. Every node executes identical contract bytecode instructions to arrive at the exact same world state.",
    realWorld: "Powers Ethereum, Polygon, Arbitrum, Optimism, Avalanche C-Chain, and BNB Chain.",
    keyTakeaway: "A decentralized world computer that never goes down."
  },
  {
    id: "deterministic_address",
    term: "Deterministic Contract Address",
    category: "Smart Contracts",
    badge: "ADDRESSING",
    unlockLevel: 6,
    summary: "Contract addresses are computed mathematically: 0x + hash(code + deployer + nonce).",
    definition: "When deploying a smart contract, the resulting address is not random. It is calculated by hashing the deployer's address together with their current account nonce. This guarantees that every contract deployment has a predictable, globally unique address across all nodes.",
    realWorld: "Ethereum CREATE and CREATE2 opcodes allow counterfactual address prediction before funds are even deployed.",
    keyTakeaway: "You can know the exact address of a contract before it is ever broadcast."
  },
  {
    id: "erc20",
    term: "ERC-20 Token Standard",
    category: "Smart Contracts",
    badge: "FUNGIBLE TOKEN",
    unlockLevel: 6,
    summary: "The universal technical blueprint for fungible cryptographic tokens on EVM networks.",
    definition: "A standardized smart contract interface providing methods like balanceOf(), transfer(), transferFrom(), and approve(). Standardizing these methods allows decentralized exchanges, wallets, and protocols to interact with thousands of different tokens seamlessly.",
    realWorld: "USDC, USDT, UNI, LINK, and SHIB are all ERC-20 tokens running on Ethereum.",
    keyTakeaway: "The API standard that made global, permissionless token creation possible."
  },
  {
    id: "defi",
    term: "Decentralized Finance (DeFi)",
    category: "DeFi",
    badge: "FINANCIAL SYSTEM",
    unlockLevel: 6,
    summary: "Financial services (trading, borrowing, lending, escrow) built entirely on smart contracts.",
    definition: "An open, permissionless financial architecture built without traditional banks or centralized brokerages. Anyone with an internet connection and a Web3 wallet can trade, borrow, earn yield, or provide liquidity globally 24/7/365.",
    realWorld: "Uniswap, Aave, Compound, MakerDAO, and Curve process billions of dollars in daily transactions.",
    keyTakeaway: "Replacing Wall Street middlemen with open-source mathematical contracts."
  },
  {
    id: "amm",
    term: "Automated Market Maker (AMM)",
    category: "DeFi",
    badge: "ALGORITHMIC TRADING",
    unlockLevel: 6,
    summary: "Decentralized exchange mechanism using mathematical formulas (x · y = k) instead of order books.",
    definition: "Traditional exchanges match buyers and sellers on a central limit order book. AMMs replace order books with liquidity pools funded by users. Trades are executed directly against the liquidity pool using a constant product invariant (x · y = k), adjusting prices algorithmically based on supply and demand.",
    realWorld: "Pioneered by Uniswap, AMMs enable anyone to swap any token permissionlessly in seconds.",
    keyTakeaway: "No market maker firm needed: Math and liquidity pools provide instant liquidity."
  },
  {
    id: "liquidity_pool",
    term: "Liquidity Pool",
    category: "DeFi",
    badge: "CAPITAL POOL",
    unlockLevel: 6,
    summary: "Crowdsourced pools of tokens locked in a smart contract to facilitate peer-to-contract trades.",
    definition: "Users (Liquidity Providers) deposit pairs of tokens (e.g. ETH and USDC) into a smart contract pool. In exchange for enabling trades, providers earn a proportional share of the trading fees paid by traders on every swap.",
    realWorld: "Uniswap V2/V3 liquidity pools hold billions in TVL (Total Value Locked) across crypto pairs.",
    keyTakeaway: "Crowdsourced capital replacing centralized brokerage market-maker desks."
  },
  {
    id: "dao",
    term: "Decentralized Autonomous Organization (DAO)",
    category: "Smart Contracts",
    badge: "GOVERNANCE",
    unlockLevel: 6,
    summary: "An organization governed entirely by transparent code rules and token-holder voting.",
    definition: "Instead of a traditional corporate hierarchy with CEOs and board members, DAOs manage treasuries and protocol parameters through on-chain proposals. Token holders cast cryptographically signed ballots, and code executes passed proposals automatically.",
    realWorld: "MakerDAO governs the multi-billion dollar DAI stablecoin; Uniswap DAO governs protocol fees and treasury.",
    keyTakeaway: "Democratic, transparent corporate governance written into unalterable code."
  },
  {
    id: "merkle_trees",
    term: "Merkle Tree (Hash Tree)",
    category: "Architecture & Cryptography",
    badge: "DATA STRUCTURE",
    unlockLevel: 7,
    summary: "A cryptographic binary tree where every parent node is the hash of its children.",
    definition: "Invented by Ralph Merkle in 1979. Transactions are hashed into leaves and aggregated pairwise into parent hashes until reaching a single Merkle Root. It allows efficient, secure verification of contents in large data structures with O(log N) complexity.",
    realWorld: "Used in Bitcoin block headers, Git commit trees, IPFS content addressing, and BitTorrent peer verification.",
    keyTakeaway: "Summarizes millions of records into a single 32-byte hash with mathematical tamper-evidence."
  },
  {
    id: "spv_light_clients",
    term: "SPV (Simplified Payment Verification)",
    category: "Architecture",
    badge: "LIGHT CLIENT",
    unlockLevel: 7,
    summary: "Verifying payments by checking block headers and Merkle proofs without downloading the full blockchain.",
    definition: "Detailed in Satoshi Nakamoto's Bitcoin whitepaper Section 8. SPV nodes only download the 80-byte block headers (~50 MB for the entire chain) and query full nodes for Merkle audit paths to verify that a transaction was confirmed with Proof of Work.",
    realWorld: "Powers mobile cryptocurrency wallets (e.g. Electrum, mobile Bitcoin/Ethereum wallets) on smartphones and IoT devices.",
    keyTakeaway: "Zero-trust verification on low-bandwidth devices without storing hundreds of gigabytes."
  },
  {
    id: "merkle_proofs",
    term: "Merkle Proof (Audit Path)",
    category: "Cryptography",
    badge: "INCLUSION PROOF",
    unlockLevel: 7,
    summary: "The logarithmic chain of sibling hashes proving a transaction exists in a block root.",
    definition: "To prove a transaction is inside a block of N transactions, a prover only provides the transaction itself plus the sibling hashes along the path to the root (log2(N) hashes). The verifier hashes up the path and checks if the result matches the trusted block header root.",
    realWorld: "Used in Ethereum light clients, Layer-2 optimistic and ZK-rollups (state proofs), and cross-chain bridges.",
    keyTakeaway: "Prove a needle is in a haystack with only a handful of sibling hashes."
  }
];

export const EXPLAIN_MICRO_TOPICS = {
  // LEVEL 1: HASH CHAIN GUARDIAN
  "ch1_input": {
    title: "Arbitrary Data Input",
    concept: "Input String",
    equation: "Input \\rightarrow SHA\\text{-}256(Input)",
    summary: "Any text, transaction payload, image, or document can be fed into SHA-256.",
    deepDive: "Cryptographic hash functions accept inputs of virtually any size (from 1 byte to millions of terabytes). In a blockchain, input data typically includes sender, receiver, amount, and timestamp.",
    realWorld: "Bitcoin hashes transaction data and block headers; Git hashes file contents into 40-character commit hashes."
  },
  "ch1_output_hash": {
    title: "SHA-256 Digest (64 Hex Characters)",
    concept: "Cryptographic Digest",
    equation: "256\\text{ bits} = 32\\text{ bytes} = 64\\text{ hexadecimal characters}",
    summary: "The unique mathematical fingerprint generated by SHA-256.",
    deepDive: "Because 256 bits have $2^{256}$ possible combinations (more than the total number of atoms in the observable universe), collisions are mathematically impossible under normal physics.",
    realWorld: "Used across HTTPS/SSL internet security, password storage, and blockchain consensus verification."
  },
  "ch1_avalanche": {
    title: "Avalanche Diffusion Rate",
    concept: "Avalanche Effect",
    equation: "\\text{Target Bit Flip} \\approx 50\\% \\text{ on 1-bit input change}",
    summary: "Measures the percentage of output bits that flipped compared to the previous input.",
    deepDive: "A secure cryptographic hash exhibits strict avalanche behavior: changing even one character flips approximately half the bits randomly. If bit flips clustered, attackers could reverse-engineer the original data.",
    realWorld: "Ensures passwords cannot be cracked through pattern analysis or partial matching."
  },
  "ch1_nonce": {
    title: "Cryptographic Nonce (Number Used Once)",
    concept: "Mining Variable",
    equation: "SHA\\text{-}256(\\text{Data} \\parallel \\text{Nonce}) < \\text{Target}",
    summary: "An incrementing integer counter used by miners to search for specific hash patterns.",
    deepDive: "Because hash outputs are pseudo-random, the ONLY way to find a hash starting with zeros is brute-force trial and error: vary the nonce, calculate the hash, and check if it meets the difficulty threshold.",
    realWorld: "Bitcoin mining rigs compute hundreds of exahashes ($10^{18}$ nonces) per second."
  },
  "ch2_block_header": {
    title: "Block Header & Structure",
    concept: "Atomic Ledger Unit",
    equation: "\\text{Block} = \\{ \\text{Index}, \\text{Timestamp}, \\text{Data}, \\text{PrevHash}, \\text{Nonce}, \\text{Hash} \\}",
    summary: "The data packet containing confirmed transactions and cryptographic metadata.",
    deepDive: "Each block bundles transaction history together with a cryptographic link to the preceding block. Once published, any modification invalidates the block's hash and downstream links.",
    realWorld: "Bitcoin produces ~1 block every 10 minutes; Ethereum produces a block every ~12 seconds."
  },
  "ch2_prev_hash": {
    title: "Previous Block Hash (Hash Pointer)",
    concept: "Cryptographic Backbone",
    equation: "\\text{Block}_{N}.\\text{previousHash} = \\text{Block}_{N-1}.\\text{hash}",
    summary: "The immutable glue linking each block to the one that came before it.",
    deepDive: "Because each block includes the hash of the preceding block in its own hash calculation, tampering with Block #1 changes its hash, which breaks Block #2's previousHash, cascading all the way to the newest block.",
    realWorld: "Eliminates historical revisionism: altering past transactions requires recalculating all subsequent blocks."
  },
  "ch2_tamper_console": {
    title: "Tamper Detection & Invariant Check",
    concept: "Tamper-Evidence",
    equation: "H(\\text{Tampered Data}) \\neq \\text{NextBlock.previousHash}",
    summary: "Simulates an attacker trying to alter a historical transaction record.",
    deepDive: "When an attacker changes even 1 cent in an old block, the hash recalculates completely. Every downstream node immediately notices the link mismatch and rejects the rogue chain.",
    realWorld: "Why banks and financial auditing firms are adopting blockchain ledgers to eliminate internal balance sheet fraud."
  },
  "ch2_integrity_bar": {
    title: "Chain Integrity Health Index",
    concept: "Cryptographic Validation",
    equation: "\\text{Integrity} = \\frac{\\text{Valid Links}}{\\text{Total Links}} \\times 100\\%",
    summary: "Real-time health monitor tracking whether all cryptographic links in the chain remain unbroken.",
    deepDive: "If any block's hash mismatches the next block's previousHash, the integrity score drops immediately and the network flags the anomaly.",
    realWorld: "Full blockchain nodes verify chain integrity continuously from the Genesis block to the tip."
  },

  // LEVEL 2: MINER
  "ch4_mine_btn": {
    title: "Proof of Work Mining Engine",
    concept: "Computational Energy Burn",
    equation: "H(\\text{Block Header}) < \\text{Target}",
    summary: "Simulates mining by testing sequential nonces until finding a hash starting with zeros.",
    deepDive: "Proof of Work forces miners to expend computational cycles and electricity. This makes rewriting historical blocks economically ruinous, because an attacker must redo all the computational work faster than the entire honest global network combined.",
    realWorld: "Bitcoin miners consume ~120 Terawatt-hours per year, creating an unhackable thermodynamic firewall."
  },
  "ch4_difficulty_slider": {
    title: "Difficulty Target Adjustment",
    concept: "Equilibrium Target",
    equation: "\\text{Difficulty} \\propto 16^{\\text{leading zeros}}",
    summary: "Adjusts the required number of leading zeros in the winning block hash.",
    deepDive: "Each additional leading zero makes the puzzle 16 times harder to solve ($16^1 = 16, 16^2 = 256, 16^3 = 4,096, 16^4 = 65,536$). This mechanism balances network block generation times as hashrates fluctuate.",
    realWorld: "Bitcoin adjusts difficulty every 2,016 blocks so average block time stays at exactly 10 minutes."
  },
  "ch4_retarget": {
    title: "Bitcoin Difficulty Retargeting",
    concept: "Self-Regulating Equilibrium",
    equation: "\\text{New Difficulty} = \\text{Old Difficulty} \\times \\left( \\frac{\\text{Actual Elapsed Time}}{\\text{Target Time}} \\right)",
    summary: "Difficulty adjustment is Bitcoin's self-regulating mechanism. More miners → higher difficulty → same block time.",
    deepDive: "Every 2,016 blocks (~2 weeks), Bitcoin recalculates the difficulty target based on how long the previous 2,016 blocks took. If miners added faster ASIC hardware and found blocks every 8 minutes, difficulty increases so future blocks take 10 minutes. If miners power off rigs and blocks take 12 minutes, difficulty decreases.",
    realWorld: "Bitcoin has adjusted difficulty over 400 times since 2009, maintaining a remarkably steady ~10-minute heartbeat despite global hashrate growing from 5 MH/s to over 600 EH/s (a 120 trillion-fold increase)!"
  },
  "pos_staking": {
    title: "Proof of Stake & Validator Consensus",
    concept: "Capital Collateral",
    equation: "P(\\text{Selected}) = \\frac{\\text{Validator Stake}}{\\sum \\text{Total Stake}}",
    summary: "In PoS, your influence is proportional to your stake. Attack the network → lose your capital.",
    deepDive: "Rather than burning terawatt-hours of physical electricity, Proof of Stake secures consensus through financial capital. Validators lock native coins as collateral. Every block slot, one validator is selected proportionally to their stake to propose a block, while peer validators attest (vote) to achieve 2/3 supermajority finality.",
    realWorld: "Ethereum switched from PoW to PoS in 2022 ('The Merge'), reducing energy consumption by 99.95% while securing over $350B in capital."
  },
  "pos_slashing": {
    title: "Cryptographic Slashing Mechanism",
    concept: "Economic Deterrent",
    equation: "\\text{Penalty} = 100\\% \\text{ Slashed Stake Confiscated}",
    summary: "In PoS, your influence is proportional to your stake. Attack the network → lose your capital.",
    deepDive: "Because proposing alternate blocks does not require physical electricity (the 'Nothing at Stake' vulnerability), protocols implement automated slashing rules. If a validator double-signs competing blocks for the same slot (equivocation), peer nodes submit cryptographic proof and the protocol instantly confiscates and burns their locked capital.",
    realWorld: "Guarantees economic finality: Reverting a finalized Ethereum epoch requires burning at least 33% to 66% of the entire network's staked ETH (tens of billions of dollars)."
  },

  // LEVEL 3: WALLET OWNER
  "ch6_private_key": {
    title: "256-bit Private Key",
    concept: "Cryptographic Master Key",
    equation: "\\text{Private Key} \\in [1, 2^{256} - 1]",
    summary: "Your secret mathematical authorization credential. Never share this with anyone!",
    deepDive: "Generated from 256 bits of high-entropy randomness. Your public address is derived through one-way elliptic curve multiplication. Only the private key holder can generate valid digital signatures to spend funds.",
    realWorld: "Stored in hardware wallets (Ledger, Trezor) or encrypted browser extensions (MetaMask)."
  },
  "ch6_digital_sig": {
    title: "Cryptographic Digital Signature",
    concept: "Non-Repudiation & Integrity",
    equation: "\\text{Signature} = \\text{Sign}_{\\text{PrivKey}}(\\text{TxHash})",
    summary: "A mathematical proof of authorization that cannot be forged or transferred to other transactions.",
    deepDive: "The signature mathematically binds the transaction details (amount, recipient, nonce) with the private key. If an attacker changes the recipient or amount by even 1 digit, the signature check fails immediately across all nodes.",
    realWorld: "Bitcoin uses ECDSA secp256k1 and Schnorr signatures for every on-chain transfer."
  },

  // LEVEL 4: NODE OPERATOR
  "ch3_broadcast": {
    title: "P2P Transaction Broadcast",
    concept: "Gossip Protocol",
    equation: "\\text{Node}_A \\rightarrow \\text{Neighbors} \\rightarrow \\text{Entire Network}",
    summary: "Propagates transactions to independent validator nodes across the mesh network.",
    deepDive: "When you send a transaction, your wallet sends it to a few neighboring nodes. Each node validates the transaction against all protocol rules. If valid, the node gossips it to its peers until all nodes have it in their mempool.",
    realWorld: "Bitcoin uses the Bitcoin P2P protocol; Ethereum uses DevP2P / libp2p over TCP/IP."
  },
  "ch3_node_checks": {
    title: "4-Point Independent Verification",
    concept: "Zero-Trust Consensus",
    equation: "\\text{Valid} = \\text{Signature} \\land \\text{Balance} \\land \\text{Nonce} \\land \\neg\\text{DoubleSpend}",
    summary: "The 4 invariant checks every node executes before accepting any transaction.",
    deepDive: "Nodes never trust transactions blindly. Every single node independently checks: 1) Is the signature valid? 2) Does the sender have enough balance? 3) Is the nonce sequential? 4) Is it a double-spend?",
    realWorld: "Even if a corrupt node approves a fraudulent transaction, honest nodes reject it and refuse to forward it."
  },

  // LEVEL 5: DEFENDER
  "ch4_51_attack": {
    title: "51% Consensus Reorganization Attack",
    concept: "Majority Hashrate Attack",
    equation: "\\text{Attacker Hashrate} > 50\\% \\implies \\text{Private Chain Outpaces Honest Chain}",
    summary: "Simulates an attacker commanding majority computing power to out-mine the honest chain.",
    deepDive: "Under Nakamoto Consensus, nodes follow the chain with the most accumulated Proof of Work. If an attacker controls >50% hashrate, they can secretly mine a longer chain and broadcast it to re-write recent history. However, doing so destroys user confidence and crashes the currency's value, making the attack economically suicidal.",
    realWorld: "Bitcoin's massive global hashrate makes acquiring 51% of hardware and electricity physically and financially impossible."
  },
  "ch6_double_spend": {
    title: "Double-Spend Prevention via Nonces",
    concept: "Account Nonce Registry",
    equation: "\\text{Expected Nonce} = \\text{Current Nonce} + 1",
    summary: "How nodes detect and reject duplicate attempts to spend the exact same coins.",
    deepDive: "When an address broadcasts a transaction with Nonce #0, that nonce is registered in the unconfirmed mempool. If the address broadcasts a second transaction also claiming Nonce #0, nodes catch the collision and reject it with 'NONCE ALREADY USED'.",
    realWorld: "Guarantees digital scarcity and prevents coin duplication in Ethereum and Bitcoin."
  },

  // LEVEL 6: DEFI TRADER
  "ch7_deterministic_addr": {
    title: "Deterministic Contract Addressing",
    concept: "EVM Address Calculation",
    equation: "\\text{Contract Address} = \\text{0x} + \\text{SHA-256}(\\text{Bytecode} \\parallel \\text{Deployer} \\parallel \\text{Nonce})[0..40]",
    summary: "Contract addresses are generated mathematically from code, deployer address, and account sequence nonce.",
    deepDive: "Unlike user wallets (derived from public keys), smart contracts get their address from the deployer's address and account nonce at the moment of deployment. This ensures the address is globally unique and reproducible across all network nodes.",
    realWorld: "Ethereum CREATE and CREATE2 opcodes allow decentralized protocols to deploy contracts at predictable addresses."
  },
  "ch7_contract_call": {
    title: "Cryptographic Contract Invocation",
    concept: "EVM State Mutation",
    equation: "\\text{CallTx} = \\{ \\text{From}, \\text{ContractAddr}, \\text{MethodData}, \\text{Nonce}, \\text{Sig} \\}",
    summary: "Calling an on-chain function requires a signed transaction that mutates persistent contract state.",
    deepDive: "Smart contract functions cannot run themselves. An external user must send a signed transaction calling the method. Nodes verify the caller's signature and nonce, execute the EVM bytecode, and update on-chain state storage.",
    realWorld: "Every swap on Uniswap, mint on OpenSea, or deposit on Aave is a signed EVM method call."
  },
  "ch7_storage_state": {
    title: "On-Chain Persistent State Storage",
    concept: "Immutable State Machine",
    equation: "S_{t+1} = \\Upsilon(S_t, \\text{Tx})",
    summary: "The key-value state storage residing permanently on the decentralized ledger.",
    deepDive: "Smart contracts hold persistent state (balances, escrow funds, voter registries) on the blockchain. Only the contract's own internal logic can mutate these variables, ensuring complete trustlessness.",
    realWorld: "ERC-20 token balances are stored in a simple Solidity mapping: mapping(address => uint256) public balanceOf."
  },
  "defi_amm": {
    title: "Uniswap Constant-Product AMM (x · y = k)",
    concept: "Automated Market Maker",
    equation: "x \\cdot y = k \\implies (x + \\Delta x)(y - \\Delta y) = k",
    summary: "The mathematical formula that enables decentralized peer-to-pool trading without human market makers.",
    deepDive: "In a token pool holding $x$ token A and $y$ token B, the invariant product $k$ must remain constant after every trade. When a trader deposits $\\Delta x$, they receive $\\Delta y = y - \\frac{k}{x + \\Delta x}$. The price naturally rises as supply diminishes.",
    realWorld: "Uniswap V2/V3 powers hundreds of billions in decentralized trade volume worldwide."
  }
};

export const LEVEL_QUIZZES = {
  1: {
    chapterId: 1,
    levelId: 1,
    title: "Level 1 Quiz: Hash Chain Guardian",
    subtitle: "Test your mastery of SHA-256, determinism, and tamper-evidence",
    xpReward: 150,
    questions: [
      {
        question: "What does it mean that SHA-256 is a 'deterministic' cryptographic hash function?",
        options: [
          "The output length changes depending on the size of the input data.",
          "Giving the exact same input will always produce the exact same 64-character hash.",
          "The hash can be easily reversed to find the original password.",
          "The hash updates automatically every 10 minutes like a clock."
        ],
        correctIndex: 1,
        explanation: "Determinism is fundamental: SHA-256 will produce the identical 64-character hexadecimal digest every single time for a given input, allowing nodes worldwide to verify data independently without a central coordinator."
      },
      {
        question: "If an attacker tampers with a transaction inside Block #1 on a 5-block chain, what happens to the downstream blocks?",
        options: [
          "All downstream blocks remain valid because only Block #1 was edited.",
          "The blockchain automatically corrects the data using an antivirus program.",
          "Block #1's hash changes, breaking the link to Block #2 and cascading invalidation across all subsequent blocks.",
          "The attacker receives free coins from the network."
        ],
        correctIndex: 2,
        explanation: "Because Block #2 incorporates Block #1's hash into its own hash calculation, tampering with Block #1 changes its hash and fractures the link to Block #2, invalidating the entire downstream chain."
      },
      {
        question: "Why is the Genesis Block (Block #0) unique compared to all other blocks?",
        options: [
          "It has no previous block, so its previousHash is hardcoded to all zeros.",
          "It is the only block that does not use SHA-256 hashing.",
          "It is stored on a centralized government server.",
          "It must be re-mined every 24 hours to stay active."
        ],
        correctIndex: 0,
        explanation: "The Genesis Block is the very first block in the blockchain. Because no history existed prior to it, its previousHash is set to all zeros (0000...0000), anchoring the entire ledger's timeline."
      }
    ]
  },

  2: {
    chapterId: 2,
    levelId: 2,
    title: "Level 2 Quiz: Miner (Proof of Work & Bitcoin)",
    subtitle: "Test your mastery of thermodynamic mining, difficulty adjustment, and energy security",
    xpReward: 150,
    questions: [
      {
        question: "In Bitcoin's Proof of Work system, what is the miner trying to accomplish when varying the nonce?",
        options: [
          "Decrypting the private keys of other users on the network.",
          "Finding a nonce that makes the block header's SHA-256 hash fall below the target (e.g. start with leading zeros).",
          "Downloading the fastest internet connection possible.",
          "Selecting which users are allowed to use the blockchain."
        ],
        correctIndex: 1,
        explanation: "Miners test billions of random nonce values per second searching for a hash that meets the network difficulty target (e.g. starting with several leading zeros). This proves computational work was expended."
      },
      {
        question: "Why does the blockchain automatically adjust the mining difficulty over time?",
        options: [
          "To keep average block generation times stable as total network computing power changes.",
          "To make sure only wealthy corporations can mine blocks.",
          "To decrease the electricity consumption to zero.",
          "To punish miners who produce blocks too slowly."
        ],
        correctIndex: 0,
        explanation: "As more miners join the network, difficulty increases; if miners leave, difficulty decreases. In Bitcoin, difficulty adjusts every 2,016 blocks (~2 weeks) so blocks arrive predictably every ~10 minutes on average."
      },
      {
        question: "Why is Proof of Work described as anchoring digital scarcity to physical reality?",
        options: [
          "Because miners must physically hand over paper cash to the government.",
          "Because bitcoins require real electrical energy and computing power to mint, so they cannot be printed out of thin air by fiat decree.",
          "Because miners must store gold in bank vaults.",
          "Because computers can only run Bitcoin on sunny days."
        ],
        correctIndex: 1,
        explanation: "Proof of Work bridges digital consensus to the physical laws of thermodynamics: creating valid blocks requires unforgeable energy burn, solving the fundamental problem of infinite digital copying."
      }
    ]
  },

  3: {
    chapterId: 3,
    levelId: 3,
    title: "Level 3 Quiz: Wallet Owner (Signatures & Nonces)",
    subtitle: "Test your mastery of asymmetric keypairs, signature verification, and account nonces",
    xpReward: 150,
    questions: [
      {
        question: "What is the Golden Rule of Asymmetric Cryptography in blockchain wallets?",
        options: [
          "Your public key must be kept secret, and your private key is shared with merchants.",
          "The private key proves ownership; only you can create valid signatures, and anyone can verify them with your public key.",
          "You must enter your private key every time you visit a website.",
          "Private keys are randomly generated by banks and stored on central servers."
        ],
        correctIndex: 1,
        explanation: "Asymmetric cryptography provides self-sovereign ownership: your private key signs transactions secretly, while your public key (address) allows anyone in the world to mathematically verify your signature."
      },
      {
        question: "How does a sequential account nonce prevent an attacker from executing a double-spend attack?",
        options: [
          "It forces users to wait 24 hours between every transaction.",
          "Each transaction must have a unique sequential number; repeating a used nonce causes immediate network rejection.",
          "It encrypts the user's name so nobody knows who sent the coins.",
          "It limits users to spending a maximum of 1 coin per day."
        ],
        correctIndex: 1,
        explanation: "Account nonces enforce total mathematical order ($0, 1, 2...$). If an attacker tries to broadcast a second transaction using the same nonce as a pending transaction, nodes detect the collision and reject it with 'NONCE ALREADY USED'."
      },
      {
        question: "If an attacker intercepts a signed transaction for 5 QUEST to Bob and alters the amount to 50 QUEST, what happens?",
        options: [
          "The network processes the 50 QUEST because the signature was already generated.",
          "The digital signature becomes mathematically invalid because the signature is bound to the original amount, causing all nodes to reject it.",
          "The sender's wallet automatically approves the difference.",
          "Bob receives 50 QUEST and the sender is fined."
        ],
        correctIndex: 1,
        explanation: "Digital signatures cryptographically bind to the transaction payload. If even 1 character or decimal place of the transaction data is altered, the mathematical signature verification fails completely."
      }
    ]
  },

  4: {
    chapterId: 4,
    levelId: 4,
    title: "Level 4 Quiz: Node Operator (P2P Network & Consensus)",
    subtitle: "Test your mastery of gossip protocols, independent node checks, and consensus rules",
    xpReward: 150,
    questions: [
      {
        question: "How do transactions propagate across a decentralized blockchain network without a central server?",
        options: [
          "Through a central cloud server hosted by Amazon AWS or Microsoft Azure.",
          "Via a Peer-to-Peer (P2P) gossip protocol where each node validates and forwards data to its neighbors.",
          "Transactions are manually approved by a committee of bank managers.",
          "Via satellite text messages broadcast once per week."
        ],
        correctIndex: 1,
        explanation: "Blockchains use peer-to-peer gossip networks: every node connects to several peer nodes, validates incoming transactions against protocol rules, and forwards valid packets to its peers until the entire network reaches consensus."
      },
      {
        question: "What happens if a malicious node approves a forged transaction and broadcasts it to honest nodes?",
        options: [
          "Honest nodes automatically trust it because one node already approved it.",
          "The forged transaction is added to the blockchain permanently.",
          "Honest nodes independently verify cryptographic invariants and immediately reject the counterfeit packet.",
          "The entire blockchain network shuts down."
        ],
        correctIndex: 2,
        explanation: "Zero trust: Nodes verify all invariants independently (signatures, balances, nonces). An attacker cannot deceive the network because honest nodes independently reject invalid transactions regardless of who forwarded them."
      },
      {
        question: "Which 4 checks must every transaction pass before being admitted to a node's mempool?",
        options: [
          "Username, Password, Phone Number, Credit Score.",
          "Valid Digital Signature, Sufficient Balance, Correct Sequential Nonce, and Not a Double-Spend.",
          "Proof of Residence, Government ID, Bank Statement, Tax Return.",
          "IP Address, Browser Type, Screen Resolution, Operating System."
        ],
        correctIndex: 1,
        explanation: "Every node rigorously enforces: 1) Valid digital signature matching the sender's public key; 2) Sufficient account balance; 3) Correct sequential account nonce; 4) No conflicting double-spend in the mempool."
      }
    ]
  },

  5: {
    chapterId: 5,
    levelId: 5,
    title: "Level 5 Quiz: Defender (51% Attacks & Reorgs)",
    subtitle: "Test your mastery of majority attacks, chain reorgs, and economic game theory",
    xpReward: 150,
    questions: [
      {
        question: "What rule causes nodes to accept an attacker's competing chain during a 51% attack?",
        options: [
          "The node closest to the attacker's GPS location wins.",
          "The Nakamoto consensus rule: nodes always follow the longest valid chain with the most accumulated Proof of Work.",
          "The attacker pays a transaction bribe to the miners.",
          "The chain with the shortest blocks is preferred."
        ],
        correctIndex: 1,
        explanation: "Nakamoto Consensus dictates that nodes follow the valid chain with the greatest cumulative Proof of Work. An attacker commanding >50% hashrate can secretly out-mine the honest chain and broadcast it to trigger a reorganization."
      },
      {
        question: "Why is a 51% attack on a major network like Bitcoin considered economically irrational for a rational miner?",
        options: [
          "Because the Bitcoin software will automatically call law enforcement.",
          "Because spending billions on hardware and electricity to attack the network destroys market confidence and makes the stolen coins worthless.",
          "Because miners are not allowed to purchase more than 10 computers each.",
          "Because a 51% attack gives the attacker the ability to read everyone's private keys."
        ],
        correctIndex: 1,
        explanation: "Game theory at scale: Command of >50% hashrate yields far greater profits by simply mining honestly and collecting guaranteed block subsidies and fees. Attacking the chain destroys confidence and market price, wiping out the attacker's capital."
      },
      {
        question: "Can an attacker who controls 60% of the network's hashrate steal coins from other users' private keys?",
        options: [
          "Yes, a 51% attack allows reading all private keys.",
          "No, Proof of Work consensus governs block ordering; digital signatures still mathematically protect individual accounts.",
          "Yes, but only on weekends.",
          "Yes, if they double the nonce value."
        ],
        correctIndex: 1,
        explanation: "Critical distinction: Mining power only controls the order and inclusion of blocks. Even with 100% hashrate, an attacker cannot forge ECDSA signatures or steal funds from accounts without their private keys."
      }
    ]
  },

  6: {
    chapterId: 6,
    levelId: 6,
    title: "Level 6 Quiz: DeFi Trader (Smart Contracts & Uniswap)",
    subtitle: "Test your mastery of autonomous code, deterministic addressing, and decentralized protocols",
    xpReward: 150,
    questions: [
      {
        question: "What is the foundational invariant of a blockchain smart contract?",
        options: [
          "Smart contracts can be paused or edited anytime by the programmer who created them.",
          "Smart contracts are self-executing code on the blockchain. They run exactly as written — no one can stop or alter them.",
          "Smart contracts require approval from a local magistrate before executing each function.",
          "Smart contracts run on centralized cloud servers hosted by banks."
        ],
        correctIndex: 1,
        explanation: "Smart contracts are self-executing code residing on the decentralized ledger. Their bytecode is immutable: neither authors, miners, nor external institutions can alter their logic or prevent execution."
      },
      {
        question: "How is a smart contract's address generated when deployed to an EVM network?",
        options: [
          "It is chosen randomly by the developer.",
          "It is assigned by a central domain registry like GoDaddy.",
          "It is derived deterministically from the deployer's address and account sequence nonce (0x + SHA-256(code + deployer + nonce)).",
          "It is identical to the deployer's personal wallet address."
        ],
        correctIndex: 2,
        explanation: "EVM contract addresses are mathematically deterministic: derived by hashing the deployer's address and sequence nonce together with bytecode. This guarantees unique, predictable addresses across all network nodes."
      },
      {
        question: "How does Uniswap (DeFi Automated Market Maker) allow users to trade tokens without a traditional centralized exchange order book?",
        options: [
          "It uses a team of human traders working in an office to match orders.",
          "It pairs buyers and sellers through telephone confirmations.",
          "It trades against crowdsourced smart-contract liquidity pools using the constant product formula (x · y = k).",
          "It requires users to mail paper checks before tokens are delivered."
        ],
        correctIndex: 2,
        explanation: "Uniswap revolutionized DeFi by replacing central order books with smart contract liquidity pools. Trades execute algorithmically against pooled reserves using the constant product formula ($x \\cdot y = k$)."
      }
    ]
  }
};

export const REAL_WORLD_CASE_STUDIES = {
  // BITCOIN CASE STUDY (FOR PoW)
  bitcoin: {
    id: "bitcoin",
    title: "Bitcoin: Thermodynamic Security & Nakamoto Consensus",
    subtitle: "How Proof of Work solves the Byzantine Generals Problem with physics",
    logo: "₿",
    accentColor: "#ffb703",
    metrics: [
      { label: "Genesis Date", value: "Jan 3, 2009" },
      { label: "Current Hashrate", value: "~650 EH/s" },
      { label: "Target Block Time", value: "10 Minutes" },
      { label: "Hard Supply Cap", value: "21 Million BTC" }
    ],
    summary: "Invented by the pseudonymous Satoshi Nakamoto, Bitcoin is the first decentralized digital currency that successfully solved the double-spending problem without a trusted central authority.",
    deepDive: `
      <p>Before Bitcoin, digital cash systems failed because digital data is infinitely reproducible. If Alice sends Bob a digital dollar file, what stops Alice from sending the identical file to Charlie?</p>
      <p>Satoshi's breakthrough was <strong>coupling digital consensus directly to physical thermodynamics</strong>. By requiring miners to burn electricity guessing SHA-256 nonces, Bitcoin created an irreversible timeline. Rewriting past history requires expending more energy than the rest of the planet combined.</p>
    `,
    takeaways: [
      "Thermodynamic anchor: Digital truth secured by real-world electricity expenditure.",
      "Self-adjusting difficulty: Automatic recalibration every 2,016 blocks maintains stability.",
      "Game-theoretic security: Honest mining is always more profitable than attacking."
    ]
  },

  // ETHEREUM CASE STUDY (FOR SMART CONTRACTS)
  ethereum: {
    id: "ethereum",
    title: "Ethereum: The Decentralized World Computer",
    subtitle: "From digital gold to a Turing-complete smart contract execution engine",
    logo: "Ξ",
    accentColor: "#00f0ff",
    metrics: [
      { label: "Genesis Date", value: "July 30, 2015" },
      { label: "Average Block Time", value: "12 Seconds" },
      { label: "Active Smart Contracts", value: "Millions" },
      { label: "Total Value Secured", value: ">$100 Billion" }
    ],
    summary: "Conceived by Vitalik Buterin, Ethereum extended blockchain from a simple payment ledger into a Turing-complete global state machine capable of executing arbitrary code.",
    deepDive: `
      <p>While Bitcoin was designed as sound digital money, Ethereum introduced the <strong>Ethereum Virtual Machine (EVM)</strong>. Developers can write decentralized applications (DApps) in high-level languages like Solidity, deploy them to deterministic addresses, and allow users globally to interact with them trustlessly.</p>
      <p>Smart contracts on Ethereum run autonomously: once deployed, their execution cannot be stopped, censored, or modified by any corporation, government, or developer.</p>
    `,
    takeaways: [
      "Turing-complete logic: Any computable algorithm can be expressed in smart contracts.",
      "Composability ('Money Legos'): Contracts can interact with other contracts seamlessly.",
      "Immutable execution: Code runs exactly as written without intermediaries."
    ]
  },

  // UNISWAP CASE STUDY (FOR DEFI & AMMs)
  uniswap: {
    id: "uniswap",
    title: "Uniswap: The Constant-Product AMM Protocol",
    subtitle: "How 300 lines of Solidity code disrupted multi-billion-dollar Wall Street market makers",
    logo: "🦄",
    accentColor: "#ff007a",
    metrics: [
      { label: "Launched", value: "Nov 2, 2018" },
      { label: "All-Time Volume", value: ">$1.5 Trillion" },
      { label: "Invariant Formula", value: "x · y = k" },
      { label: "Central Custody", value: "0% (Self-Custodial)" }
    ],
    summary: "Created by Hayden Adams, Uniswap is the quintessential Decentralized Finance (DeFi) protocol, replacing centralized order book brokerages with automated liquidity pools.",
    deepDive: `
      <p>Traditional financial exchanges (like NASDAQ or Coinbase) rely on centralized order books and professional market makers who quote bid and ask prices. If market makers pull liquidity during high volatility, markets freeze.</p>
      <p>Uniswap replaced order books with an elegant mathematical formula: <code>x · y = k</code>. Anyone can deposit token pairs into a pool, and traders swap directly against the pool. The price automatically shifts along the hyperbolic curve based on supply and demand, guaranteeing 24/7 liquidity without middleman approval.</p>
    `,
    takeaways: [
      "Constant Product Formula: Mathematical pricing invariant replacing centralized limit order books.",
      "Permissionless liquidity: Anyone can list a token or become a liquidity provider.",
      "Non-custodial trading: Funds stay in smart contract reserves; traders keep custody of their keys."
    ]
  }
};

export const WHY_IT_MATTERS_CONTENT = {
  1: {
    levelId: 1,
    title: "Why Immutable Hash Chains Matter in the Real World",
    problem: {
      title: "The Centralized Problem: Accounting Fraud & Historical Revisionism",
      desc: "In traditional digital systems, data tampering is easy and invisible. Corporate accounting scandals (like Enron, WorldCom, and Wirecard) occurred because executives secretly altered historical balance sheets and ledger entries over years without leaving mathematical proof of tampering."
    },
    solution: {
      title: "The Cryptographic Solution: Hash-Linked Audit Trails",
      desc: "SHA-256 and cryptographic hash pointers create an immutable audit trail. Because each block includes the hash of the preceding block, changing even a single digit in an old transaction breaks all downstream links, immediately alerting auditors and nodes worldwide."
    },
    realWorldCase: {
      title: "Real-World Adoption: Git Code Tracking & Supply Chain Audits",
      desc: "Every software engineer uses Git to track code changes via SHA hashes. Global supply chains (Maersk, Walmart) use hash-linked ledgers to trace pharmaceutical shipments and food safety records so past data cannot be falsified."
    }
  },

  2: {
    levelId: 2,
    title: "Why Proof of Work & Thermodynamic Consensus Matter",
    problem: {
      title: "The Centralized Problem: Fiat Inflation & Digital Money Copying",
      desc: "Central banks can print trillions of fiat currency units at the push of a button, diluting purchasing power and driving inflation. Furthermore, pure digital data can normally be copy-pasted at zero marginal cost."
    },
    solution: {
      title: "The Cryptographic Solution: Anchoring Digital Scarcity to Physics",
      desc: "Proof of Work anchors digital money directly to real-world physics and thermodynamics. Bitcoins cannot be created by decree or printed out of thin air—they require real computing power and electricity to mine, making digital scarcity enforceable."
    },
    realWorldCase: {
      title: "Featured Case Study: Bitcoin (The $1 Trillion Thermodynamic Network)",
      desc: "Bitcoin's Proof of Work network consumes more energy than many countries, making it the most computationally secure computer network on Earth. Commandeering 51% of its hashrate is physically and economically impossible."
    },
    caseStudyKey: "bitcoin"
  },

  3: {
    levelId: 3,
    title: "Why Digital Signatures & Nonces Matter",
    problem: {
      title: "The Centralized Problem: Password Theft & Credit Card Forgery",
      desc: "Traditional credit cards require giving merchants your card number and CVV. Once shared, rogue employees or compromised servers can reuse your details to steal your funds without your knowledge."
    },
    solution: {
      title: "The Cryptographic Solution: Asymmetric Signatures & Sequential Nonces",
      desc: "With asymmetric cryptography, you NEVER share your private key. You provide a mathematically unforgeable digital signature valid ONLY for that specific transaction and nonce. Sequential nonces prevent any transaction from being replayed."
    },
    realWorldCase: {
      title: "The Golden Rule: 'Not Your Keys, Not Your Coins'",
      desc: "Cryptocurrency wallets give individuals true mathematical property rights. No bank, corporation, or government can confiscate your funds without your private key, ending reliance on custodial banking middlemen."
    }
  },

  4: {
    levelId: 4,
    title: "Why P2P Consensus & Independent Verification Matter",
    problem: {
      title: "The Centralized Problem: Single Points of Failure & Arbitrary Censorship",
      desc: "Centralized payment networks (Visa, PayPal, SWIFT) can freeze accounts, reverse legitimate payments, or shut down entirely due to cloud outages, political pressure, or authoritarian censorship."
    },
    solution: {
      title: "The Cryptographic Solution: Permissionless Peer-to-Peer Consensus",
      desc: "A decentralized P2P network has no central server or CEO. Thousands of independent nodes verify every transaction against mathematical rules. As long as honest nodes exist, valid transactions are processed without permission."
    },
    realWorldCase: {
      title: "Real-World Adoption: Censorship-Resistant Global Remittances",
      desc: "Citizens in hyperinflationary or politically unstable economies (Venezuela, Argentina, Nigeria) use P2P cryptocurrency networks to preserve their life savings and receive cross-border remittances in seconds with near-zero fees."
    }
  },

  5: {
    levelId: 5,
    title: "Why 51% Attack Defense & Nonce Collisions Matter",
    problem: {
      title: "The Centralized Problem: Double-Spending & Consensus Hijacking",
      desc: "If an entity could spend digital money twice or rewrite recent transaction history, the entire monetary system would collapse into worthlessness. Malicious actors could buy expensive goods and then rewrite history to reclaim their money."
    },
    solution: {
      title: "The Cryptographic Solution: Mempool Nonce Order & Economic Moats",
      desc: "Account nonces make double-spending impossible in the mempool: competing transactions with the same nonce are immediately rejected. For 51% attacks, the overwhelming hardware and electricity cost creates an economic barrier that makes honest mining vastly more lucrative."
    },
    realWorldCase: {
      title: "Real-World Threat Defense: Exchange Confirmation Thresholds",
      desc: "Cryptocurrency exchanges require 3 to 6 block confirmations before crediting large deposits, ensuring that temporary reorgs or competing chains cannot reverse finalized financial settlements."
    }
  },

  6: {
    levelId: 6,
    title: "Why Smart Contracts & DeFi Matter",
    problem: {
      title: "The Centralized Problem: Bureaucratic Intermediaries & Wall Street Gatekeepers",
      desc: "Traditional finance requires armies of lawyers, escrow agents, brokers, and clearing houses who charge high fees, operate only during business hours (9am-5pm), and gatekeep access based on wealth or geography."
    },
    solution: {
      title: "The Cryptographic Solution: Autonomous Code as Law",
      desc: "Smart contracts execute agreements automatically on a decentralized virtual machine. Escrows release funds trustlessly, governance proposals execute automatically, and automated market makers trade 24/7 without middlemen."
    },
    realWorldCase: {
      title: "Featured Case Studies: Ethereum & Uniswap ($100B+ DeFi Ecosystem)",
      desc: "Protocols like Uniswap, Aave, and MakerDAO process billions in daily trade volume with zero employees, zero centralized order books, and 100% transparent on-chain execution for users worldwide."
    },
    caseStudyKey: "ethereum",
    secondaryCaseStudyKey: "uniswap"
  },

  7: {
    levelId: 7,
    title: "Why Merkle Trees & State Proofs Matter",
    problem: {
      title: "The Centralized Problem: The Blockchain Bloat Barrier",
      desc: "As blockchains process billions of transactions, their history swells to hundreds of gigabytes or terabytes. Requiring every user to store the entire ledger would price out smartphones and laptops, forcing users back into trusting centralized servers (like Infura or banks)."
    },
    solution: {
      title: "The Cryptographic Solution: O(log N) Inclusion Proofs & SPV",
      desc: "Merkle trees compress an arbitrary number of transactions into a single 32-byte root. A light client downloads only the compact block headers and verifies transaction inclusion using logarithmic sibling proofs without touching the rest of the block."
    },
    realWorldCase: {
      title: "Real-World Adoption: Mobile Wallets, Rollups & Bridges",
      desc: "Every mobile cryptocurrency wallet uses SPV Merkle proofs to display verified balances in milliseconds. Furthermore, Layer-2 ZK-rollups (Arbitrum, zkSync) and cross-chain bridges use state proofs to verify external blockchain state without running a full node."
    },
    caseStudyKey: "bitcoin",
    secondaryCaseStudyKey: "ethereum"
  }
};
