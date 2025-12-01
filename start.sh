#!/bin/bash

# InfraMind-AI Master Startup Script
# This script starts both backend and frontend services

set -e  # Exit on error
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

# Parse command line arguments
QUICK_MODE=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
USE_DOCKER=false

for arg in "$@"; do
    case $arg in
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --help)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick           Quick restart (skip setup checks)"
            echo "  --backend-only    Start only the backend service"
            echo "  --frontend-only   Start only the frontend service"
            echo "  --docker          Start database services with docker-compose"
            echo "  --help            Show this help message"
            echo ""
            exit 0
            ;;
        *)
            ;;
    esac
done

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
echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ___        __           __  __ _           _      _    ___ 
 |_ _|_ __  / _|_ __ __ _|  \/  (_)_ __   __| |    / \  |_ _|
  | || '_ \| |_| '__/ _` | |\/| | | '_ \ / _` |   / _ \  | | 
  | || | | |  _| | | (_| | |  | | | | | | (_| |  / ___ \ | | 
 |___|_| |_|_| |_|  \__,_|_|  |_|_|_| |_|\__,_| /_/   \_\___|
                                                              
EOF
echo -e "${NC}"
echo -e "${BOLD}Starting InfraMind-AI Development Environment${NC}"
echo ""

# Step 1: Check database services (only if --docker flag is enabled)
if [ "$USE_DOCKER" = true ] && [ "$FRONTEND_ONLY" = false ]; then
    print_header "Database Services"
    
    if [ -d "$DB_SERVICES_DIR" ]; then
        print_info "Starting database services with Docker..."
        
        if command_exists docker-compose || command_exists docker; then
            cd "$DB_SERVICES_DIR"
            
            # Check if services are running
            if docker-compose ps 2>/dev/null | grep -q "Up"; then
                print_success "Database services are already running"
            else
                print_info "Starting database services..."
                docker-compose up -d
                if [ $? -eq 0 ]; then
                    print_success "Database services started"
                    sleep 3
                else
                    print_error "Failed to start database services"
                    cd "$SCRIPT_DIR"
                    exit 1
                fi
            fi
            
            cd "$SCRIPT_DIR"
        else
            print_error "Docker not found. Cannot start database services."
            print_info "Install Docker or use external databases (without --docker flag)"
            exit 1
        fi
    else
        print_error "Database services directory not found at $DB_SERVICES_DIR"
        exit 1
    fi
elif [ "$USE_DOCKER" = false ] && [ "$FRONTEND_ONLY" = false ]; then
    print_header "Database Services"
    print_info "Using external database services (no --docker flag)"
    print_info "Databases should be configured in backend/.env"
fi

# Step 2: Start Backend (unless frontend-only)
if [ "$FRONTEND_ONLY" = false ]; then
    print_header "Backend Service"
    
    if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/start.sh" ]; then
        cd "$BACKEND_DIR"
        
        if [ "$QUICK_MODE" = true ]; then
            print_info "Starting backend in quick mode..."
            ./start.sh --quick
        else
            print_info "Starting backend..."
            ./start.sh
        fi
        
        cd "$SCRIPT_DIR"
        print_success "Backend startup completed"
    else
        print_error "Backend startup script not found at $BACKEND_DIR/start.sh"
        exit 1
    fi
fi

# Step 3: Start Frontend (unless backend-only)
if [ "$BACKEND_ONLY" = false ]; then
    print_header "Frontend Service"
    
    if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/start.sh" ]; then
        cd "$FRONTEND_DIR"
        
        if [ "$QUICK_MODE" = true ]; then
            print_info "Starting frontend in quick mode..."
            ./start.sh --quick
        else
            print_info "Starting frontend..."
            ./start.sh
        fi
        
        cd "$SCRIPT_DIR"
        print_success "Frontend startup completed"
    else
        print_error "Frontend startup script not found at $FRONTEND_DIR/start.sh"
        exit 1
    fi
fi

# Step 4: Final summary
print_header "InfraMind-AI Status"

echo -e "${BOLD}Services Running:${NC}"
echo ""

if [ "$FRONTEND_ONLY" = false ]; then
    # Check backend
    if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Backend${NC}      http://localhost:8000"
        echo -e "     ${BLUE}📚 API Docs${NC}   http://localhost:8000/docs"
        echo -e "     ${BLUE}📋 Logs${NC}       tail -f backend/backend.log"
        echo -e "     ${BLUE}🛑 Stop${NC}       pkill -f 'uvicorn app.main:app'"
    else
        echo -e "  ${RED}❌ Backend${NC}      Not running"
    fi
    echo ""
fi

if [ "$BACKEND_ONLY" = false ]; then
    # Check frontend
    if pgrep -f "react-scripts start" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Frontend${NC}     http://localhost:3000"
        echo -e "     ${BLUE}📋 Logs${NC}       tail -f frontend/frontend.log"
        echo -e "     ${BLUE}🛑 Stop${NC}       pkill -f 'react-scripts start'"
    else
        echo -e "  ${RED}❌ Frontend${NC}     Not running"
    fi
    echo ""
fi

if [ "$USE_DOCKER" = true ] && [ "$FRONTEND_ONLY" = false ]; then
    # Check database services
    if command_exists docker-compose || command_exists docker; then
        if docker-compose -f "$DB_SERVICES_DIR/docker-compose.yml" ps 2>/dev/null | grep -q "Up"; then
            echo -e "  ${GREEN}✅ Databases${NC}    Milvus, Redis, MinIO, etcd (Docker)"
            echo -e "     ${BLUE}🛑 Stop${NC}       cd db-services && docker-compose down"
        else
            echo -e "  ${YELLOW}⚠️  Databases${NC}    Docker services not running"
        fi
        echo ""
    fi
elif [ "$USE_DOCKER" = false ] && [ "$FRONTEND_ONLY" = false ]; then
    echo -e "  ${BLUE}ℹ️  Databases${NC}    External (configured in .env)"
    echo ""
fi

echo -e "${CYAN}=========================================${NC}"
echo ""
print_success "InfraMind-AI is ready!"
echo ""
print_info "Quick restart: ./start.sh --quick"
print_info "Stop all: pkill -f 'uvicorn app.main:app'; pkill -f 'react-scripts start'"
echo ""
