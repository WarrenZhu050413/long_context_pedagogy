#!/usr/bin/env python3
"""
Workspace initialization utility.
Creates and maintains workspace learning files for Claude Code.
"""

import json
import sys
from pathlib import Path

def initialize_workspace():
    """
    Initialize workspace files and directory structure.
    Creates basic learning files if they don't exist.
    Returns True if successful, False otherwise.
    """
    try:
        workspace_dir = Path.cwd() / 'workspace'
        workspace_dir.mkdir(exist_ok=True)
        
        created_files = []
        
        # Create user.json if it doesn't exist
        user_json_path = workspace_dir / 'user.json'
        if not user_json_path.exists():
            user_profile = {
                "name": "",
                "profile": {
                    "experience_level": "",
                    "learning_style": "",
                    "interests": [],
                    "strengths": [],
                    "challenges": []
                },
                "learning_history": {
                    "sessions": [],
                    "concepts_mastered": [],
                    "concepts_in_progress": [],
                    "current_focus": ""
                }
            }
            user_json_path.write_text(json.dumps(user_profile, indent=2))
            created_files.append('user.json')
        
        # Create graph.mmd if it doesn't exist
        graph_path = workspace_dir / 'graph.mmd'
        if not graph_path.exists():
            graph_content = "graph TD\n    %% Complete knowledge graph from source materials\n"
            graph_path.write_text(graph_content)
            created_files.append('graph.mmd')
        
        # Create user_knowledge_graph.mmd if it doesn't exist
        user_graph_path = workspace_dir / 'user_knowledge_graph.mmd'
        if not user_graph_path.exists():
            user_graph_content = "graph TD\n    %% User's current understanding\n"
            user_graph_path.write_text(user_graph_content)
            created_files.append('user_knowledge_graph.mmd')
            
        # Create slices directory
        slices_dir = workspace_dir / 'slices'
        if not slices_dir.exists():
            slices_dir.mkdir(exist_ok=True)
            created_files.append('slices/')
        
        # Log what was created
        if created_files:
            print(f"Initialized workspace files: {', '.join(created_files)}", file=sys.stderr)
        
        return True
        
    except Exception as e:
        print(f"Workspace initialization error: {e}", file=sys.stderr)
        return False

def check_workspace_status():
    """
    Check the current status of workspace files.
    Returns dictionary with file existence status.
    """
    workspace_dir = Path.cwd() / 'workspace'
    
    status = {
        'workspace_exists': workspace_dir.exists(),
        'user_json_exists': (workspace_dir / 'user.json').exists(),
        'graph_mmd_exists': (workspace_dir / 'graph.mmd').exists(),
        'user_graph_exists': (workspace_dir / 'user_knowledge_graph.mmd').exists(),
        'slices_dir_exists': (workspace_dir / 'slices').exists()
    }
    
    status['all_files_exist'] = all([
        status['user_json_exists'],
        status['graph_mmd_exists'], 
        status['user_graph_exists'],
        status['slices_dir_exists']
    ])
    
    return status

def main():
    """Command line interface for workspace initialization."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Initialize Claude Code workspace')
    parser.add_argument('--check', action='store_true', help='Check workspace status only')
    parser.add_argument('--force', action='store_true', help='Force reinitialize all files')
    
    args = parser.parse_args()
    
    if args.check:
        status = check_workspace_status()
        print("Workspace Status:")
        print(f"  Workspace directory: {'✓' if status['workspace_exists'] else '✗'}")
        print(f"  user.json: {'✓' if status['user_json_exists'] else '✗'}")
        print(f"  graph.mmd: {'✓' if status['graph_mmd_exists'] else '✗'}")
        print(f"  user_knowledge_graph.mmd: {'✓' if status['user_graph_exists'] else '✗'}")
        print(f"  slices/ directory: {'✓' if status['slices_dir_exists'] else '✗'}")
        print(f"  All files present: {'✓' if status['all_files_exist'] else '✗'}")
        return 0 if status['all_files_exist'] else 1
    
    if args.force:
        # Remove existing files to force recreation
        workspace_dir = Path.cwd() / 'workspace'
        if workspace_dir.exists():
            import shutil
            shutil.rmtree(workspace_dir)
            print("Removed existing workspace for clean initialization")
    
    # Initialize workspace
    success = initialize_workspace()
    
    if success:
        print("Workspace initialization completed successfully")
        return 0
    else:
        print("Workspace initialization failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())