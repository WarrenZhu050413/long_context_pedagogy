#!/usr/bin/env python3
"""Basic workspace initialization."""
import json
from pathlib import Path

def initialize_workspace():
    workspace_dir = Path.cwd() / 'workspace'
    workspace_dir.mkdir(exist_ok=True)
    
    files = ['user.json', 'graph.mmd', 'user_knowledge_graph.mmd']
    for filename in files:
        filepath = workspace_dir / filename
        if not filepath.exists():
            if filename.endswith('.json'):
                filepath.write_text('{"name":"","profile":{},"learning_history":{}}')
            else:
                filepath.write_text(f"graph TD\n    %% {filename}\n")
    
    (workspace_dir / 'slices').mkdir(exist_ok=True)
    return True

if __name__ == '__main__':
    initialize_workspace()
