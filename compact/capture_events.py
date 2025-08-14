#!/usr/bin/env python3
import json
import sys
import requests
from datetime import datetime

def main():
    try:
        # Read stdin
        stdin_data = sys.stdin.read()
        
        # Simple parsing
        lines = stdin_data.strip().split('\n')
        user_prompt = None
        session_id = f"session-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Find user prompt
        for line in lines:
            if '"user_prompt":' in line:
                user_prompt = json.loads('{' + line + '}')['user_prompt']
                break
            elif line.startswith('User: '):
                user_prompt = line[6:]
                break
        
        if user_prompt:
            # Send to compact server
            requests.post('http://localhost:3002/events', json={
                'session_id': session_id,
                'user_prompt': user_prompt[:200]  # Truncate
            }, timeout=1)
            
    except Exception:
        pass  # Silent fail

if __name__ == '__main__':
    main()