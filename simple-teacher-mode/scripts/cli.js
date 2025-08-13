#!/usr/bin/env node
const { setupKB } = require('./setupKB');

async function main() {
  const [,, cmd, pdfPath] = process.argv;
  if (cmd !== 'setup' || !pdfPath) {
    console.error('Usage: node scripts/cli.js setup path/to/book.pdf');
    process.exit(1);
  }
  try {
    const res = await setupKB(pdfPath);
    console.log(`KB generated: ${res.slices} slices`);
  } catch (e) {
    console.error('Setup failed:', e.message || e);
    process.exit(1);
  }
}

main();
