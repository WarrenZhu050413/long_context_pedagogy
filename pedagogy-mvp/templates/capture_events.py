#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Event capture hook for Claude Code.
Captures all events and sends them to the pedagogy server.
"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

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
        return False

def determine_event_type(parsed_input):
    """Determine which Claude Code hook is calling us."""
    if 'prompt' in parsed_input:
        return 'UserPromptSubmit'
    elif 'tool_name' in parsed_input:
        return 'PostToolUse'  
    elif 'transcript_path' in parsed_input:
        return 'Stop'
    elif 'session_id' in parsed_input and len(parsed_input) == 1:
        return 'SessionStart'
    else:
        import os
        return os.environ.get('CLAUDE_HOOK_TYPE', 'Unknown')

def initialize_workspace_on_session_start():
    """Initialize workspace and call study::init on session start."""
    try:
        workspace_dir = Path.cwd()
        kb_dir = workspace_dir / 'kb'
        kb_dir.mkdir(exist_ok=True)
        
        # Create basic knowledge files if they don't exist
        claude_graph = workspace_dir / 'claude_knowledge_graph.mmd'
        if not claude_graph.exists():
            claude_graph.write_text("graph TD\n    Start[\"Ready to learn about your topic\"]\n")
            
        user_graph = workspace_dir / 'user_knowledge_graph.mmd'
        if not user_graph.exists():
            user_graph.write_text("graph TD\n    User[\"User starting learning journey\"]\n")
            
        user_json = workspace_dir / 'user.json'
        if not user_json.exists():
            user_data = {
                "name": "",
                "learning_goals": [],
                "current_topic": "",
                "knowledge_level": "beginner",
                "progress": {}
            }
            user_json.write_text(json.dumps(user_data, indent=2))
        
        return True
    except Exception as e:
        print(f"Workspace initialization error: {e}", file=sys.stderr)
        return False

def main():
    try:
        # Read stdin
        stdin_data = sys.stdin.read()
        
        # Parse input
        try:
            parsed_input = json.loads(stdin_data)
        except:
            parsed_input = {'raw_stdin': stdin_data}
        
        # Determine event type
        event_type = determine_event_type(parsed_input)
        session_id = parsed_input.get('session_id', 'unknown')
        
        # Build event data
        event_data = {
            'session_id': session_id,
            'event_type': event_type,
            'timestamp': int(datetime.now().timestamp() * 1000),
            'stdin_data': parsed_input,
            'raw_stdin': stdin_data,
        }
        
        # Add specific fields based on event type
        if event_type == 'UserPromptSubmit':
            event_data['user_prompt'] = parsed_input.get('prompt', '')
            
        elif event_type == 'PostToolUse':
            event_data['tool_name'] = parsed_input.get('tool_name', '')
            event_data['tool_input'] = parsed_input.get('tool_input', {})
            event_data['tool_output'] = parsed_input.get('tool_output', {})
            
        elif event_type == 'Stop':
            event_data['transcript_path'] = parsed_input.get('transcript_path', '')
            
        elif event_type == 'SessionStart':
            # Initialize workspace and trigger study::init
            init_success = initialize_workspace_on_session_start()
            event_data['workspace_initialized'] = init_success
            
            # Add study::init command to the prompt
            if init_success:
                enhanced_prompt = "/study::init"
                print(enhanced_prompt)
                event_data['stdout_output'] = enhanced_prompt
                send_event_to_server(event_data)
                return
        
        # Handle output for other event types
        stdout_output = ""
        if event_type == 'UserPromptSubmit':
            original_prompt = parsed_input.get('prompt', '')
            print(original_prompt)
            stdout_output = original_prompt
        
        event_data['stdout_output'] = stdout_output
        send_event_to_server(event_data)
        
    except Exception as e:
        print(f"Event capture error: {e}", file=sys.stderr)
    
    sys.exit(0)

if __name__ == '__main__':
    main()