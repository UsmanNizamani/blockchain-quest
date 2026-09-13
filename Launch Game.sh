#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "==============================================="
echo "  BLOCKCHAIN QUEST | Launching..."
echo "==============================================="
echo ""

# 1. Check Node.js
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

# 2. Free port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 1

# 3. Start server and capture output log
rm -f .server.log
echo "> Starting server at http://localhost:3000 ..."
node server.js > .server.log 2>&1 &
SERVER_PID=$!

# 4. Poll until the server responds (max 10 seconds)
echo "> Waiting for server to be ready..."
READY=0
for i in {1..20}; do
  if curl -s http://127.0.0.1:3000 >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if [ $READY -eq 1 ]; then
  echo "> Server ready. Opening browser..."
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
else
  echo ""
  echo "[ERROR] Server did not start within 10 seconds."
  if [ -f .server.log ]; then
    echo ""
    echo "---------------- Server Output Log ----------------"
    tail -n 20 .server.log
    echo "---------------------------------------------------"
  fi
  echo ""
  echo "To diagnose and run manually, open Terminal and execute:"
  echo "  cd \"$(pwd)\" && node server.js"
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi
