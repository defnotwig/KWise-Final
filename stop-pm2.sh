#!/bin/bash

# K-Wise PM2 Stop Script
# This script stops the K-Wise application

echo "===================================="
echo "K-Wise PM2 Stop Script"
echo "===================================="
echo ""

# Change to the script's directory
cd "$(dirname "$0")"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "ERROR: PM2 is not installed or not in PATH"
    exit 1
fi

echo "Stopping K-Wise application..."
echo ""

# Stop all PM2 processes
pm2 stop all

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "K-Wise stopped successfully!"
    echo "===================================="
    echo ""
else
    echo ""
    echo "ERROR: Failed to stop K-Wise application"
    exit 1
fi
