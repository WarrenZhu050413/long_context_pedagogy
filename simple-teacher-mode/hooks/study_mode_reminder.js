// Study-mode reminder prehook for Claude Code instances
// Generates a header + reminders + includes the assembled system prompt.
// Usage: const { generatePrehook } = require('./study_mode_reminder');
//        const text = await generatePrehook({ agentId: 'teacher-1', role: 'teacher' });

const fs = require('fs/promises');
const path = require('path');

async function readSystemMd(projectRoot) {
  const systemPath = path.join(projectRoot, 'workspace', 'injected', 'system.md');
  try {
    return await fs.readFile(systemPath, 'utf8');
  } catch {
    return '# system.md not found\nRun `npm run preprompt` to assemble Teacher/Study/Protocol prompt.';
  }
}

async function generatePrehook({ agentId = 'teacher-1', role = 'teacher', workspaceRoot = '/workspace', projectRoot = path.resolve(__dirname, '..') } = {}) {
  const system = await readSystemMd(projectRoot);
  const header = [
    '[AGENT_HEADER]',
    `agent_id: ${agentId}   role: ${role}`,
    `study_mode: ACTIVE      workspace_root: ${workspaceRoot}`,
    '',
    '[PREHOOK REMINDER]',
    '- You are in TEACHER MODE + STUDY MODE (strict rules).',
    '- Use only /workspace files; cite repo paths; no cards.',
    '- Canonical graph is Mermaid at /workspace/graph.mmd.',
    '- Propose updates via OPS JSON (SESSION_OP, USER_OP, GRAPH_OP); never write files directly.',
    '',
    '<<system.md>>',
    ''
  ].join('\n');
  return `${header}\n${system}`;
}

module.exports = { generatePrehook };
