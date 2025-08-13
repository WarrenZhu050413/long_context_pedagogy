# Teacher Mode Observability - Complete Testing Guide

## System Overview

The Teacher Mode observability system tracks how Claude builds its understanding through two key files:
- **user.json**: Claude's mental model of the user
- **graph.mmd**: Claude's knowledge graph of the subject matter

## How the System Works

### Data Flow
```
Claude Session → PostToolUse Hook → capture_files.py → HTTP POST → Server → SQLite → UI
```

### Key Components

1. **Claude Hooks** (`.claude/hooks/capture_files.py`)
   - Triggered after every tool use (Read, Write, Edit)
   - Filters for user.json and graph.mmd files
   - Sends content to server with session ID

2. **Server** (`server.js` on port 3001)
   - Receives file snapshots via POST /events
   - Stores in SQLite database with timestamps
   - Provides REST API for retrieval

3. **UI** (`public/teacher.html`)
   - HTMX-based interface (no build required)
   - Auto-refreshes every 5 seconds
   - Displays JSON and Mermaid diagrams

## Testing with Turing PDF

### Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Process the PDF** (already done):
   ```bash
   node scripts/cli.js setup test_pdf/turing.pdf
   ```
   This created:
   - `workspace/slices/` - PDF content sections
   - `workspace/graph.mmd` - Initial graph
   - `workspace/user.json` - Empty user model

3. **Start the server**:
   ```bash
   node server.js
   # Server runs on http://localhost:3001
   ```

4. **Open the UI**:
   Visit http://localhost:3001/teacher.html

### Test Execution

#### Option 1: Automated Test Script
```bash
cd test-workspace
./test_teacher_mode.sh
```

This script will:
- Start a Claude session
- Update user.json with learning profile
- Enhance graph.mmd with Turing concepts
- Display captured results

#### Option 2: Manual Testing

1. **Start a session**:
   ```bash
   cd test-workspace
   SID=$(claude --dangerously-skip-permissions -p "Hi, I'm studying Turing's paper" --output-format json | jq -r '.session_id')
   echo "Session: $SID"
   ```

2. **Read existing files** (triggers capture):
   ```bash
   claude --resume "$SID" -p "Read workspace/user.json and workspace/graph.mmd"
   ```

3. **Update user model**:
   ```bash
   claude --resume "$SID" -p "Update workspace/user.json - I'm studying AI foundations, intermediate level, conceptual learner"
   ```

4. **Enhance knowledge graph**:
   ```bash
   claude --resume "$SID" -p "Add to workspace/graph.mmd: Imitation Game, Turing Test, and Learning Machines concepts"
   ```

### What to Verify

#### In the UI (http://localhost:3001/teacher.html):

1. **Session List (Left)**:
   - Session appears with ID
   - Shows "2 files" when both are tracked
   - Updates timestamp on changes

2. **User Model (Top Panel)**:
   ```json
   {
     "profile": {
       "experience_level": "intermediate",
       "learning_style": "conceptual",
       "interests": ["AI foundations", "Turing test"]
     }
   }
   ```

3. **Knowledge Graph (Bottom Panel)**:
   - Renders as Mermaid diagram
   - Shows concept nodes
   - Displays relationships

#### In Server Logs:
```
POST /events - user.json captured
POST /events - graph.mmd captured
```

#### Via API:
```bash
# List sessions
curl http://localhost:3001/sessions | jq

# Get session details
curl http://localhost:3001/sessions/$SID | jq

# Check file history
curl http://localhost:3001/sessions/$SID/history/user.json | jq
```

## Understanding Hook Behavior

### When Hooks Trigger

1. **Write Tool**: Content captured from tool_input.content
2. **Edit Tool**: File path tracked (content needs separate Read)
3. **Read Tool**: Content captured from tool_output.content

### Session Consistency

- Each Claude session gets unique ID
- All events from same session are grouped
- Multi-turn conversations maintain same session ID

### File Tracking

Only these files are tracked:
- Files ending with `user.json`
- Files ending with `graph.mmd`
- Other files are ignored

## Troubleshooting

### Events Not Captured

1. **Check hook is working**:
   ```bash
   ls -la .claude/hooks/capture_files.py
   # Should be executable
   ```

2. **Verify uv is installed**:
   ```bash
   which uv
   # Should show path to uv
   ```

3. **Test server endpoint**:
   ```bash
   curl -X POST http://localhost:3001/events \
     -H "Content-Type: application/json" \
     -d '{"session_id":"test","file_type":"user.json","content":"{}"}'
   ```

### UI Not Updating

1. **Check browser console** for errors
2. **Verify HTMX loaded** from CDN
3. **Test auto-refresh** (5-second interval)

### Content Not Meaningful

1. **Be specific in prompts** about what to update
2. **Use multi-turn conversations** for complex updates
3. **Ensure workspace files exist** before Claude reads them

## Expected Outcomes

After successful testing, you should see:

1. **Multiple sessions** in the sidebar
2. **Evolving user.json** showing Claude's understanding
3. **Growing graph.mmd** with concept relationships
4. **Timestamp updates** as files change
5. **Version history** for each file

## Advanced Testing

### Test Multiple Agents
Run multiple Claude sessions simultaneously:
```bash
# Terminal 1
claude -p "Work on user understanding"

# Terminal 2  
claude -p "Work on graph enhancement"
```

### Test File Evolution
Track how files change over time:
```bash
# Get history of changes
curl http://localhost:3001/sessions/$SID/history/graph.mmd | jq
```

### Test Error Recovery
- Stop/restart server - sessions persist
- Kill Claude mid-operation - partial captures saved
- Network issues - hooks fail silently

## Summary

This system provides real-time visibility into:
- How Claude understands users (user.json)
- How Claude maps knowledge (graph.mmd)
- How understanding evolves over conversations
- How multiple sessions compare

Perfect for:
- Educational insights
- Debugging Claude's reasoning
- Understanding knowledge construction
- Teaching AI concepts