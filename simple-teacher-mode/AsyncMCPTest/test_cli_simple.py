#!/usr/bin/env python3
"""
Simple test of Claude CLI integration
"""

import asyncio
import sys
sys.path.insert(0, 'server')

from claude_cli_processor import ClaudeCLIProcessor
from datetime import datetime

async def main():
    print("Testing Claude CLI Processor...")
    processor = ClaudeCLIProcessor()
    
    # Test 1: Simple query
    print("\n1. Testing simple query with sonnet...")
    result = await processor.process_with_claude_cli(
        task_id="test-simple-001",
        query="List 3 benefits of async programming in Python. Be very concise.",
        model="sonnet"
    )
    
    print(f"Status: {result['status']}")
    if result['status'] == 'completed':
        print(f"Result saved to: {result.get('full_result_path', 'unknown')}")
        print(f"Preview: {result.get('result', '')[:200]}...")
    else:
        print(f"Error: {result.get('error', 'Unknown')}")
    
    # Test 2: Check if results were saved
    print("\n2. Checking saved results...")
    date_str = datetime.now().strftime("%Y-%m-%d")
    result_file = processor.results_dir / date_str / "test-simple-001.md"
    
    if result_file.exists():
        print(f"✓ Result file exists: {result_file}")
        content = result_file.read_text()
        print(f"✓ File size: {len(content)} characters")
    else:
        print(f"✗ Result file not found at {result_file}")
    
    # Test 3: Check index
    print("\n3. Checking index file...")
    index_file = processor.results_dir / "index.json"
    if index_file.exists():
        import json
        with open(index_file) as f:
            index = json.load(f)
        print(f"✓ Index contains {len(index['tasks'])} tasks")
        if index['tasks']:
            latest = index['tasks'][-1]
            print(f"  Latest task: {latest['task_id']}")
            print(f"  Model: {latest['model']}")
            print(f"  Query: {latest['query']}")
    else:
        print("✗ Index file not found")

if __name__ == "__main__":
    asyncio.run(main())