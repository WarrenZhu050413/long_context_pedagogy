const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const WORKSPACE = path.join(ROOT, 'workspace');
const SLICES_DIR = path.join(WORKSPACE, 'slices');
const DB_PATH = path.join(ROOT, 'db', 'sessions.db');

// Initialize SQLite database
const initDatabase = () => {
  // Ensure db directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_updated INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS file_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      file_type TEXT NOT NULL,
      content TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_session_id ON file_snapshots(session_id);
    CREATE INDEX IF NOT EXISTS idx_file_type ON file_snapshots(file_type);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON file_snapshots(timestamp);
  `);

  return db;
};

const db = initDatabase();

app.use(express.json());
app.use('/', express.static(path.join(ROOT, 'public')));

function safeJoin(root, p) {
  const full = path.resolve(root, p);
  if (!full.startsWith(root)) throw new Error('Invalid path');
  return full;
}

app.get('/kb/toc.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'toc.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});


app.get('/kb/graph.mmd', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'graph.mmd');
    res.type('text/plain; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/session.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'session.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/kb/user.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'user.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});


app.get('/kb/agent_graph.mmd', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'agent_graph.mmd');
    res.type('text/plain; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/system.md', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'injected/system.md');
    res.type('text/markdown; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/slices', async (req, res) => {
  try {
    const dir = safeJoin(WORKSPACE, 'slices');
    const files = (await fsp.readdir(dir)).filter(f => f.endsWith('.md'));
    const items = files.map(f => ({ slug: f.replace(/\.md$/, ''), path: `/kb/slices/${f.replace(/\.md$/, '')}` }));
    res.json({ items });
  } catch (e) {
    res.json({ items: [] });
  }
});

app.get('/kb/slices/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!/^[a-z0-9\-_.]+$/.test(slug)) return res.status(400).send('bad slug');
    const file = safeJoin(SLICES_DIR, `${slug}.md`);
    res.type('text/markdown; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

// ============ OBSERVABILITY ENDPOINTS ============

// POST /events - Receive file update events from Claude hooks
app.post('/events', (req, res) => {
  try {
    const { session_id, file_type, content } = req.body;
    
    if (!session_id || !file_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Only track user.json and graph.mmd
    if (file_type !== 'user.json' && file_type !== 'graph.mmd') {
      return res.status(200).json({ message: 'File type not tracked' });
    }

    // Ensure session exists
    const sessionStmt = db.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)');
    sessionStmt.run(session_id);

    // Update last_updated timestamp
    const updateStmt = db.prepare("UPDATE sessions SET last_updated = strftime('%s', 'now') WHERE id = ?");
    updateStmt.run(session_id);

    // Store file snapshot
    const snapshotStmt = db.prepare(`
      INSERT INTO file_snapshots (session_id, file_type, content)
      VALUES (?, ?, ?)
    `);
    const result = snapshotStmt.run(session_id, file_type, content);

    res.json({ 
      success: true, 
      snapshot_id: result.lastInsertRowid,
      session_id,
      file_type
    });
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions - List all sessions
app.get('/sessions', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        s.id,
        s.created_at,
        s.last_updated,
        COUNT(DISTINCT f.file_type) as file_count
      FROM sessions s
      LEFT JOIN file_snapshots f ON s.id = f.session_id
      GROUP BY s.id
      ORDER BY s.last_updated DESC
    `);
    const sessions = stmt.all();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id - Get session details with latest files
app.get('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get session info
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    const session = sessionStmt.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get latest snapshot for each file type
    const filesStmt = db.prepare(`
      SELECT file_type, content, timestamp
      FROM file_snapshots
      WHERE session_id = ? AND id IN (
        SELECT MAX(id) FROM file_snapshots
        WHERE session_id = ?
        GROUP BY file_type
      )
    `);
    const files = filesStmt.all(id, id);

    // Format response
    const result = {
      ...session,
      files: {}
    };

    files.forEach(file => {
      result.files[file.file_type] = {
        content: file.content,
        timestamp: file.timestamp
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id/history/:fileType - Get file change history
app.get('/sessions/:id/history/:fileType', (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const stmt = db.prepare(`
      SELECT content, timestamp
      FROM file_snapshots
      WHERE session_id = ? AND file_type = ?
      ORDER BY timestamp DESC
    `);
    const history = stmt.all(id, fileType);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Teacher Mode server listening on http://localhost:${PORT}`);
  console.log(`Observability endpoint ready at POST http://localhost:${PORT}/events`);
});
