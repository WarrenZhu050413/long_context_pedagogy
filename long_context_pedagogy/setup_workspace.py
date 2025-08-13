#!/usr/bin/env python3
"""
General Claude Code workspace setup script.
Creates a workspace with event capture hooks and basic learning files.
"""

import os
import shutil
import json
import argparse
from pathlib import Path

def create_capture_events_hook(hooks_dir):
    """Create the simplified capture_events.py hook."""
    hook_content = '''#!/usr/bin/env -S uv run --script
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
            graph_path.write_text("graph TD\\n    %% Knowledge graph\\n")
            
        user_graph_path = workspace_dir / 'user_knowledge_graph.mmd'
        if not user_graph_path.exists():
            user_graph_path.write_text("graph TD\\n    %% User knowledge\\n")
            
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
'''
    
    hook_path = hooks_dir / 'capture_events.py'
    hook_path.write_text(hook_content)
    hook_path.chmod(0o755)
    return hook_path

def copy_initialization_script(workspace_path):
    """Copy the initialization script to the workspace."""
    source_script = Path(__file__).parent / 'initialize_workspace.py'
    target_script = workspace_path / 'initialize_workspace.py'
    
    if source_script.exists():
        import shutil
        shutil.copy2(source_script, target_script)
        target_script.chmod(0o755)
        return target_script
    else:
        # Create a basic version if source doesn't exist
        basic_init_content = '''#!/usr/bin/env python3
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
                filepath.write_text(f"graph TD\\n    %% {filename}\\n")
    
    (workspace_dir / 'slices').mkdir(exist_ok=True)
    return True

if __name__ == '__main__':
    initialize_workspace()
'''
        target_script.write_text(basic_init_content)
        target_script.chmod(0o755)
        return target_script

def create_settings_json(claude_dir):
    """Create .claude/settings.json with all hook configurations."""
    settings = {
        "hooks": {
            "SessionStart": [
                {
                    "hooks": [
                        {
                            "type": "command",
                            "command": "uv run .claude/hooks/capture_events.py"
                        }
                    ]
                }
            ],
            "UserPromptSubmit": [
                {
                    "hooks": [
                        {
                            "type": "command", 
                            "command": "uv run .claude/hooks/capture_events.py"
                        }
                    ]
                }
            ],
            "PostToolUse": [
                {
                    "matcher": "",
                    "hooks": [
                        {
                            "type": "command",
                            "command": "uv run .claude/hooks/capture_events.py"
                        }
                    ]
                }
            ],
            "Stop": [
                {
                    "matcher": "",
                    "hooks": [
                        {
                            "type": "command",
                            "command": "uv run .claude/hooks/capture_events.py"
                        }
                    ]
                }
            ]
        }
    }
    
    settings_path = claude_dir / 'settings.json'
    settings_path.write_text(json.dumps(settings, indent=2))
    return settings_path

def create_study_init_command(commands_dir):
    """Create the /study::init command."""
    command_content = '''Initialize learning mode for the current repository.

This command sets up the workspace for learning and knowledge tracking:

1. **Initialize workspace files**:
   - Read current workspace/user.json (user profile and learning history)
   - Read current workspace/graph.mmd (complete knowledge graph)
   - Read current workspace/user_knowledge_graph.mmd (user's current understanding)
   
2. **If PDF argument provided** ($ARGUMENTS):
   - Process the PDF document into conceptual chunks
   - Extract key concepts and relationships
   - Build initial knowledge graph in workspace/graph.mmd
   - Create document slices in workspace/slices/

3. **Update user profile**:
   - Create or update workspace/user.json with user's learning preferences
   - Initialize learning history if not present
   - Set current focus based on the topic

4. **Initialize knowledge tracking**:
   - Ensure workspace/user_knowledge_graph.mmd reflects current understanding

## IMPORTANT: Repository-Level Persistence

All files in workspace/ are REPOSITORY-LEVEL persistent:
- Every session in this repository shares the same user model and knowledge
- Knowledge accumulates across all Claude sessions in this directory
- User profile evolves continuously as learning progresses

## Usage Examples

Initialize without PDF:
```
/study::init
```

Initialize with PDF:
```
/study::init path/to/document.pdf  
```

Initialize with specific topic:
```
/study::init "machine learning fundamentals"
```

This command is automatically triggered on SessionStart to ensure workspace consistency.
'''
    
    command_path = commands_dir / 'study::init.md'
    command_path.write_text(command_content)
    return command_path

def create_claude_md(claude_dir):
    """Create .claude/CLAUDE.md with learning mode instructions."""
    claude_md_content = '''# Learning Mode - Event Capture System

You are operating in LEARNING MODE with comprehensive event capture.

## Core Principles

1. **Repository-Level Persistence**
   - All workspace files are shared across ALL sessions in this repository
   - user.json, graph.mmd, and user_knowledge_graph.mmd persist globally
   - Knowledge accumulates continuously across sessions

2. **Automatic Initialization**
   - SessionStart hook automatically runs /study::init
   - Workspace files are created/updated on every new session
   - Learning context is maintained automatically

3. **Event Logging**
   - All events (prompts, tool usage, responses) are captured
   - Complete stdin/stdout data is logged to the server
   - Simple, robust event capture that never disrupts operation

## Files You Work With

All in workspace/ directory (repository-level persistent):
- user.json - User's learning profile and history
- graph.mmd - Complete knowledge graph from source materials
- user_knowledge_graph.mmd - User's current understanding
- slices/ - Document chunks and learning materials

## Key Behaviors

1. **On session start**: Workspace automatically initialized
2. **During learning**: Update knowledge graphs incrementally
3. **When given PDFs**: Process into conceptual chunks and build graphs
4. **Complex tasks**: Use Task tool to launch subagents

## Remember

- Read current files before making updates
- All changes persist across sessions in this repository
- Focus on understanding and knowledge building
- Event capture works automatically in the background
'''
    
    claude_md_path = claude_dir / 'CLAUDE.md'
    claude_md_path.write_text(claude_md_content)
    return claude_md_path

def create_workspace_files(workspace_dir):
    """Create initial workspace learning files."""
    workspace_dir.mkdir(exist_ok=True)
    
    # Create user.json
    user_json = {
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
    
    user_json_path = workspace_dir / 'user.json'
    user_json_path.write_text(json.dumps(user_json, indent=2))
    
    # Create graph.mmd
    graph_mmd = "graph TD\n    %% Complete knowledge graph from source materials\n"
    graph_path = workspace_dir / 'graph.mmd'
    graph_path.write_text(graph_mmd)
    
    # Create user_knowledge_graph.mmd
    user_graph_mmd = "graph TD\n    %% User's current understanding\n"
    user_graph_path = workspace_dir / 'user_knowledge_graph.mmd'
    user_graph_path.write_text(user_graph_mmd)
    
    # Create slices directory
    slices_dir = workspace_dir / 'slices'
    slices_dir.mkdir(exist_ok=True)
    
    return [user_json_path, graph_path, user_graph_path, slices_dir]

def create_test_prompts(workspace_dir):
    """Create example prompts for testing."""
    test_prompts = '''# Example Learning Prompts

## Getting Started
- "I want to learn about [topic]. Start from the basics."
- "Explain [concept] in simple terms."
- "What should I learn next based on what I already know?"

## Knowledge Building  
- "How does [concept A] relate to [concept B]?"
- "Can you give me examples of [concept] in practice?"
- "What are the key principles of [topic]?"

## Assessment
- "What concepts have I mastered so far?"
- "What are the gaps in my understanding?"
- "Quiz me on what I've learned about [topic]."

## Advanced Learning
- "Show me the connections between everything I've learned."
- "Help me apply [concept] to solve [problem]."
- "What are the advanced topics I should explore next?"
'''
    
    prompts_path = workspace_dir / 'test_prompts.md'
    prompts_path.write_text(test_prompts)
    return prompts_path

def setup_workspace(directory_name):
    """Set up a complete learning workspace."""
    print(f"Setting up workspace in: {directory_name}")
    
    # Create main directory
    workspace_path = Path(directory_name)
    workspace_path.mkdir(exist_ok=True)
    
    # Create .claude directory structure
    claude_dir = workspace_path / '.claude'
    claude_dir.mkdir(exist_ok=True)
    
    hooks_dir = claude_dir / 'hooks'
    hooks_dir.mkdir(exist_ok=True)
    
    commands_dir = claude_dir / 'commands'
    commands_dir.mkdir(exist_ok=True)
    
    # Create workspace directory
    workspace_files_dir = workspace_path / 'workspace'
    
    # Create all components
    created_files = []
    
    print("  Creating event capture hook...")
    hook_path = create_capture_events_hook(hooks_dir)
    created_files.append(f"Hook: {hook_path.relative_to(workspace_path)}")
    
    print("  Creating hook settings...")
    settings_path = create_settings_json(claude_dir)
    created_files.append(f"Settings: {settings_path.relative_to(workspace_path)}")
    
    print("  Creating study::init command...")
    command_path = create_study_init_command(commands_dir)
    created_files.append(f"Command: {command_path.relative_to(workspace_path)}")
    
    print("  Creating CLAUDE.md...")
    claude_md_path = create_claude_md(claude_dir)
    created_files.append(f"Instructions: {claude_md_path.relative_to(workspace_path)}")
    
    print("  Creating workspace files...")
    workspace_files = create_workspace_files(workspace_files_dir)
    for wf in workspace_files:
        created_files.append(f"Workspace: {wf.relative_to(workspace_path)}")
    
    print("  Creating test prompts...")
    prompts_path = create_test_prompts(workspace_files_dir)
    created_files.append(f"Examples: {prompts_path.relative_to(workspace_path)}")
    
    print("  Copying initialization script...")
    init_script_path = copy_initialization_script(workspace_path)
    created_files.append(f"Script: {init_script_path.relative_to(workspace_path)}")
    
    return workspace_path, created_files

def verify_setup(workspace_path):
    """Verify that all components were created correctly."""
    required_files = [
        '.claude/hooks/capture_events.py',
        '.claude/commands/study::init.md', 
        '.claude/settings.json',
        '.claude/CLAUDE.md',
        'workspace/user.json',
        'workspace/graph.mmd',
        'workspace/user_knowledge_graph.mmd'
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = workspace_path / file_path
        if not full_path.exists():
            missing_files.append(file_path)
    
    return len(missing_files) == 0, missing_files

def test_hook_execution(workspace_path):
    """Test that the hook executes properly."""
    try:
        import subprocess
        
        hook_path = workspace_path / '.claude/hooks/capture_events.py'
        test_input = '{"session_id":"test-setup","prompt":"Hello setup test"}'
        
        result = subprocess.run(
            ['python3', str(hook_path)],
            input=test_input,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        return result.returncode == 0, result.stdout, result.stderr
        
    except Exception as e:
        return False, "", str(e)

def main():
    parser = argparse.ArgumentParser(description='Set up a general Claude Code learning workspace')
    parser.add_argument('-d', '--directory', default='test-workspace',
                       help='Directory name for the workspace (default: test-workspace)')
    
    args = parser.parse_args()
    
    try:
        # Set up workspace
        workspace_path, created_files = setup_workspace(args.directory)
        
        print(f"\nWorkspace setup complete at: {workspace_path.absolute()}")
        print(f"\nCreated files:")
        for file_info in created_files:
            print(f"  ✓ {file_info}")
        
        # Verify setup
        print(f"\nVerifying setup:")
        setup_ok, missing_files = verify_setup(workspace_path)
        
        if setup_ok:
            print("  ✓ All required files created")
        else:
            print("  ✗ Missing files:")
            for missing in missing_files:
                print(f"    - {missing}")
            return 1
        
        # Test hook execution
        print(f"\nTesting hook execution:")
        hook_ok, stdout, stderr = test_hook_execution(workspace_path)
        
        if hook_ok:
            print("  ✓ Hook execution successful")
        else:
            print("  ✗ Hook execution failed")
            if stderr:
                print(f"    Error: {stderr}")
            return 1
        
        print(f"\n" + "="*50)
        print(f"Workspace is ready for use!")
        print(f"="*50)
        print(f"\nTo start learning:")
        print(f"  cd {args.directory}")
        print(f"  claude -p 'Initialize learning mode'")
        print(f"\nTo view progress:")
        print(f"  Open http://localhost:3001/teacher.html")
        print(f"  (Make sure server is running: npm start)")
        
        return 0
        
    except Exception as e:
        print(f"Error setting up workspace: {e}")
        return 1

if __name__ == '__main__':
    exit(main())