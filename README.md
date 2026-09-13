# Blockchain Quest

An interactive 7-level web game that teaches blockchain fundamentals — hashing, Proof of Work, Proof of Stake, P2P broadcast, attack scenarios, forks, and Merkle trees — through hands-on simulation.

![Blockchain Quest](screenshots/hero.png)

## 🎮 Play It

### Option 1 — Online (fastest)
👉 **https://YOURNAME.github.io/blockchain-quest/**

### Option 2 — Locally (one-time 30-second setup)

**Step 1 — Install Node.js (one time only)**  
Download the LTS version from [https://nodejs.org](https://nodejs.org) and install with all defaults. That's it — you never have to touch Node.js again.

**Step 2 — Get the game**  
Click the green **Code** button above → **Download ZIP** → extract the folder.  
Or if you use git:
```bash
git clone https://github.com/YOURNAME/blockchain-quest.git
cd blockchain-quest
```

**Step 3 — Launch**
- **Windows:** double-click `Launch Game.bat`
- **macOS:** double-click `Launch Game.command`
- **Linux:** run `./Launch Game.sh` in a terminal

The game opens automatically in your browser at [http://localhost:3000](http://localhost:3000).

---

## 📚 What You'll Learn

| Level | Topic | Key Concepts Explored |
| :---: | :--- | :--- |
| **1** | **Hash Chain Guardian** | SHA-256, avalanche effect, hash pointers, genesis block, and tamper detection |
| **2** | **PoW Miner & PoS Staking** | Mining loops, nonces, dynamic difficulty adjustment, validators, and slot attestations |
| **3** | **Sovereign Wallet & Cryptography** | Keypair generation, public addressing, ECDSA signatures, nonces, and UTXO/account models |
| **4** | **P2P Gossip Network Simulator** | Peer topology, transaction broadcast, node verification, mempools, and Byzantine fault tolerance |
| **5** | **Security Defender & Attack Scenarios** | 51% hashrate reorgs, double-spending, nothing-at-stake, and long-range history attacks |
| **6** | **Forks, Finality & The Merge** | Soft forks vs hard forks (BTC vs BCH, ETH vs ETC), Casper FFG checkpoints, and Ethereum Merge |
| **7** | **Merkle Trees & State Proofs** | Pairwise hashing, Merkle roots, $O(\log N)$ inclusion proofs, forgery rejection, and SPV light clients |

---

## 🖥️ System Requirements

- **Node.js 16 or newer** (Download: [https://nodejs.org](https://nodejs.org))
- **Any modern browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **~10 MB of disk space** (plus Node.js runtime if not already installed)
- **Zero external dependencies:** No Python, no Docker, no database, no npm package installation required.

---

## 🛠️ For Developers

### Project Structure
```text
blockchain-quest/
├── index.html              # Main application entry point
├── server.js               # Node.js local dev HTTP server (port 3000)
├── package.json            # Project manifest & npm scripts
├── Launch Game.bat         # Windows one-click launcher
├── Launch Game.command     # macOS launcher
├── Launch Game.sh          # Linux launcher
├── pages.md                # GitHub Pages deployment guide
├── LICENSE                 # MIT License
├── css/                    # Modular stylesheets (main, canvas, sidebar)
├── js/                     # Game source
│   ├── blockchain/         # Pure cryptographic simulation models
│   ├── core/               # EventBus, GameState, persistence
│   ├── education/          # Educational curriculum, summaries, codex, quizzes
│   ├── engine/             # Canvas rendering engine & particle effects
│   ├── levels/             # Level 1 to Level 7 mission controllers
│   └── ui/                 # UI components, modals, toasts
├── tests.html              # Comprehensive automated regression test suite
└── screenshots/            # Screenshots directory (see screenshots/README.md)
```

### Development Commands
```bash
# Start dev server locally at http://localhost:3000
npm start

# Development mode with auto-reload
npm run dev
```

### Running Tests
Open [http://localhost:3000/tests.html](http://localhost:3000/tests.html) in your browser to run the 63+ automated regression tests across all wallet, node, attack simulator, and Merkle tree modules.

### Manual Run Without Launcher
```bash
node server.js
# Then open http://localhost:3000 in your browser
```

---

## 🐛 Troubleshooting

- **"Node.js not found" when running the launcher:**  
  Install Node.js from [https://nodejs.org](https://nodejs.org) (LTS version), then close and re-open the launcher.
- **Port 3000 already in use:**  
  The launcher attempts to free port 3000 automatically. If it still fails:
  - **Windows:** `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
  - **macOS / Linux:** `lsof -ti:3000 | xargs kill -9`
  - Or edit `server.js` and set `PORT = 3001`.
- **Browser shows "Cannot reach this site":**  
  The server may have encountered an error during startup. Inspect the minimized "Blockchain Quest Server" window for error details.
- **Windows SmartScreen warning on `.bat` file:**  
  Click **"More info"** → **"Run anyway"**. The `.bat` script is a plain-text batch file that launches the local server; you can inspect its contents in any text editor.
- **Antivirus flags the launcher:**  
  Some antivirus heuristics flag `.bat` files with taskkill commands. The launcher is safe and open source; add an exception in your antivirus settings if needed.
- **Progress is not saved:**  
  The game saves progress locally via browser `localStorage`. Verify cookies and storage are enabled, and avoid private/incognito browsing mode if you want progress to persist across sessions.

---

## 🤝 Contributing

Issues and pull requests are welcome!
1. Fork the repository
2. Create a descriptive feature branch (`git checkout -b feature/my-feature`)
3. Test changes using `npm start` and `http://localhost:3000/tests.html`
4. Commit your changes (`git commit -m "Add feature"`)
5. Push to your branch and submit a Pull Request

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- Built with standard HTML5, CSS3, and modern JavaScript.
- Zero third-party runtime dependencies.
- Local server: Node.js standard library (`http`, `fs`, `path`).

⭐ **Enjoying Blockchain Quest? Star the repository on GitHub!**
