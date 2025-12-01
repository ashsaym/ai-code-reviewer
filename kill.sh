#!/bin/bash

# InfraMind-AI Master Kill Script
# This script kills all backend, frontend, and background services

# Don't exit on error - we want to try all cleanup steps
trap 'echo "Script interrupted"; exit 0' INT TERM

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory (MUST be project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verify we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ This script must be run from the project root directory!${NC}"
    exit 1
fi

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DB_SERVICES_DIR="db-services"

# Function to print colored messages
print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}=========================================${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}=========================================${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Print banner
clear
echo -e "${RED}${BOLD}"
cat << "EOF"
  _  ___ _ _     _     _    ___ 
 | |/ (_) | |   (_)   / \  |_ _|
 | ' /| | | |__  _   / _ \  | | 
 | . \| | | '_ \| | / ___ \ | | 
 |_|\_\_|_|_.__/|_|/_/   \_\___|
                                
EOF
echo -e "${NC}"
echo -e "${BOLD}Stopping InfraMind-AI Development Environment${NC}"
echo ""

# Step 1: Kill Backend
print_header "Stopping Backend Service"

# Method 1: Kill by process name
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    print_info "Killing backend processes by name..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 1
fi

# Method 2: Kill by port (8000)
BACKEND_PORT=8000
while true; do
    PORT_PIDS=$(lsof -ti:$BACKEND_PORT 2>/dev/null)
    if [ -z "$PORT_PIDS" ]; then
        break
    fi
    for PID in $PORT_PIDS; do
        print_info "Killing process on port $BACKEND_PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null || true
    done
    sleep 1
done

# Method 3: Force kill any remaining
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    print_warning "Backend still running, forcing kill..."
    pkill -9 -f "uvicorn app.main:app" 2>/dev/null || true
fi

# Method 4: Kill any Python process running app.main
pkill -9 -f "python.*app.main" 2>/dev/null || true

# Verify
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1 || lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
    print_error "Backend still running!"
else
    print_success "Backend stopped"
fi

# Step 2: Kill Frontend
print_header "Stopping Frontend Service"

# Method 1: Kill by process name
if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    print_info "Killing frontend processes by name..."
    pkill -f "react-scripts start" 2>/dev/null || true
    sleep 1
fi

# Method 2: Kill by port (3000)
FRONTEND_PORT=3000
while true; do
    PORT_PIDS=$(lsof -ti:$FRONTEND_PORT 2>/dev/null)
    if [ -z "$PORT_PIDS" ]; then
        break
    fi
    for PID in $PORT_PIDS; do
        print_info "Killing process on port $FRONTEND_PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null || true
    done
    sleep 1
done

# Method 3: Force kill any remaining
if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    print_warning "Frontend still running, forcing kill..."
    pkill -9 -f "react-scripts start" 2>/dev/null || true
fi

# Method 4: Kill any node process running next dev or npm dev
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "npm.*dev" 2>/dev/null || true

# Verify
if pgrep -f "react-scripts start" > /dev/null 2>&1 || lsof -ti:$FRONTEND_PORT > /dev/null 2>&1; then
    print_error "Frontend still running!"
else
    print_success "Frontend stopped"
fi

# Step 3: Kill Database Services
print_header "Stopping Database Services"

if [ -d "$DB_SERVICES_DIR" ]; then
    if command_exists docker-compose || command_exists docker; then
        cd "$DB_SERVICES_DIR"
        
        if docker-compose ps 2>/dev/null | grep -q "Up"; then
            print_info "Stopping database services..."
            docker-compose down
            print_success "Database services stopped"
        else
            print_info "Database services not running"
        fi
        
        cd "$SCRIPT_DIR"
    else
        print_warning "Docker not found. Cannot stop database services."
    fi
else
    print_warning "Database services directory not found"
fi

# Step 4: Kill any remaining background jobs
print_header "Cleaning Up Background Jobs"

# Kill any remaining Python processes related to the project
if pgrep -f "python.*backend" > /dev/null 2>&1; then
    print_info "Killing remaining Python processes..."
    pkill -f "python.*backend" 2>/dev/null || true
fi

# Kill any remaining Node.js processes related to the project
if pgrep -f "node.*frontend" > /dev/null 2>&1; then
    print_info "Killing remaining Node.js processes..."
    pkill -f "node.*frontend" 2>/dev/null || true
fi

# Kill any job executor processes
if pgrep -f "job_executor" > /dev/null 2>&1; then
    print_info "Killing job executor processes..."
    pkill -f "job_executor" 2>/dev/null || true
fi

# Step 5: Final summary
print_header "InfraMind-AI Status"

echo -e "${BOLD}Services Stopped:${NC}"
echo ""

# Check backend
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    echo -e "  ${RED}❌ Backend${NC}      Still running"
else
    echo -e "  ${GREEN}✅ Backend${NC}      Stopped"
fi

# Check frontend
if pgrep -f "react-scripts start" > /dev/null 2>&1; then
    echo -e "  ${RED}❌ Frontend${NC}     Still running"
else
    echo -e "  ${GREEN}✅ Frontend${NC}     Stopped"
fi

# Check database services
if command_exists docker-compose || command_exists docker; then
    if docker-compose -f "$DB_SERVICES_DIR/docker-compose.yml" ps 2>/dev/null | grep -q "Up"; then
        echo -e "  ${RED}❌ Databases${NC}    Still running"
    else
        echo -e "  ${GREEN}✅ Databases${NC}    Stopped"
    fi
fi

echo ""
echo -e "${CYAN}=========================================${NC}"
echo ""
print_success "InfraMind-AI services stopped!"
echo ""
print_info "Start again: ./start.sh"
echo ""