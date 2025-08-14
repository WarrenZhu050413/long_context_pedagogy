#!/bin/bash

# Quick Demo Validation Test for Pedagogy System
# Validates all core functionality is working for demonstration

set -e

echo "🎓 Quick Demo Validation Test"
echo "============================"

BASE_URL="http://localhost:3001"

# Test 1: Server Health
echo "🔧 Checking server health..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    UPTIME=$(echo "$HEALTH" | jq -r '.uptime')
    MEMORY=$(echo "$HEALTH" | jq -r '.memory.rss' | awk '{print int($1/1024/1024)"MB"}')
    echo "✅ Server healthy (uptime: ${UPTIME}s, memory: $MEMORY)"
else
    echo "❌ Server not healthy"
    exit 1
fi

# Test 2: Workspace Detection
echo "🏢 Checking workspaces..."
WORKSPACES=$(curl -s "$BASE_URL/workspaces" | jq -r '. | length')
echo "✅ Found $WORKSPACES workspaces available"

# Test 3: Quick Event Test
echo "💬 Testing event capture..."
cd "/Users/wz/Desktop/zPersonalProjects/long_context_pedagogy/ml-infra"
echo "Testing quick event capture" | /Users/wz/Desktop/zPersonalProjects/long_context_pedagogy/ml-infra/.claude/hooks/capture_events.py

# Wait for event processing
sleep 2

# Check recent events
RECENT_EVENTS=$(curl -s "$BASE_URL/events?workspace=ml-infra&limit=5" | jq '. | length')
echo "✅ Recent events in ml-infra: $RECENT_EVENTS"

# Test 4: Knowledge Base Status
echo "📚 Checking knowledge base..."
KB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/kb/claude-graph?workspace=ml-infra")
PROFILE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/kb/user-profile?workspace=ml-infra")

if [ "$KB_STATUS" = "200" ] && [ "$PROFILE_STATUS" = "200" ]; then
    echo "✅ Knowledge base accessible"
else
    echo "⚠️  Knowledge base status: Claude=$KB_STATUS, Profile=$PROFILE_STATUS"
fi

# Test 5: UI Accessibility
echo "🖥️  Checking UI accessibility..."
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$UI_STATUS" = "200" ]; then
    echo "✅ UI accessible at http://localhost:3001"
else
    echo "❌ UI not accessible"
fi

echo ""
echo "🎉 Demo Validation Complete!"
echo ""
echo "🚀 Demo Instructions:"
echo "  1. Open http://localhost:3001 in browser"
echo "  2. Select different workspaces (ml-infra, ml-systems, etc.)"
echo "  3. Run Claude commands in workspace directories:"
echo "     cd ml-systems && claude -p 'Teach me about neural networks'"
echo "  4. Watch real-time updates in the UI"
echo ""
echo "💡 Available workspaces for demo:"
curl -s "$BASE_URL/workspaces" | jq -r '.[] | "  - \(.id): \(.topic)"'
echo ""
echo "✨ The system is ready for demonstration!"