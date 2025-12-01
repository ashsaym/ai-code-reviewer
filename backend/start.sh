#!/bin/bash
# InfraMind-AI Backend Startup Script v4.0
# Usage: ./start.sh [--quick]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 InfraMind-AI Backend Startup${NC}"
echo "=================================="

# Parse arguments
QUICK_MODE=false
if [[ "$1" == "--quick" ]]; then
    QUICK_MODE=true
    echo -e "${YELLOW}⚡ Quick mode enabled - skipping dependency checks${NC}"
fi

# Kill existing backend processes - multiple methods
echo -e "${YELLOW}🔪 Stopping existing backend processes...${NC}"

# Method 1: Kill by process name
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "python -m uvicorn" 2>/dev/null || true

# Method 2: Kill by port
BACKEND_PIDS=$(lsof -ti:8000 2>/dev/null || true)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "Killing processes on port 8000: $BACKEND_PIDS"
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
fi

# Method 3: Kill by PID file
if [ -f ".backend.pid" ]; then
    OLD_PID=$(cat .backend.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "Killing old backend process (PID: $OLD_PID)"
        kill -9 $OLD_PID 2>/dev/null || true
    fi
    rm -f .backend.pid
fi

sleep 2

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${GREEN}🐍 Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies if not in quick mode
if [ "$QUICK_MODE" = false ]; then
    # Check if requirements have changed
    REQUIREMENTS_HASH=""
    if [ -f ".requirements_hash" ]; then
        REQUIREMENTS_HASH=$(cat .requirements_hash)
    fi
    CURRENT_HASH=$(md5sum requirements.txt | awk '{print $1}')
    
    if [ "$REQUIREMENTS_HASH" != "$CURRENT_HASH" ]; then
        echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
        pip install -r requirements.txt --quiet
        echo "$CURRENT_HASH" > .requirements_hash
    else
        echo -e "${GREEN}✅ Dependencies up to date${NC}"
    fi
fi

# Check for required environment variables
echo -e "${YELLOW}🔧 Checking environment variables...${NC}"
if [ -z "$OPENWEB_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENWEB_API_KEY not set - AI features will be limited${NC}"
fi
if [ -z "$REPO_PAT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  REPO_PAT_TOKEN not set - GitHub integration will be limited${NC}"
fi

# Verify port is free
if lsof -i:8000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Port 8000 is still in use!${NC}"
    echo "Processes on port 8000:"
    lsof -i:8000
    exit 1
fi

# Start the backend server
echo -e "${GREEN}🌐 Starting backend server on port 8000...${NC}"
echo "=================================="

# Clear old log
> backend.log

# Run uvicorn in background and log to file
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid

echo "Backend PID: $BACKEND_PID"

# Wait for startup with progressive checking
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
for i in {1..15}; do
    sleep 1
    if curl -s http://localhost:8000/api/v1/health/quick > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend started successfully!${NC}"
        echo -e "   📍 API: http://localhost:8000"
        echo -e "   📚 Docs: http://localhost:8000/docs"
        echo -e "   📖 ReDoc: http://localhost:8000/redoc"
        echo -e "   📋 PID: $BACKEND_PID"
        echo ""
        exit 0
    fi
    
    # Check if process still exists
    if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Backend process died during startup!${NC}"
        echo -e "${YELLOW}Last 30 lines of backend.log:${NC}"
        tail -30 backend.log
        exit 1
    fi
    
    echo -n "."
done

echo ""
echo -e "${RED}❌ Backend failed to start (timeout).${NC}"
echo -e "${YELLOW}Last 30 lines of backend.log:${NC}"
tail -30 backend.log
exit 1
