#!/bin/bash

# AI Dance Studio Manager - Start Script
# This script cleans ports, sets up the database, seeds data, and starts the application

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

SERVER_PORT=${SERVER_PORT:-4000}
CLIENT_PORT=${CLIENT_PORT:-3000}
DB_NAME=${DB_NAME:-dance_studio}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║       AI Dance Studio Manager                    ║"
echo "║       Starting Application...                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Clean up used ports
echo -e "${YELLOW}[1/6] Cleaning up ports ${SERVER_PORT} and ${CLIENT_PORT}...${NC}"
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  Port $port is free"
  fi
}
kill_port $SERVER_PORT
kill_port $CLIENT_PORT
# Also clean port 5173 (vite default) just in case
kill_port 5173
echo -e "${GREEN}  Ports cleaned.${NC}"

# Step 2: Install dependencies
echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  npm install
else
  echo -e "  Root dependencies already installed."
fi

if [ ! -d "client/node_modules" ]; then
  cd client && npm install && cd ..
else
  echo -e "  Client dependencies already installed."
fi
echo -e "${GREEN}  Dependencies ready.${NC}"

# Step 3: Create database if not exists
echo -e "${YELLOW}[3/6] Setting up PostgreSQL database...${NC}"
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME" && echo "yes" || echo "no")
if [ "$DB_EXISTS" = "no" ]; then
  echo -e "  Creating database '${DB_NAME}'..."
  createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true
  echo -e "${GREEN}  Database created.${NC}"
else
  echo -e "  Database '${DB_NAME}' already exists."
fi

# Step 4: Seed database
echo -e "${YELLOW}[4/6] Seeding database with sample data...${NC}"
node server/seeds/seed.js
echo -e "${GREEN}  Database seeded successfully.${NC}"

# Step 5: Start the server with hot reload (nodemon watches for changes)
echo -e "${YELLOW}[5/6] Starting backend server on port ${SERVER_PORT}...${NC}"
npx nodemon --watch server --ext js,json server/index.js &
SERVER_PID=$!
sleep 2
echo -e "${GREEN}  Backend server started (PID: $SERVER_PID).${NC}"

# Step 6: Start the client dev server with hot reload
echo -e "${YELLOW}[6/6] Starting frontend on port ${CLIENT_PORT}...${NC}"
cd client && npx vite --port $CLIENT_PORT --host &
CLIENT_PID=$!
cd ..
sleep 2
echo -e "${GREEN}  Frontend started (PID: $CLIENT_PID).${NC}"

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  ${GREEN}Application is running!                         ${PURPLE}║${NC}"
echo -e "${PURPLE}║                                                  ║${NC}"
echo -e "${PURPLE}║  ${BLUE}Frontend:  http://localhost:${CLIENT_PORT}              ${PURPLE}║${NC}"
echo -e "${PURPLE}║  ${BLUE}Backend:   http://localhost:${SERVER_PORT}              ${PURPLE}║${NC}"
echo -e "${PURPLE}║                                                  ║${NC}"
echo -e "${PURPLE}║  ${YELLOW}Login: admin@dancestudio.com / password123     ${PURPLE}║${NC}"
echo -e "${PURPLE}║                                                  ║${NC}"
echo -e "${PURPLE}║  ${NC}Press Ctrl+C to stop all services              ${PURPLE}║${NC}"
echo -e "${PURPLE}║  ${NC}Both server & client auto-reload on changes    ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Handle cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $SERVER_PID 2>/dev/null || true
  kill $CLIENT_PID 2>/dev/null || true
  kill_port $SERVER_PORT
  kill_port $CLIENT_PORT
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
