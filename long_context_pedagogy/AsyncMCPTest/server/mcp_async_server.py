#!/usr/bin/env python3
"""
Async MCP Server with Claude CLI Integration
"""

import asyncio
import json
import sys
import argparse
from typing import Dict, Optional
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# MCP imports
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
except ImportError:
    print("Installing MCP SDK...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mcp"])
    from mcp.server import Server
    from mcp.server.stdio import stdio_server

from claude_cli_processor import ClaudeCLIProcessor
from rate_limiter import ElegantRateLimiter


class AsyncMCPServer:
    """MCP server using claude CLI via bash with rate limiting"""
    
    def __init__(self, max_requests: int = 10, window_minutes: int = 60):
        self.server = Server("async-processor")
        self.processor = ClaudeCLIProcessor()
        self.rate_limiter = ElegantRateLimiter(max_requests, window_minutes)
        
        # Task tracking
        self.tasks: Dict[str, dict] = {}
        self.processing_task = None
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup MCP protocol handlers"""
        
        @self.server.list_tools()
        async def list_tools():
            return [
                {
                    "name": "async_submit",
                    "description": "Submit async task (always succeeds, queues if needed)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The query to process"
                            },
                            "model": {
                                "type": "string",
                                "enum": ["sonnet", "opus"],
                                "default": "sonnet",
                                "description": "Model to use (sonnet=4.0, opus=4.1)"
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "async_status",
                    "description": "Check task status",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "The task ID to check"
                            }
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "async_rate_config",
                    "description": "Configure rate limits",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "max_requests": {
                                "type": "integer",
                                "minimum": 1,
                                "description": "Maximum concurrent requests"
                            },
                            "window_minutes": {
                                "type": "integer",
                                "minimum": 1,
                                "description": "Time window in minutes"
                            }
                        }
                    }
                }
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict):
            if name == "async_submit":
                return await self._handle_submit(arguments)
            elif name == "async_status":
                return await self._handle_status(arguments)
            elif name == "async_rate_config":
                return await self._handle_rate_config(arguments)
            
            raise ValueError(f"Unknown tool: {name}")
    
    async def _handle_submit(self, arguments: dict) -> dict:
        """Handle task submission - always succeeds"""
        query = arguments["query"]
        model = arguments.get("model", "sonnet")
        
        # Submit to rate limiter (always accepts)
        result = await self.rate_limiter.submit(query, model)
        
        # Store task info
        self.tasks[result["task_id"]] = {
            "query": query,
            "model": model,
            "status": "queued",
            "submitted_at": datetime.now().isoformat(),
            "queue_position": result["queue_position"],
            "estimated_start": result["estimated_start"]
        }
        
        # Log for debugging
        self._log(f"Task submitted: {result['task_id']} - Queue position: {result['queue_position']}")
        
        return {
            "content": [{
                "type": "text",
                "text": f"""Task submitted successfully!
• Task ID: {result['task_id']}
• Model: {model}
• Queue position: {result['queue_position']}
• Estimated wait: {result['estimated_wait_seconds']}s
• Estimated start: {result['estimated_start']}"""
            }]
        }
    
    async def _handle_status(self, arguments: dict) -> dict:
        """Check task status"""
        task_id = arguments["task_id"]
        
        # Check rate limiter for task
        task_info = await self.rate_limiter.get_task_status(task_id)
        
        if task_info:
            status_text = f"""Task Status:
• ID: {task_id}
• Status: {task_info.get('status', 'unknown')}
• Model: {task_info.get('model', 'unknown')}
• Submitted: {task_info.get('submitted_at', 'unknown')}"""
            
            if task_info.get('status') == 'completed':
                status_text += f"\n• Result: Check ~/async/{datetime.now().strftime('%Y-%m-%d')}/{task_id}.md"
            elif task_info.get('status') == 'processing':
                status_text += f"\n• Started: {task_info.get('started_at', 'unknown')}"
            elif task_info.get('status') == 'queued':
                status_text += f"\n• Queue position: {task_info.get('queue_position', 'unknown')}"
        else:
            status_text = f"Task {task_id} not found"
        
        return {
            "content": [{
                "type": "text",
                "text": status_text
            }]
        }
    
    async def _handle_rate_config(self, arguments: dict) -> dict:
        """Update rate configuration"""
        max_requests = arguments.get("max_requests")
        window_minutes = arguments.get("window_minutes")
        
        if max_requests:
            self.rate_limiter.max_requests = max_requests
        if window_minutes:
            self.rate_limiter.window_seconds = window_minutes * 60
        
        config = self.rate_limiter.get_config()
        
        return {
            "content": [{
                "type": "text",
                "text": f"""Rate limits updated:
• Max requests: {config['max_requests']}
• Window: {config['window_minutes']} minutes
• Current queue size: {config['queue_size']}"""
            }]
        }
    
    async def _process_loop(self):
        """Process tasks from rate limiter queue"""
        while True:
            try:
                # Get next task from rate limiter
                task = await self.rate_limiter.get_next_task()
                
                if task:
                    self._log(f"Processing task: {task['id']}")
                    
                    # Process with Claude CLI
                    result = await self.processor.process_with_claude_cli(
                        task['id'],
                        task['query'],
                        task['model']
                    )
                    
                    # Update task status
                    await self.rate_limiter.mark_completed(task['id'], result)
                    
                    self._log(f"Task completed: {task['id']} - Status: {result['status']}")
                else:
                    # No tasks, wait a bit
                    await asyncio.sleep(1)
                    
            except Exception as e:
                self._log(f"Processing error: {e}")
                await asyncio.sleep(5)
    
    def _log(self, message: str):
        """Log to file and stderr"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = f"[{timestamp}] {message}"
        
        # Log to file
        log_dir = Path("/app/logs") if Path("/app/logs").exists() else Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / "server.log"
        
        with open(log_file, "a") as f:
            f.write(log_msg + "\n")
        
        # Also print to stderr for Docker logs
        print(log_msg, file=sys.stderr)
    
    async def run(self):
        """Run the MCP server"""
        self._log("Starting Async MCP Server")
        self._log(f"Rate limit: {self.rate_limiter.max_requests} requests per {self.rate_limiter.window_seconds/60} minutes")
        
        # Start processing loop
        self.processing_task = asyncio.create_task(self._process_loop())
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(read_stream, write_stream, {})


def main():
    parser = argparse.ArgumentParser(description='Async MCP Server')
    parser.add_argument(
        '--max-requests',
        type=int,
        default=int(os.environ.get('MAX_REQUESTS', 10)),
        help='Maximum requests per window'
    )
    parser.add_argument(
        '--window-minutes',
        type=int,
        default=int(os.environ.get('WINDOW_MINUTES', 60)),
        help='Rate limit window in minutes'
    )
    
    args = parser.parse_args()
    
    # Create and run server
    server = AsyncMCPServer(args.max_requests, args.window_minutes)
    
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\nShutting down server...")


if __name__ == "__main__":
    import os
    main()