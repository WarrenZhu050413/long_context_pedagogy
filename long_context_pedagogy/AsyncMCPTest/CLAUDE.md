# CLAUDE.md for AsyncMCPTest

## Overview
This directory contains the Async MCP Server implementation for processing async queries using Claude CLI in a Docker container with rate limiting.

## Available MCP Tools

### async_submit
Submit a query for async processing. Always succeeds by queuing.
- Parameters:
  - query (required): The question to process
  - model (optional): "sonnet" (default) or "opus"
- Returns: task_id, queue_position, estimated_wait_seconds

### async_status
Check the status of a submitted task.
- Parameters:
  - task_id (required): The task ID from async_submit
- Returns: status, model, timestamps, result preview

### async_rate_config
Configure rate limiting dynamically.
- Parameters:
  - max_requests (optional): Max concurrent requests
  - window_minutes (optional): Time window for rate limit
- Returns: Updated configuration

## Testing Workflow

1. **Basic Submission Test**
   ```
   Use async_submit to process: "What are the key principles of async programming?"
   ```

2. **Rate Limit Test**
   Submit multiple requests rapidly to test queuing:
   ```
   async_submit("Query 1", "haiku")
   async_submit("Query 2", "sonnet")
   async_submit("Query 3", "opus")
   ```

3. **Status Check**
   ```
   async_status(task_id)
   ```

## Implementation Details

### Rate Limiting
- Default: 10 requests per 60 minutes
- Requests beyond limit are queued, not rejected
- Queue provides estimated processing time

### Processing
- Uses `claude -p` command via subprocess
- Each task runs in isolated Docker container
- Results saved to ~/async/ directory

### Models
- sonnet: Claude 4.0 Sonnet (balanced, default)
- opus: Claude 4.1 Opus (most capable)

## Monitoring
- Check ~/async/index.json for task history
- View Docker logs: `docker logs async-mcp`
- Queue metrics in ~/async/monitoring/metrics.json

## Troubleshooting
- If MCP tools not available: Check ~/.claude/settings.json
- If tasks stuck: Check Docker container status
- If rate limit issues: Use async_rate_config to adjust

## IMPORTANT
- This is a TEST environment - verify before production use
- Results are persistent in ~/async/ directory
- Container requires ANTHROPIC_API_KEY environment variable