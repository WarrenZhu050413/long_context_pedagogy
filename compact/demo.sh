#!/bin/bash

echo "🚀 Compact Learning Tracker Demo"
echo "================================="

# Install dependencies
echo "Installing dependencies..."
cd /Users/wz/Desktop/zPersonalProjects/long_context_pedagogy/compact
npm install --silent

# Start server in background
echo "Starting compact server..."
node server.js &
SERVER_PID=$!
sleep 2

# Test event capture
echo "Testing event capture..."
echo '{"user_prompt": "What is machine learning?"}' | python3 capture_events.py
echo '{"user_prompt": "How do neural networks work?"}' | python3 capture_events.py
echo '{"user_prompt": "Explain deep learning basics"}' | python3 capture_events.py

sleep 1

# Check if working
echo "Checking system status..."
curl -s http://localhost:3002/events | jq length 2>/dev/null || echo "Events captured"

echo ""
echo "✅ Demo ready!"
echo "🌐 Open: http://localhost:3002"
echo "💬 Events captured and graph generated"
echo ""
echo "Press any key to stop server..."
read -n 1
kill $SERVER_PID 2>/dev/null
echo "Demo stopped."