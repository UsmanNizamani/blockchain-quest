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
  echo "Blockchain Quest needs Node.js (one-time setup, ~30 seconds):"
  echo "  1. Download from https://nodejs.org (LTS version)"
  echo "  2. Install with defaults"
  echo "  3. Run this file again"
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

# Free port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# Start server
echo "> Starting server at http://localhost:3000 ..."
node server.js &
SERVER_PID=$!

sleep 2

# Open browser
open "http://localhost:3000"

echo ""
echo "==============================================="
echo "  Game is live at http://localhost:3000"
echo "  Press Ctrl+C to stop the server."
echo "==============================================="
echo ""

# Wait for the server
wait $SERVER_PID
