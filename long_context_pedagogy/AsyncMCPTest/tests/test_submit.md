# Test Prompts for Async MCP Server

## Basic Submission Test
Use the async_submit MCP tool to process this query: "What are the key principles of async programming?"

## Rate Limit Test
Submit these 5 queries using async_submit:
1. async_submit("What is Redis?", "haiku")
2. async_submit("Explain asyncio in Python", "sonnet")
3. async_submit("Docker networking basics", "opus")
4. async_submit("Python type hints", "haiku")
5. async_submit("MCP protocol overview", "sonnet")

## Status Check Test
Check the status of the most recent task using async_status

## Configuration Test
Update the rate limits using async_rate_config with max_requests=5 and window_minutes=10