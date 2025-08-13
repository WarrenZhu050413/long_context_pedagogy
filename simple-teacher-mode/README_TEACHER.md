# Claude Teacher Mode - Observability System

A simplified observability system for tracking Claude's mental model (`user.json`) and knowledge graph (`graph.mmd`) during sessions.

## Features

- **Minimal Hook System**: Single Python hook that captures file changes
- **SQLite Storage**: Lightweight database for session tracking
- **HTMX UI**: Simple, server-driven interface with no build process
- **Real-time Updates**: Auto-refresh to see Claude's evolving understanding
- **Mermaid Graphs**: Visual representation of knowledge graphs

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
node server.js
# Server runs on http://localhost:3001
```

### 3. Open the Teacher Interface

Visit: http://localhost:3001/teacher.html

### 4. Test with Claude

In a test directory with `.claude` hooks configured:

```bash
cd test-workspace
claude --dangerously-skip-permissions -p "Create a user.json file representing your understanding of me, and a graph.mmd file showing our discussion topics"
```

## How It Works

1. **Hooks**: The `.claude/hooks/capture_files.py` script monitors when Claude writes or edits `user.json` or `graph.mmd` files
2. **Events**: File changes are sent to the server via POST `/events`
3. **Storage**: Server stores snapshots in SQLite database
4. **Display**: HTMX UI polls for updates and displays:
   - User model (user.json) with JSON syntax highlighting
   - Knowledge graph (graph.mmd) rendered as Mermaid diagram

## API Endpoints

- `POST /events` - Receive file update events
- `GET /sessions` - List all sessions
- `GET /sessions/:id` - Get session details with latest files
- `GET /sessions/:id/history/:fileType` - Get file change history

## File Structure

```
simple-teacher-mode/
├── server.js              # Express server with observability endpoints
├── db/
│   └── sessions.db       # SQLite database (auto-created)
├── public/
│   └── teacher.html      # HTMX-based UI
├── .claude/
│   ├── hooks/
│   │   └── capture_files.py  # Minimal file capture hook
│   └── settings.json         # Hook configuration
└── test-workspace/          # Test directory for Claude
```

## Configuration

The system only tracks two files:
- `user.json` - Claude's mental model of the user
- `graph.mmd` - Knowledge graph in Mermaid format

To use in your own project, copy the `.claude` directory and ensure the server is running.

## Testing

1. Start the server
2. Open teacher.html in browser
3. In test-workspace, run Claude with a prompt that creates user.json and graph.mmd
4. Watch the UI update with Claude's outputs

## Notes

- Server runs on port 3001 by default (set PORT env var to change)
- Database is created automatically in `db/sessions.db`
- No build process required - uses CDN for HTMX and Mermaid
- Hooks fail silently to not disrupt Claude's operation