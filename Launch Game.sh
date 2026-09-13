#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "==============================================="
echo "  BLOCKCHAIN QUEST | Launching..."
echo "==============================================="
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found."
  echo ""
  echo "Install Node.js:"
  echo "  Ubuntu/Debian: sudo apt install nodejs npm"
  echo "  Fedora:        sudo dnf install nodejs npm"
  echo "  Arch:          sudo pacman -S nodejs npm"
  echo "  Or download:   https://nodejs.org"
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

# Free port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Start server
echo "> Starting server at http://localhost:3000 ..."
node server.js &
SERVER_PID=$!

sleep 2

# Open browser
xdg-open "http://localhost:3000" 2>/dev/null || \
sensible-browser "http://localhost:3000" 2>/dev/null || \
echo "Open http://localhost:3000 in your browser."

echo ""
echo "==============================================="
echo "  Game is live at http://localhost:3000"
echo "  Press Ctrl+C to stop the server."
echo "==============================================="
echo ""

wait $SERVER_PID
