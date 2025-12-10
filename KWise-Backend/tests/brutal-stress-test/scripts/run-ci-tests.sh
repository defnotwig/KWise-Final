#!/bin/bash
# CI/CD Test Runner Script for Brutal Stress Tests
# Usage: ./run-ci-tests.sh [section_number]

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  K-WISE BRUTAL STRESS TEST - CI/CD RUNNER           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}\n"

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${RED}❌ Ollama is not running${NC}"
    echo -e "${YELLOW}   Start with: ollama serve${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Ollama: Running${NC}"

# Check if backend is running
if ! curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${RED}❌ K-Wise backend is not running${NC}"
    echo -e "${YELLOW}   Start with: cd KWise-Backend && npm start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ K-Wise Backend: Running${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Run tests
SECTION=$1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="ci-test-run-${TIMESTAMP}.log"

echo -e "\n${BLUE}🚀 Starting tests...${NC}\n"

if [ -z "$SECTION" ]; then
    # Run all tests
    npm run test:brutal 2>&1 | tee "$LOG_FILE"
    EXIT_CODE=${PIPESTATUS[0]}
else
    # Run specific section
    npm run "test:brutal:section${SECTION}" 2>&1 | tee "$LOG_FILE"
    EXIT_CODE=${PIPESTATUS[0]}
fi

# Parse results
echo -e "\n${BLUE}📊 Parsing results...${NC}\n"

RATING=$(grep "Overall Rating:" "$LOG_FILE" | awk '{print $3}' | head -1)
TRAPS_PASSED=$(grep "Passed:" "$LOG_FILE" | awk '{print $2}' | head -1)
TRAPS_FAILED=$(grep "Failed:" "$LOG_FILE" | awk '{print $2}' | head -1)

if [ -n "$RATING" ]; then
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}FINAL RESULTS${NC}"
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Rating: ${RATING}/5.0${NC}"
    echo -e "${GREEN}Traps Passed: ${TRAPS_PASSED}${NC}"
    if [ "$TRAPS_FAILED" != "0" ]; then
        echo -e "${RED}Traps Failed: ${TRAPS_FAILED}${NC}"
    else
        echo -e "${GREEN}Traps Failed: ${TRAPS_FAILED}${NC}"
    fi
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}\n"
    
    # Check if rating meets threshold
    THRESHOLD=4.5
    if (( $(echo "$RATING >= $THRESHOLD" | bc -l) )); then
        echo -e "${GREEN}✅ TEST PASSED: Rating ${RATING} meets ${THRESHOLD} threshold${NC}"
        exit 0
    else
        echo -e "${RED}❌ TEST FAILED: Rating ${RATING} below ${THRESHOLD} threshold${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Could not parse test results${NC}"
    exit $EXIT_CODE
fi

