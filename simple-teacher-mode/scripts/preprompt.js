const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROMPTS = path.join(ROOT, 'prompts');
const WORKSPACE = path.join(ROOT, 'workspace');
const OUT_DIR = path.join(WORKSPACE, 'injected');
const OUT_FILE = path.join(OUT_DIR, 'system.md');

async function readText(p) {
  try { return await fsp.readFile(p, 'utf8'); }
  catch { return ''; }
}

function compactSession(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    current_goal: s.current_goal || '',
    current_chapter: s.current_chapter || null,
    focus_node_id: s.focus_node_id || null,
    reading_progress: s.reading_progress ?? 0,
    last_retrieved: Array.isArray(s.last_retrieved) ? s.last_retrieved.slice(0, 5) : [],
    pending_questions: Array.isArray(s.pending_questions) ? s.pending_questions.slice(0, 10) : [],
    completed_milestones: Array.isArray(s.completed_milestones) ? s.completed_milestones.slice(0, 10) : []
  };
}

function compactUser(u) {
  if (!u || typeof u !== 'object') return null;
  const interests = Array.isArray(u.profile?.interests) ? u.profile.interests.slice(0, 8) : [];
  return {
    name: u.name || '',
    profile: {
      experience_level: u.profile?.experience_level || 'unknown',
      learning_style: u.profile?.learning_style || 'unknown',
      interests
    },
    preferences: u.preferences || {}
  };
}

async function main() {
  const teacher = (await readText(path.join(PROMPTS, 'teacher_mode.md'))).trim();
  const study = (await readText(path.join(PROMPTS, 'study_mode_rules.md'))).trim();
  const protocol = (await readText(path.join(PROMPTS, 'workspace_protocol.md'))).trim();

  let kbStateBlock = '';
  try {
    const session = JSON.parse(await fsp.readFile(path.join(WORKSPACE, 'session.json'), 'utf8'));
    let user = null;
    try { user = JSON.parse(await fsp.readFile(path.join(WORKSPACE, 'user.json'), 'utf8')); } catch {}
    const kbState = { user: compactUser(user), session: compactSession(session) };
    kbStateBlock = ['','KB_STATE:','```json', JSON.stringify(kbState, null, 2), '```'].join('\n');
  } catch {}

  const out = [teacher, '', study, '', protocol, kbStateBlock].filter(Boolean).join('\n');
  await fsp.mkdir(OUT_DIR, { recursive: true });
  await fsp.writeFile(OUT_FILE, out, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch(e => {
  console.error('preprompt failed:', e);
  process.exit(1);
});
