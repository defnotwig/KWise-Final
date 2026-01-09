#!/bin/bash

# K-Wise PM2 Startup Script
# This script starts the K-Wise application using PM2
# Can be used with cron or systemd

echo "===================================="
echo "K-Wise PM2 Startup Script"
echo "===================================="
echo ""

# Change to the script's directory
cd "$(dirname "$0")"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "ERROR: PM2 is not installed or not in PATH"
    echo "Please install PM2 globally: npm install -g pm2"
    exit 1
fi

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "ERROR: ecosystem.config.js not found"
    echo "Please ensure you are in the correct directory"
    exit 1
fi

echo "Starting K-Wise application with PM2..."
echo ""

# Start the application using PM2
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "K-Wise started successfully!"
    echo "===================================="
    echo ""
    echo "To view status: pm2 status"
    echo "To view logs:   pm2 logs"
    echo "To stop:        pm2 stop all"
    echo "To restart:     pm2 restart all"
    echo ""
else
    echo ""
    echo "ERROR: Failed to start K-Wise application"
    echo "Check the logs for more details: pm2 logs"
    exit 1
fi

# Save the PM2 process list
pm2 save

echo ""
echo "PM2 startup configuration saved."
echo ""
