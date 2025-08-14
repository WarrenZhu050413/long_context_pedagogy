Initialize learning mode for the current repository.

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
   - Calculate knowledge delta (concepts to learn next)

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
