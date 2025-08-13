#!/usr/bin/env node
const path = require('path');
const fs = require('fs/promises');
const { generatePrehook } = require('../hooks/study_mode_reminder');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--agent' || a === '-a') args.agentId = argv[++i];
    else if (a === '--role' || a === '-r') args.role = argv[++i];
    else if (a === '--out' || a === '-o') args.out = argv[++i];
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv);
  const agentId = args.agentId || 'teacher-1';
  const role = args.role || 'teacher';
  const projectRoot = path.resolve(__dirname, '..');
  const text = await generatePrehook({ agentId, role, projectRoot });
  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(projectRoot, args.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, text, 'utf8');
    console.log('Wrote prehook to', outPath);
  } else {
    process.stdout.write(text);
  }
})().catch(e => {
  console.error('gen_prehook failed:', e);
  process.exit(1);
});
