#!/usr/bin/env python3
"""
Learning context injection hook for UserPromptSubmit.
Reads knowledge state and injects personalized context before user prompts.
Encourages proactive knowledge graph updates during conversations.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

def read_json_safely(filepath):
    """Safely read JSON file, return empty dict if not found or invalid."""
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return {}

def parse_mermaid_graph(filepath):
    """Extract nodes and relationships from Mermaid graph file."""
    concepts = []
    relationships = []
    
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                lines = f.readlines()
                
            for line in lines:
                line = line.strip()
                # Extract node definitions (various Mermaid formats)
                if '[' in line and ']' in line:
                    start = line.find('[')
                    end = line.find(']')
                    concept = line[start+1:end].strip('"').strip("'")
                    if concept and concept not in ['graph TD', 'graph LR']:
                        concepts.append(concept)
                
                # Extract relationships (arrows)
                if '-->' in line or '---' in line:
                    relationships.append(line)
                    
    except IOError:
        pass
    
    return concepts, relationships

def analyze_knowledge_gaps(claude_concepts, user_concepts):
    """Identify concepts Claude knows that user doesn't."""
    claude_set = set(claude_concepts)
    user_set = set(user_concepts)
    gaps = list(claude_set - user_set)
    
    # Prioritize fundamental concepts (shorter names often = more fundamental)
    gaps.sort(key=lambda x: (len(x), x))
    
    return gaps[:5]  # Top 5 gaps

def extract_recent_topics(user_data):
    """Extract recent learning topics from user profile."""
    recent = []
    
    # Check various possible fields
    if 'recent_topics' in user_data:
        recent.extend(user_data['recent_topics'])
    if 'current_topic' in user_data and user_data['current_topic']:
        recent.append(user_data['current_topic'])
    if 'learning_goals' in user_data:
        recent.extend(user_data['learning_goals'][:3])
    
    return list(dict.fromkeys(recent))[:5]  # Unique, max 5

def get_learning_style(user_data):
    """Determine user's learning style from profile."""
    style = user_data.get('learning_style', '')
    if not style:
        level = user_data.get('knowledge_level', 'beginner')
        preferences = user_data.get('preferences', {})
        
        if level == 'beginner':
            style = 'step-by-step with examples'
        elif level == 'intermediate':
            style = 'conceptual with practice'
        elif level == 'advanced':
            style = 'theoretical with deep dives'
        else:
            style = 'adaptive'
            
        # Check for specific preferences
        if preferences.get('visual_learning'):
            style += ', visual diagrams'
        if preferences.get('hands_on'):
            style += ', practical exercises'
            
    return style

def build_context_injection(original_prompt):
    """Build the context injection for the prompt."""
    workspace_dir = Path.cwd()
    
    # Read knowledge files
    user_json_path = workspace_dir / 'user.json'
    claude_graph_path = workspace_dir / 'claude_knowledge_graph.mmd'
    user_graph_path = workspace_dir / 'user_knowledge_graph.mmd'
    
    user_data = read_json_safely(user_json_path)
    claude_concepts, _ = parse_mermaid_graph(claude_graph_path)
    user_concepts, _ = parse_mermaid_graph(user_graph_path)
    
    # Analyze knowledge state
    knowledge_gaps = analyze_knowledge_gaps(claude_concepts, user_concepts)
    recent_topics = extract_recent_topics(user_data)
    learning_style = get_learning_style(user_data)
    
    # Build context sections
    context_parts = []
    
    # Add learning context if we have meaningful data
    if user_concepts or knowledge_gaps or recent_topics:
        context_parts.append("[LEARNING CONTEXT]")
        
        if user_concepts:
            context_parts.append(f"User knows: {', '.join(user_concepts[:10])}")
        
        if knowledge_gaps:
            context_parts.append(f"Focus areas: {', '.join(knowledge_gaps)}")
        
        if recent_topics:
            context_parts.append(f"Recent topics: {', '.join(recent_topics)}")
        
        if learning_style:
            context_parts.append(f"Learning style: {learning_style}")
        
        # Add user's strengths if available
        strengths = user_data.get('strengths', [])
        if strengths:
            context_parts.append(f"Strengths: {', '.join(strengths[:3])}")
    
    # Add the original prompt
    context_parts.append("\n[USER PROMPT]")
    context_parts.append(original_prompt)
    
    # Add instructions for Claude
    context_parts.append("\n[PEDAGOGICAL INSTRUCTIONS]")
    context_parts.append("- Be Socratic: Ask questions to check understanding")
    context_parts.append("- CRITICAL: After explaining any concept, ask 'Can you explain back what we just discussed?'")
    context_parts.append("- When user successfully explains a concept → UPDATE user_knowledge_graph.mmd")
    context_parts.append("- CRITICAL: user_knowledge_graph.mmd must be a subset of claude_knowledge_graph.mmd")
    context_parts.append("- Only add concepts that exist in your claude_knowledge_graph.mmd")
    context_parts.append("- Track concept mastery: introduced → explained_back → mastered")
    context_parts.append("- Suggest next learning steps based on interests")
    context_parts.append("- Update knowledge graphs as new concepts are learned")
    context_parts.append("- Update user.json with progress and preferences discovered")
    context_parts.append("- Add key insights to ./kb repository")
    context_parts.append("- The more the user shares, the better you can help")
    context_parts.append("- Remember: User explanation = Knowledge graph update")
    
    return '\n'.join(context_parts)

def main():
    """Main hook function."""
    try:
        # Read the original prompt from stdin
        stdin_data = sys.stdin.read()
        
        # Try to parse as JSON first (standard hook format)
        original_prompt = None
        try:
            data = json.loads(stdin_data)
            original_prompt = data.get('prompt', stdin_data)
        except json.JSONDecodeError:
            # If not JSON, treat as plain text
            original_prompt = stdin_data.strip()
        
        if not original_prompt:
            # No prompt to enhance, pass through
            print(stdin_data)
            return 0
        
        # Build and output the enhanced prompt
        enhanced_prompt = build_context_injection(original_prompt)
        print(enhanced_prompt)
        
        return 0
        
    except Exception as e:
        # On any error, pass through the original input
        print(stdin_data if 'stdin_data' in locals() else '')
        # Log error to stderr for debugging
        print(f"Context injection error: {e}", file=sys.stderr)
        return 0

if __name__ == '__main__':
    sys.exit(main())