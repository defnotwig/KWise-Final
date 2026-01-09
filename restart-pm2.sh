#!/bin/bash

# K-Wise PM2 Restart Script
# This script restarts the K-Wise application

echo "===================================="
echo "K-Wise PM2 Restart Script"
echo "===================================="
echo ""

# Change to the script's directory
cd "$(dirname "$0")"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "ERROR: PM2 is not installed or not in PATH"
    exit 1
fi

echo "Restarting K-Wise application..."
echo ""

# Restart all PM2 processes
pm2 restart all

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "K-Wise restarted successfully!"
    echo "===================================="
    echo ""
    echo "To view status: pm2 status"
    echo "To view logs:   pm2 logs"
    echo ""
else
    echo ""
    echo "ERROR: Failed to restart K-Wise application"
    echo "Check the logs: pm2 logs"
    exit 1
fi
