# Publishing to GitHub Pages

Blockchain Quest can be hosted on GitHub Pages alongside a portfolio site.

## Option A — Project site (recommended)

The game lives at `https://YOURNAME.github.io/blockchain-quest/`

1. Push the repo to GitHub as `blockchain-quest`
2. Repo Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main`, folder: `/ (root)`
5. Save

Wait ~30 seconds. The game will be live at the URL above.

## Option B — Inside your portfolio repo

If your portfolio is at `https://YOURNAME.github.io`, you can add the game as a subfolder:

1. Copy the game files into a `blockchain-quest/` subfolder of your portfolio repo
2. Commit and push
3. The game is now at `https://YOURNAME.github.io/blockchain-quest/`

## Local server vs. GitHub Pages

The Node.js server (port 3000) is not used on GitHub Pages — GitHub Pages serves the same files statically over HTTPS. Both modes work identically for the player.

## Note about crypto.subtle

On GitHub Pages (HTTPS) the browser's Web Crypto API is fully available. When running locally via `Launch Game.bat` (which serves over `http://localhost:3000`), it is also available. Only if someone opens `index.html` directly from the filesystem (`file://`) would Web Crypto be restricted in some browsers — but the game is designed to run through the launcher/server, and also includes a pure JS SHA-256 fallback.
