#!/usr/bin/env python3
"""
Local test of the async MCP server without Docker
Simulates the MCP server behavior for testing
"""

import asyncio
import sys
import os
sys.path.append('server')

from rate_limiter import ElegantRateLimiter
from claude_cli_processor import ClaudeCLIProcessor
import json
from datetime import datetime

async def test_rate_limiter():
    """Test the rate limiter with multiple submissions"""
    print("="*50)
    print("Testing Async MCP Server (Local)")
    print("="*50)
    
    # Create rate limiter with low limits for testing
    rate_limiter = ElegantRateLimiter(max_requests=2, window_minutes=1)
    processor = ClaudeCLIProcessor()
    
    # Test 1: Submit tasks
    print("\n1. Submitting 5 tasks to test queueing...")
    tasks = []
    
    test_queries = [
        ("What is Python?", "sonnet"),
        ("Explain Docker", "opus"),
        ("What is asyncio?", "sonnet"),
        ("Explain MCP", "sonnet"),
        ("What is Redis?", "opus")
    ]
    
    for i, (query, model) in enumerate(test_queries, 1):
        result = await rate_limiter.submit(query, model)
        tasks.append(result["task_id"])
        print(f"  Task {i}: {result['task_id']}")
        print(f"    Queue position: {result['queue_position']}")
        print(f"    Estimated wait: {result['estimated_wait_seconds']}s")
    
    # Test 2: Check status
    print("\n2. Checking task status...")
    for task_id in tasks[:2]:
        status = await rate_limiter.get_task_status(task_id)
        if status:
            print(f"  Task {task_id}: {status['status']}")
    
    # Test 3: Check configuration
    print("\n3. Current configuration:")
    config = rate_limiter.get_config()
    print(f"  Max requests: {config['max_requests']}")
    print(f"  Window: {config['window_minutes']} minutes")
    print(f"  Queue size: {config['queue_size']}")
    print(f"  Active slots: {config['active_slots']}")
    
    # Test 4: Process one task
    print("\n4. Processing first task...")
    task = await rate_limiter.get_next_task()
    if task:
        print(f"  Processing: {task['id']}")
        print(f"  Query: {task['query'][:50]}...")
        print(f"  Model: {task['model']}")
        
        # Simulate processing
        await asyncio.sleep(2)
        await rate_limiter.mark_completed(task['id'], {"status": "completed"})
        print(f"  Completed: {task['id']}")
    
    print("\n5. Final queue status:")
    config = rate_limiter.get_config()
    print(f"  Queue size: {config['queue_size']}")
    print(f"  Total tasks: {config['total_tasks']}")

async def test_claude_cli():
    """Test Claude CLI integration"""
    print("\n" + "="*50)
    print("Testing Claude CLI Integration")
    print("="*50)
    
    processor = ClaudeCLIProcessor()
    
    # Test with a simple query
    print("\n1. Testing claude -p command...")
    result = await processor.process_with_claude_cli(
        task_id="test-001",
        query="Say 'Hello from MCP test' in exactly 5 words",
        model="sonnet"
    )
    
    print(f"  Status: {result['status']}")
    if result['status'] == 'completed':
        print(f"  Result preview: {result.get('result', 'No result')[:100]}")
    else:
        print(f"  Error: {result.get('error', 'Unknown error')}")
    
    # Check if results were saved
    print("\n2. Checking saved results...")
    results_dir = processor.results_dir
    if results_dir.exists():
        print(f"  Results directory exists: {results_dir}")
        
        # Check for today's directory
        date_dir = results_dir / datetime.now().strftime("%Y-%m-%d")
        if date_dir.exists():
            print(f"  Today's directory: {date_dir}")
            files = list(date_dir.glob("*.md"))
            print(f"  Files saved: {len(files)}")
            for f in files[:3]:
                print(f"    - {f.name}")

if __name__ == "__main__":
    print("Starting local tests...")
    
    # Test rate limiter
    asyncio.run(test_rate_limiter())
    
    # Test Claude CLI
    print("\nTesting Claude CLI (this will make an actual API call)...")
    response = input("Do you want to test Claude CLI? (y/n): ")
    if response.lower() == 'y':
        asyncio.run(test_claude_cli())
    
    print("\n" + "="*50)
    print("Tests completed!")
    print("="*50)