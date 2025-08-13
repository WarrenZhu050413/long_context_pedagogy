#!/bin/bash

# End-to-end test script for Async MCP Server

set -e

echo "==================================="
echo "Async MCP Server End-to-End Test"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: ANTHROPIC_API_KEY environment variable not set${NC}"
    echo "Please set: export ANTHROPIC_API_KEY='your-key-here'"
    exit 1
fi

echo -e "${GREEN}✓ API Key configured${NC}"

# Step 1: Build and start the Docker container
echo -e "\n${YELLOW}Step 1: Building Docker container...${NC}"
docker-compose build

echo -e "\n${YELLOW}Step 2: Starting MCP server...${NC}"
docker-compose up -d

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 5

# Check if container is running
if docker ps | grep -q async-mcp; then
    echo -e "${GREEN}✓ Container is running${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    docker-compose logs
    exit 1
fi

# Step 3: Test basic submission
echo -e "\n${YELLOW}Step 3: Testing basic task submission...${NC}"
claude -p "Use the async_submit MCP tool to process this query: 'What are the key principles of async programming?'"

# Wait for processing
sleep 10

# Step 4: Check Docker logs
echo -e "\n${YELLOW}Step 4: Checking server logs...${NC}"
docker logs async-mcp --tail 20

# Step 5: Check if results directory was created
echo -e "\n${YELLOW}Step 5: Verifying results directory...${NC}"
if [ -d ~/async ]; then
    echo -e "${GREEN}✓ Results directory exists${NC}"
    
    # Check for index file
    if [ -f ~/async/index.json ]; then
        echo -e "${GREEN}✓ Index file created${NC}"
        echo "Index contents:"
        cat ~/async/index.json | python -m json.tool | head -20
    else
        echo -e "${YELLOW}⚠ Index file not yet created${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Results directory not yet created${NC}"
fi

# Step 6: Test rate limiting
echo -e "\n${YELLOW}Step 6: Testing rate limiting (submitting multiple tasks)...${NC}"
for i in {1..3}; do
    echo "Submitting task $i..."
    claude -p "async_submit('Test query $i', 'haiku')" &
done
wait

# Step 7: Final status check
echo -e "\n${YELLOW}Step 7: Final status check...${NC}"
sleep 5
docker logs async-mcp --tail 30

echo -e "\n${GREEN}==================================="
echo "Test completed!"
echo "===================================${NC}"
echo ""
echo "To monitor the server:"
echo "  docker logs -f async-mcp"
echo ""
echo "To stop the server:"
echo "  docker-compose down"
echo ""
echo "To check results:"
echo "  ls -la ~/async/"