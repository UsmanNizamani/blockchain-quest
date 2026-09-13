# Troubleshooting Blockchain Quest

This guide covers solutions to common setup and execution questions when running Blockchain Quest locally.

---

## 🔍 Quick Diagnosis

Answer these three questions to identify your solution:

1. **What happened?** (Match with Scenarios A–G below)
2. **What operating system are you on?** (Windows, macOS, or Linux)
3. **Do you have Node.js installed?**  
   Open a terminal and run `node --version`.
   - If you see a version like `v18.17.0` or `v20.x.x`, **yes**.
   - If you see `"command not found"`, `"node is not recognized"`, or no output, **no**.

---

## Scenario A — "Node.js not found" Error When Launching

### Symptom
The launcher opens and shows `[ERROR] Node.js not found` or prompts you to open the download page.

### Solution
1. Visit [https://nodejs.org](https://nodejs.org) and download the **LTS (Long Term Support)** version.
2. Run the installer and accept all default options.
   - **Windows:** Make sure the **"Add to PATH"** checkbox is checked (it is checked by default).
   - **macOS:** Complete the `.pkg` installer.
   - **Linux:** Install via package manager:
     - Ubuntu/Debian: `sudo apt install nodejs npm`
     - Fedora: `sudo dnf install nodejs npm`
     - Arch: `sudo pacman -S nodejs npm`
3. Close the terminal window completely.
4. Double-click the launcher again (`Launch Game.bat`, `Launch Game.command`, or `Launch Game.sh`).

---

## Scenario B — Browser Opens but Shows "Cannot Reach This Site"

### Symptom
Your browser opens `http://localhost:3000` but displays `ERR_CONNECTION_REFUSED` or "Cannot reach this site".

### Solution
1. **Check the terminal window:**  
   Inspect the launcher window or the minimized "Blockchain Quest Server" window. If there is red error text, read the error message.
2. **Verify the server is running:**  
   Open a terminal in the game folder and run:
   ```bash
   node server.js
   ```
   You should see:
   ```text
   ===============================================
    Blockchain Quest | Server running
    Open: http://localhost:3000
    Stop: Press Ctrl+C
   ===============================================
   ```
3. **Try the direct IP URL:**  
   In your browser address bar, navigate directly to [http://127.0.0.1:3000](http://127.0.0.1:3000). On some operating systems, `localhost` resolves to IPv6 (`::1`) while the server binds to IPv4 (`127.0.0.1`).

---

## Scenario C — Terminal Opens, Closes Immediately, Nothing Happens

### Symptom
You double-click the launcher and the window flashes for a split second and immediately vanishes.

### Solution
1. **Run from a command prompt to see the error:**
   - **Windows:** Press `Win + R`, type `cmd`, navigate to the game folder:
     ```cmd
     cd /d "C:\path\to\blockchain-quest"
     "Launch Game.bat"
     ```
   - **macOS / Linux:** Open Terminal and execute:
     ```bash
     cd "/path/to/blockchain-quest"
     ./"Launch Game.sh"
     ```
2. **Check executable permissions (macOS/Linux):**  
   If permission was denied, make the launcher executable:
   ```bash
   chmod +x "Launch Game.command" "Launch Game.sh"
   ```
3. **Inspect `.server.log`:**  
   If a crash occurred, open the generated `.server.log` file in the folder to see the exact crash stack trace.

---

## Scenario D — "Port 3000 is Already in Use" Error

### Symptom
The launcher or server reports:
```text
[ERROR] Port 3000 is already in use.
Another instance of Blockchain Quest may already be running.
```

### Solution
Another application (e.g., Grafana, React dev server) or an orphaned Blockchain Quest instance is using port 3000.

- **Windows:**
  1. Open Command Prompt.
  2. Find the PID using port 3000:
     ```cmd
     netstat -ano | findstr :3000
     ```
  3. Terminate that PID (replace `<PID>` with the number in the rightmost column):
     ```cmd
     taskkill /PID <PID> /F
     ```
- **macOS / Linux:**
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```
- **Change the Port:**  
  Open `server.js` in any text editor, locate line 9:
  ```javascript
  const PORT = parseInt(process.env.PORT || '3000', 10);
  ```
  Change `'3000'` to `'3001'`, save, and launch again at [http://localhost:3001](http://localhost:3001).

---

## Scenario E — Game Loads but Is Unplayable (Controls Do Nothing)

### Symptom
The UI appears, but clicking buttons does nothing, or the browser console shows `CORS`, `SecurityError`, or module loading errors.

### Solution
**You opened `index.html` directly from your file explorer (`file:///.../index.html`).**  
Modern web browsers enforce strict security policies on ES modules and Web Crypto APIs over the `file://` protocol. The game **must** be served over HTTP through the local server.

1. Close the `file:///` tab in your browser.
2. Launch via `Launch Game.bat`, `Launch Game.command`, or `Launch Game.sh`.
3. Verify your browser URL says `http://localhost:3000` (or `http://127.0.0.1:3000`).

---

## Scenario F — Progress Disappears on Page Refresh

### Symptom
Completed levels or earned Knowledge Points (KP) reset back to Level 1 when refreshing the browser.

### Solution
1. **Avoid Incognito / Private Browsing Mode:**  
   Private windows purge `localStorage` when the tab or window closes.
2. **Check Browser Cookie / Storage Permissions:**  
   Ensure your browser is not configured to "Block all third-party cookies" or "Delete cookies and site data when you close all windows".
3. **Consistently Use the Same URL:**  
   `http://localhost:3000` and `http://127.0.0.1:3000` maintain separate `localStorage` partitions in modern browsers. Always use the same URL scheme.

---

## Scenario G — Game Is Slow or Laggy

### Symptom
Canvas animations stutter or frame rate drops below 30 FPS.

### Solution
1. **Enable Hardware Acceleration:**  
   In your browser settings, verify that **"Use graphics acceleration when available"** is turned on.
2. **Close Heavy Canvas/WebGL Tabs:**  
   Other resource-intensive tabs (3D web apps, video streams) can throttle the browser's requestAnimationFrame scheduler.
3. **Toggle HUD Audio:**  
   Click the sound icon (`🔊`) in the top HUD banner to mute audio oscillators if audio buffering causes latency on older sound cards.

---

## 🆘 Getting More Help

If none of the above scenarios solve your issue:

1. Open your terminal in the game folder.
2. Run:
   ```bash
   node server.js
   ```
3. Copy the full output printed in your terminal.
4. Open an issue on GitHub with:
   - Your Operating System & version
   - Your Node version (`node --version`)
   - The copied terminal output
   - A screenshot of any browser console errors (Press `F12` → **Console** tab)
