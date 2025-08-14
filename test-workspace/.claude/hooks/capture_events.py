#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Simple, robust event capture hook.
Logs ALL Claude Code events with complete stdin/stdout data.
Works for UserPromptSubmit, PostToolUse, Stop, and SessionStart hooks.
"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime

def send_event_to_server(event_data):
    """Send event data to server. Fail silently if server unavailable."""
    try:
        req = urllib.request.Request(
            'http://localhost:3001/events',
            data=json.dumps(event_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status == 200
            
    except Exception:
        # Silently fail - don't disrupt Claude's operation
        return False

def determine_event_type(parsed_input):
    """Determine which Claude Code hook is calling us based on input data."""
    # Check input structure to determine event type
    if 'prompt' in parsed_input:
        return 'UserPromptSubmit'
    elif 'tool_name' in parsed_input:
        return 'PostToolUse'  
    elif 'transcript_path' in parsed_input:
        return 'Stop'
    elif 'session_id' in parsed_input and len(parsed_input) == 1:
        return 'SessionStart'
    else:
        # Check environment variables as fallback
        import os
        if 'CLAUDE_HOOK_TYPE' in os.environ:
            return os.environ['CLAUDE_HOOK_TYPE']
        return 'Unknown'

def call_initialize_workspace():
    """Call the separate initialization script."""
    try:
        import subprocess
        import os
        from pathlib import Path
        
        # Find the initialize_workspace.py script
        # Look in the same directory as this hook, or in parent directory
        current_dir = Path(__file__).parent
        script_paths = [
            current_dir / 'initialize_workspace.py',
            current_dir.parent / 'initialize_workspace.py',
            current_dir.parent.parent / 'initialize_workspace.py'
        ]
        
        script_path = None
        for path in script_paths:
            if path.exists():
                script_path = path
                break
        
        if not script_path:
            # Fallback: basic initialization inline
            return basic_initialize_workspace()
        
        # Call the initialization script
        result = subprocess.run(
            ['python3', str(script_path)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"Failed to call initialization script: {e}", file=sys.stderr)
        return basic_initialize_workspace()

def basic_initialize_workspace():
    """Fallback basic initialization if script not found."""
    try:
        from pathlib import Path
        workspace_dir = Path.cwd() / 'workspace'
        workspace_dir.mkdir(exist_ok=True)
        
        # Create basic files if they don't exist  
        user_json_path = workspace_dir / 'user.json'
        if not user_json_path.exists():
            user_json_path.write_text('{"name":"","profile":{},"learning_history":{}}')
        
        graph_path = workspace_dir / 'graph.mmd'
        if not graph_path.exists():
            graph_path.write_text("graph TD\n    %% Knowledge graph\n")
            
        user_graph_path = workspace_dir / 'user_knowledge_graph.mmd'
        if not user_graph_path.exists():
            user_graph_path.write_text("graph TD\n    %% User knowledge\n")
            
        (workspace_dir / 'slices').mkdir(exist_ok=True)
        
        return True
        
    except Exception as e:
        print(f"Basic initialization error: {e}", file=sys.stderr)
        return False

def main():
    try:
        # Read complete stdin
        stdin_data = sys.stdin.read()
        
        # Try to parse as JSON, fallback to raw text
        parsed_input = None
        try:
            parsed_input = json.loads(stdin_data)
        except:
            parsed_input = {'raw_stdin': stdin_data}
        
        # Extract session ID if available
        session_id = parsed_input.get('session_id', 'unknown')
        
        # Determine event type from input data
        event_type = determine_event_type(parsed_input)
        
        # Build comprehensive event data
        event_data = {
            'session_id': session_id,
            'event_type': event_type,
            'timestamp': int(datetime.now().timestamp() * 1000),
            'stdin_data': parsed_input,  # Complete input from Claude
            'raw_stdin': stdin_data,     # Raw stdin for debugging
        }
        
        # Add specific fields based on event type for easy querying
        if event_type == 'UserPromptSubmit':
            event_data['user_prompt'] = parsed_input.get('prompt', '')
            
        elif event_type == 'PostToolUse':
            event_data['tool_name'] = parsed_input.get('tool_name', '')
            event_data['tool_input'] = parsed_input.get('tool_input', {})
            event_data['tool_output'] = parsed_input.get('tool_output', {})
            
        elif event_type == 'Stop':
            event_data['transcript_path'] = parsed_input.get('transcript_path', '')
            
        elif event_type == 'SessionStart':
            # Initialize workspace on session start
            init_success = call_initialize_workspace()
            event_data['workspace_initialized'] = init_success
        
        # Handle output based on event type
        stdout_output = ""
        
        if event_type == 'UserPromptSubmit':
            # Pass through the original prompt unchanged
            original_prompt = parsed_input.get('prompt', '')
            print(original_prompt)
            stdout_output = original_prompt
        elif event_type == 'SessionStart':
            # Output initialization message
            init_msg = "Workspace initialized with learning files"
            print(init_msg)
            stdout_output = init_msg
        
        # Add stdout to event data  
        event_data['stdout_output'] = stdout_output
        
        # Send to server
        send_event_to_server(event_data)
        
    except Exception as e:
        # Log error but don't fail
        print(f"Event capture error: {e}", file=sys.stderr)
    
    # Always exit successfully to not disrupt Claude
    sys.exit(0)

if __name__ == '__main__':
    main()
