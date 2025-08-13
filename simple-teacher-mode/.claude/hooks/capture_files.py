#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Minimal hook to capture user.json and graph.mmd file changes.
Sends file content to the teacher mode observability server.
"""

import json
import sys
import urllib.request
import urllib.error

def send_file_to_server(session_id, file_type, content, server_url='http://localhost:3001/events'):
    """Send file content to the observability server."""
    try:
        data = {
            'session_id': session_id,
            'file_type': file_type,
            'content': content
        }
        
        req = urllib.request.Request(
            server_url,
            data=json.dumps(data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Claude-Teacher-Mode/1.0'
            }
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
            
    except Exception as e:
        # Silently fail to not disrupt Claude's operation
        print(f"Failed to send file: {e}", file=sys.stderr)
        return False

def main():
    try:
        # Read hook data from stdin
        input_data = json.load(sys.stdin)
        
        # Extract session_id
        session_id = input_data.get('session_id', 'unknown')
        
        # Check tool name and extract file information
        tool_name = input_data.get('tool_name', '')
        tool_input = input_data.get('tool_input', {})
        tool_output = input_data.get('tool_output', {})
        
        # We're interested in Write and Edit tools that modify our target files
        if tool_name in ['Write', 'Edit', 'MultiEdit']:
            file_path = tool_input.get('file_path', '')
            
            # Check if this is one of our tracked files
            if file_path.endswith('user.json'):
                # For Write tool, content is in tool_input
                if tool_name == 'Write':
                    content = tool_input.get('content', '')
                    send_file_to_server(session_id, 'user.json', content)
                # For Edit/MultiEdit, we'd need to read the file after edit
                # But we can track from the PostToolUse hook where the file is already modified
                
            elif file_path.endswith('graph.mmd'):
                if tool_name == 'Write':
                    content = tool_input.get('content', '')
                    send_file_to_server(session_id, 'graph.mmd', content)
        
        # Also check Read tool to capture initial state
        elif tool_name == 'Read':
            file_path = tool_input.get('file_path', '')
            
            if file_path.endswith('user.json') and tool_output:
                # Extract content from Read output
                content = tool_output.get('content', '')
                if content:
                    send_file_to_server(session_id, 'user.json', content)
                    
            elif file_path.endswith('graph.mmd') and tool_output:
                content = tool_output.get('content', '')
                if content:
                    send_file_to_server(session_id, 'graph.mmd', content)
        
    except Exception:
        # Silently handle errors to not disrupt Claude
        pass
    
    # Always exit successfully
    sys.exit(0)

if __name__ == '__main__':
    main()