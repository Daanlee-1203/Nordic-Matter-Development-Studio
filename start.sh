#!/usr/bin/env bash

# nRF5340 DK Studio & Matter Controller Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "============================================================"
echo " Starting Nordic nRF5340 DK Studio & Matter Controller App"
echo "============================================================"

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not found. Please install Node.js (https://nodejs.org)."
    exit 1
fi

PORT=3000

# Open browser after a brief delay
(sleep 1.2 && open "http://localhost:${PORT}" 2>/dev/null || xdg-open "http://localhost:${PORT}" 2>/dev/null) &

# Run Node server
node server.js
