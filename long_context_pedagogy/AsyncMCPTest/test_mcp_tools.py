#!/usr/bin/env python3
"""
Test script to verify MCP async tools are available and working
"""

def test_async_submit():
    """Test that we can submit an async query"""
    print("=== Testing async_submit ===")
    try:
        # This should be available as an MCP tool when run in Claude
        result = async_submit("What are the key principles of async programming?", "sonnet")
        print(f"✅ async_submit worked: {result}")
        return result
    except NameError:
        print("❌ async_submit tool not available - MCP server may not be connected")
        return None
    except Exception as e:
        print(f"❌ async_submit failed: {e}")
        return None

def test_async_status(task_id):
    """Test that we can check status of a task"""
    print("=== Testing async_status ===")
    if not task_id:
        print("⏭️  Skipping async_status test - no task_id")
        return
        
    try:
        result = async_status(task_id)
        print(f"✅ async_status worked: {result}")
        return result
    except NameError:
        print("❌ async_status tool not available")
        return None
    except Exception as e:
        print(f"❌ async_status failed: {e}")
        return None

def test_async_rate_config():
    """Test that we can update rate limiting config"""
    print("=== Testing async_rate_config ===")
    try:
        result = async_rate_config(max_requests=5, window_minutes=10)
        print(f"✅ async_rate_config worked: {result}")
        return result
    except NameError:
        print("❌ async_rate_config tool not available")
        return None
    except Exception as e:
        print(f"❌ async_rate_config failed: {e}")
        return None

if __name__ == "__main__":
    print("🧪 Testing AsyncMCP Tools")
    print("Note: This script should be run by Claude Code with MCP server connected\n")
    
    # Test async_submit
    task_result = test_async_submit()
    task_id = task_result.get('task_id') if task_result else None
    
    # Test async_status  
    test_async_status(task_id)
    
    # Test rate config
    test_async_rate_config()
    
    print("\n🏁 Test complete!")