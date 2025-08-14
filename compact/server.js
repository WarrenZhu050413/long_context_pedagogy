const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;
const db = new Database(':memory:');

// Initialize database
db.exec(`
  CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    prompt TEXT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )
`);

app.use(express.json());
app.use(express.static('public'));

// Capture events
app.post('/events', (req, res) => {
  const { session_id, user_prompt } = req.body;
  if (session_id && user_prompt) {
    const stmt = db.prepare('INSERT INTO events (session_id, prompt) VALUES (?, ?)');
    stmt.run(session_id, user_prompt);
  }
  res.json({ success: true });
});

// Get recent conversations
app.get('/events', (req, res) => {
  const stmt = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT 10');
  res.json(stmt.all());
});

// Simple knowledge graph
app.get('/graph', (req, res) => {
  const events = db.prepare('SELECT prompt FROM events ORDER BY timestamp DESC LIMIT 5').all();
  const topics = events.map(e => e.prompt.split(' ').slice(0, 3).join(' ')).slice(0, 3);
  
  let graph = 'graph TD\n';
  topics.forEach((topic, i) => {
    graph += `  A${i}["${topic}"]\n`;
    if (i > 0) graph += `  A${i-1} --> A${i}\n`;
  });
  
  res.type('text/plain').send(graph);
});

app.listen(PORT, () => console.log(`Compact server: http://localhost:${PORT}`));