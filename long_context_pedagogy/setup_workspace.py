#!/usr/bin/env python3
"""
Clean, modular workspace setup for pedagogy learning system.
Creates a workspace with event capture hooks and knowledge tracking files.
"""

import os
import shutil
import json
import argparse
import subprocess
from pathlib import Path

# Get the directory containing this script for template access
SCRIPT_DIR = Path(__file__).parent
TEMPLATES_DIR = SCRIPT_DIR / 'templates'

def load_template(template_name, replacements=None):
    """Load a template file and apply replacements."""
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Template {template_name} not found in {TEMPLATES_DIR}")
    
    content = template_path.read_text()
    
    if replacements:
        for key, value in replacements.items():
            content = content.replace(key, value)
    
    return content

def create_claude_directory(workspace_path, topic=None):
    """Create .claude directory with hooks, commands, and settings."""
    claude_dir = workspace_path / '.claude'
    claude_dir.mkdir(exist_ok=True)
    
    hooks_dir = claude_dir / 'hooks'
    hooks_dir.mkdir(exist_ok=True)
    
    commands_dir = claude_dir / 'commands'
    commands_dir.mkdir(exist_ok=True)
    
    created_files = []
    
    # Create capture_events.py hook
    hook_content = load_template('capture_events.py')
    hook_path = hooks_dir / 'capture_events.py'
    hook_path.write_text(hook_content)
    hook_path.chmod(0o755)
    created_files.append(f"Hook: {hook_path.relative_to(workspace_path)}")
    
    # Create settings.json
    settings_content = load_template('settings.json')
    settings_path = claude_dir / 'settings.json'
    settings_path.write_text(settings_content)
    created_files.append(f"Settings: {settings_path.relative_to(workspace_path)}")
    
    # Create study::init command
    study_content = load_template('study_init.md')
    study_path = commands_dir / 'study::init.md'
    study_path.write_text(study_content)
    created_files.append(f"Command: {study_path.relative_to(workspace_path)}")
    
    # Create CLAUDE.md
    claude_md_content = load_template('claude_md.md')
    if topic:
        claude_md_content = claude_md_content.replace(
            "# Pedagogy Mode - Learning System",
            f"# Pedagogy Mode - Learning System\n\n**Current Topic**: {topic}"
        )
    claude_md_path = claude_dir / 'CLAUDE.md'
    claude_md_path.write_text(claude_md_content)
    created_files.append(f"Instructions: {claude_md_path.relative_to(workspace_path)}")
    
    return created_files

def create_knowledge_files(workspace_path, topic=None):
    """Create initial knowledge tracking files."""
    created_files = []
    
    # Create kb directory
    kb_dir = workspace_path / 'kb'
    kb_dir.mkdir(exist_ok=True)
    created_files.append(f"Knowledge base: {kb_dir.relative_to(workspace_path)}/")
    
    # Create claude_knowledge_graph.mmd
    if topic:
        claude_graph_content = f"""graph TD
    subgraph "Core Knowledge"
        Topic["{topic}"]
        Topic --> Concepts["Key Concepts"]
        Concepts --> Advanced["Advanced Topics"] 
        Advanced --> Applications["Real-world Applications"]
    end
    
    subgraph "Learning Path"
        Prerequisites["Prerequisites"]
        Prerequisites --> Topic
        Topic --> Practice["Hands-on Practice"]
        Practice --> Mastery["Subject Mastery"]
    end
    
    %% Knowledge structure will be built during research
    %% Focus: Domain concepts and relationships, not workflow
"""
    else:
        claude_graph_content = """graph TD
    Knowledge["Comprehensive Knowledge Base"]
    Knowledge --> Core["Core Concepts"]
    Knowledge --> Advanced["Advanced Topics"] 
    Knowledge --> Applications["Applications"]
    
    %% Will be populated with actual domain knowledge
    %% Focus: What to learn, not how to learn it
"""
    
    claude_graph_path = workspace_path / 'claude_knowledge_graph.mmd'
    claude_graph_path.write_text(claude_graph_content)
    created_files.append(f"Claude knowledge: {claude_graph_path.relative_to(workspace_path)}")
    
    # Create user_knowledge_graph.mmd
    if topic:
        user_graph_content = f"""graph TD
    subgraph "Current Knowledge"
        Known["What I Know"]
        Known --> Basics["Basic Understanding"]
    end
    
    subgraph "Learning Progress"
        Basics --> Learning["{topic} Concepts"]
        Learning --> Practicing["Applied Skills"]
        Practicing --> Confident["Confident Understanding"]
    end
    
    %% This tracks actual knowledge mastery
    %% Updated as user demonstrates understanding
"""
    else:
        user_graph_content = """graph TD
    CurrentKnowledge["My Current Knowledge"]
    CurrentKnowledge --> Foundations["Strong Foundations"]
    CurrentKnowledge --> Learning["Currently Learning"]
    Learning --> NewSkills["New Skills Acquired"]
    
    %% Tracks user's actual knowledge and understanding
    %% Not learning intentions or workflow states
"""
    user_graph_path = workspace_path / 'user_knowledge_graph.mmd'
    user_graph_path.write_text(user_graph_content)
    created_files.append(f"User knowledge: {user_graph_path.relative_to(workspace_path)}")
    
    # Create user.json
    user_data = {
        "name": "",
        "learning_goals": [topic] if topic else [],
        "current_topic": topic or "",
        "knowledge_level": "beginner",
        "learning_style": "visual",
        "progress": {
            "concepts_learned": [],
            "concepts_in_progress": [],
            "last_session": "",
            "total_sessions": 0
        },
        "preferences": {
            "detail_level": "moderate",
            "pace": "adaptive",
            "examples": True
        },
        "workflow_state": {
            "current_phase": "setup" if not topic else "ready_for_research",
            "next_action": "Start research" if topic else "Define learning topic",
            "research_status": "pending" if topic else "not_started",
            "teaching_status": "not_started",
            "last_activity": "workspace_created",
            "session_goals": []
        },
        "learning_journey": {
            "started_at": "",
            "milestones": [],
            "challenges_faced": [],
            "breakthroughs": [],
            "reflection_notes": []
        }
    }
    
    user_json_path = workspace_path / 'user.json'
    user_json_path.write_text(json.dumps(user_data, indent=2))
    created_files.append(f"User profile: {user_json_path.relative_to(workspace_path)}")
    
    return created_files

def setup_workspace(directory_name, topic=None):
    """Set up a complete learning workspace."""
    print(f"Setting up pedagogy workspace: {directory_name}")
    if topic:
        print(f"Learning topic: {topic}")
    
    # Create main directory
    workspace_path = Path(directory_name)
    workspace_path.mkdir(exist_ok=True)
    
    created_files = []
    
    print("  Creating Claude Code configuration...")
    claude_files = create_claude_directory(workspace_path, topic)
    created_files.extend(claude_files)
    
    print("  Creating knowledge tracking files...")
    knowledge_files = create_knowledge_files(workspace_path, topic)
    created_files.extend(knowledge_files)
    
    return workspace_path, created_files

def verify_setup(workspace_path):
    """Verify that all components were created correctly."""
    required_files = [
        '.claude/hooks/capture_events.py',
        '.claude/commands/study::init.md', 
        '.claude/settings.json',
        '.claude/CLAUDE.md',
        'claude_knowledge_graph.mmd',
        'user_knowledge_graph.mmd',
        'user.json',
        'kb'
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
        test_input = '{"session_id":"test-setup"}'
        
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
    parser = argparse.ArgumentParser(
        description='Set up a pedagogy learning workspace with event capture and knowledge tracking'
    )
    parser.add_argument(
        '-d', '--directory', 
        default='learning-workspace',
        help='Directory name for the workspace (default: learning-workspace)'
    )
    parser.add_argument(
        '-t', '--topic', 
        help='Learning topic to focus on (optional)'
    )
    
    args = parser.parse_args()
    
    try:
        # Check if templates directory exists
        if not TEMPLATES_DIR.exists():
            print(f"Error: Templates directory not found at {TEMPLATES_DIR}")
            print("Make sure you're running this script from the long_context_pedagogy directory")
            return 1
        
        # Set up workspace
        workspace_path, created_files = setup_workspace(args.directory, args.topic)
        
        print(f"\n✅ Workspace setup complete: {workspace_path.absolute()}")
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
        
        # Automatically trigger research if topic is provided
        if args.topic:
            print(f"\n🚀 Automatically starting research for '{args.topic}'...")
            print(f"⏱️  IMPORTANT: Comprehensive research takes 20-30 minutes to complete")
            print(f"⏱️  This includes multi-agent analysis and knowledge graph synthesis")
            print(f"⏱️  The process will run until completion - please be patient!")
            print(f"📊 Monitor progress at: http://localhost:3001")
            
            try:
                # Change to workspace directory and run Claude
                study_prompt = f"/study::init {args.topic}"
                claude_cmd = [
                    'claude', 
                    '-p', study_prompt,
                    '--dangerously-skip-permissions'
                ]
                
                print(f"\n  Running: {' '.join(claude_cmd)}")
                print(f"  In directory: {workspace_path.absolute()}")
                print(f"  Starting comprehensive research... (this will take 20-30 minutes)")
                
                # Run without timeout to allow full research completion
                result = subprocess.run(
                    claude_cmd,
                    cwd=workspace_path,
                    capture_output=True,
                    text=True
                    # No timeout - let research complete naturally
                )
                
                if result.returncode == 0:
                    print("  ✅ Comprehensive research completed successfully!")
                    print("  📊 View results at: http://localhost:3001")
                    print("  🎓 Knowledge graphs have been populated with research findings")
                else:
                    print("  ⚠️ Research completed with issues:")
                    if result.stderr:
                        print(f"    {result.stderr}")
                    print("  📊 Check http://localhost:3001 for partial results")
                    print("  You can re-run research manually:")
                    print(f"    cd {args.directory}")
                    print(f"    claude -p '/study::init {args.topic}'")
                    
            except Exception as e:
                print(f"  ⚠️ Could not start research: {e}")
                print("  You can manually start research:")
                print(f"    cd {args.directory}")
                print(f"    claude -p '/study::init {args.topic}'")
                print(f"  Expected duration: 20-30 minutes for comprehensive research")
        
        # Success message
        print(f"\n" + "="*60)
        print(f"🎓 Pedagogy workspace ready!")
        print(f"="*60)
        
        if not args.topic:
            print(f"\nTo start learning:")
            print(f"  cd {args.directory}")
            print(f"  claude -p '/study::init your-topic-here'")
        
        print(f"\nTo monitor progress:")
        print(f"  # Start the pedagogy server first")
        print(f"  npm start")
        print(f"  # Then open: http://localhost:3001")
        
        return 0
        
    except Exception as e:
        print(f"Error setting up workspace: {e}")
        return 1

if __name__ == '__main__':
    exit(main())