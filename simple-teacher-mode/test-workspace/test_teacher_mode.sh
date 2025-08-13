#!/bin/bash

# Test script for Teacher Mode Observability with Turing PDF
# This script demonstrates multi-turn conversations and file tracking

echo "=== Teacher Mode Observability Test ==="
echo "Testing with Turing's Computing Machinery and Intelligence paper"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}Checking if server is running on port 3001...${NC}"
if curl -s http://localhost:3001/sessions > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${YELLOW}⚠ Server not running. Please start it with: node ../server.js${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Starting Claude session in test-workspace...${NC}"
cd "$(dirname "$0")"

# First prompt: Initialize and understand the workspace
echo -e "${YELLOW}Step 1: Initialize session and explore workspace${NC}"
SESSION_ID=$(claude --dangerously-skip-permissions -p "I'm studying Turing's 1950 paper on Computing Machinery and Intelligence. Please read the workspace/user.json file and understand the current state." --output-format json | jq -r '.session_id')

echo "Session ID: $SESSION_ID"
echo ""

# Second prompt: Update user.json with understanding
echo -e "${YELLOW}Step 2: Update user.json with understanding of the user${NC}"
claude --dangerously-skip-permissions --resume "$SESSION_ID" -p "Based on our conversation, please update the workspace/user.json file to reflect that I'm a student interested in AI foundations, particularly Turing's work on machine intelligence. Set my experience_level to 'intermediate' and learning_style to 'conceptual'."

sleep 2

# Third prompt: Read and analyze the graph
echo -e "${YELLOW}Step 3: Read and enhance the knowledge graph${NC}"
claude --dangerously-skip-permissions --resume "$SESSION_ID" -p "Now please read the workspace/graph.mmd file. This contains a knowledge graph derived from the Turing paper. Enhance it by adding concept nodes for key ideas like 'Imitation Game', 'Turing Test', 'Machine Intelligence', and 'Learning Machines'. Show the relationships between these concepts and the existing slices."

sleep 2

# Fourth prompt: Create comprehensive graph
echo -e "${YELLOW}Step 4: Write the enhanced graph${NC}"
claude --dangerously-skip-permissions --resume "$SESSION_ID" -p "Please write the enhanced graph to workspace/graph.mmd. Include nodes for: the Imitation Game concept, the various objections Turing addresses (theological, mathematical, consciousness), and the idea of learning machines. Connect these to the relevant slice nodes."

sleep 2

# Check what was captured
echo ""
echo -e "${BLUE}Checking captured events...${NC}"
echo "Latest session data:"
curl -s "http://localhost:3001/sessions/$SESSION_ID" | jq '{
  session_id: .id,
  created: .created_at,
  updated: .last_updated,
  has_user_json: (.files["user.json"] != null),
  has_graph_mmd: (.files["graph.mmd"] != null)
}'

echo ""
echo -e "${GREEN}Test complete!${NC}"
echo ""
echo "To view results:"
echo "1. Open http://localhost:3001/teacher.html in your browser"
echo "2. Look for session: $SESSION_ID"
echo "3. You should see:"
echo "   - Updated user.json with your learning profile"
echo "   - Enhanced graph.mmd with Turing paper concepts"
echo ""
echo "The UI will show:"
echo "- User model (JSON) in the top panel"
echo "- Knowledge graph (Mermaid diagram) in the bottom panel"