#!/bin/bash
# InfraMind-AI Frontend Startup Script
# Usage: ./start.sh [--quick]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 InfraMind-AI Frontend Startup${NC}"
echo "=================================="

# Parse arguments
QUICK_MODE=false
if [[ "$1" == "--quick" ]]; then
    QUICK_MODE=true
    echo -e "${YELLOW}⚡ Quick mode enabled - skipping dependency checks${NC}"
fi

# Kill existing frontend processes
echo -e "${YELLOW}🔪 Stopping existing frontend processes...${NC}"
pkill -f "react-scripts start" 2>/dev/null || true
sleep 1

# Install dependencies if not in quick mode
if [ "$QUICK_MODE" = false ]; then
    PACKAGE_HASH=""
    if [ -f ".package_hash" ]; then
        PACKAGE_HASH=$(cat .package_hash)
    fi
    CURRENT_HASH=$(md5sum package.json | awk '{print $1}')
    
    if [ "$PACKAGE_HASH" != "$CURRENT_HASH" ]; then
        echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
        npm install --silent
        echo "$CURRENT_HASH" > .package_hash
    else
        echo -e "${GREEN}✅ Dependencies up to date${NC}"
    fi
fi

# Start the frontend server
echo -e "${GREEN}🌐 Starting frontend server on port 3000...${NC}"
echo "=================================="

# Run in background
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid

# Wait for startup
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
sleep 5

# Check if server is running
if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend started successfully!${NC}"
    echo -e "   📍 URL: http://localhost:3000"
    echo -e "   📋 Logs: tail -f frontend.log"
else
    echo -e "${RED}❌ Frontend failed to start. Check frontend.log for details.${NC}"
    tail -20 frontend.log
    exit 1
fi
