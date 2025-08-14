# Learning Mode - Event Capture System

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
