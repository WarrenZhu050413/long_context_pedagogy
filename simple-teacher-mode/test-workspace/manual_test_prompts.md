# Manual Testing Prompts for Teacher Mode

Use these prompts sequentially with Claude to test the observability system.

## Initial Setup
First, ensure the server is running:
```bash
cd /Users/wz/Desktop/zPersonalProjects/long_context_pedagogy/simple-teacher-mode
node server.js
```

Open the UI at: http://localhost:3001/teacher.html

## Test Sequence

### 1. Start a session and read existing files
```bash
cd test-workspace
claude --dangerously-skip-permissions -p "Please read the workspace/user.json and workspace/graph.mmd files to understand the current state."
```

### 2. Update user.json with your understanding
```bash
claude --dangerously-skip-permissions -p "Please update workspace/user.json to show that I'm studying Turing's 1950 paper on machine intelligence. Set my experience_level to 'intermediate', learning_style to 'conceptual', and add 'Turing test', 'machine intelligence', and 'AI foundations' to my interests."
```

### 3. Enhance the knowledge graph
```bash
claude --dangerously-skip-permissions -p "Please enhance workspace/graph.mmd by adding concept nodes for: 'Imitation Game', 'Turing Test', 'Digital Computers', 'Learning Machines', and the nine objections Turing addresses. Show how these connect to the existing slice nodes."
```

## What to Look For in the UI

After each command, check the Teacher UI (http://localhost:3001/teacher.html):

1. **Session List (Left Sidebar)**:
   - New session should appear with timestamp
   - File count badge should show "2 files" when both are updated

2. **User Model Panel (Top)**:
   - Should show JSON with your learning profile
   - Look for experience_level, learning_style, and interests

3. **Knowledge Graph Panel (Bottom)**:
   - Should render as a Mermaid diagram
   - Look for concept nodes and relationships
   - Verify slice connections

## Testing the Hook Capture

To verify hooks are working, you can also check:

1. **Server logs**: Should show POST /events requests
2. **Database**: Check `db/sessions.db` has entries
3. **API**: Test endpoints directly:
   ```bash
   # List all sessions
   curl http://localhost:3001/sessions | jq
   
   # Get specific session (replace SESSION_ID)
   curl http://localhost:3001/sessions/SESSION_ID | jq
   ```

## Expected Results

### user.json should contain:
```json
{
  "name": "",
  "profile": {
    "experience_level": "intermediate",
    "learning_style": "conceptual",
    "interests": ["Turing test", "machine intelligence", "AI foundations"]
  },
  "preferences": {
    "concise": true,
    "citations": "paths"
  }
}
```

### graph.mmd should include:
- Original slice nodes (slice_1, slice_2, slice_3)
- Concept nodes (Imitation_Game, Turing_Test, etc.)
- Relationship edges showing connections
- Proper Mermaid syntax for rendering