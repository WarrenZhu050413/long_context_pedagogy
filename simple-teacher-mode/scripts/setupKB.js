const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.join(ROOT, 'workspace');
const SLICES_DIR = path.join(WORKSPACE, 'slices');

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'untitled';
}

function detectHeadings(lines) {
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const isAllCaps = /^[A-Z0-9\s\-]{6,}$/.test(line);
    const isNumbered = /^\d+(\.\d+)*\s+.+/.test(line);
    const isChapter = /^chapter\s+\d+/i.test(line);
    if (isChapter || isNumbered || isAllCaps) {
      headings.push({ index: i, title: line.replace(/\s+/g, ' ').slice(0, 140) });
    }
  }
  if (headings.length === 0 || headings[0].index !== 0) {
    headings.unshift({ index: 0, title: lines[0]?.trim() || 'Introduction' });
  }
  return headings;
}

async function setupKB(pdfPath) {
  const buf = await fs.readFile(pdfPath);
  const data = await pdfParse(buf);
  const text = data.text || '';
  const lines = text.split(/\r?\n/);

  await fs.mkdir(SLICES_DIR, { recursive: true });

  const headings = detectHeadings(lines);
  const slices = [];
  for (let h = 0; h < headings.length; h++) {
    const start = headings[h].index;
    const end = (h + 1 < headings.length) ? headings[h + 1].index : lines.length;
    const title = headings[h].title;
    const body = lines.slice(start + 1, end).join('\n').trim();
    const id = `slice_${h + 1}`;
    const slug = `${(h + 1).toString().padStart(3, '0')}-${slugify(title)}`;
    const filePath = path.join(SLICES_DIR, `${slug}.md`);
    const md = `---\nid: ${id}\ntitle: "${title.replace(/"/g, '\\"')}"\norder: ${h + 1}\n---\n\n${body}\n`;
    await fs.writeFile(filePath, md, 'utf8');
    slices.push({ id, title, slug, path: `/kb/slices/${slug}`, order: h + 1 });
  }

  const toc = {
    title: 'Table of Contents',
    items: slices.map(s => ({ id: s.id, title: s.title, slug: s.slug, order: s.order }))
  };
  await fs.writeFile(path.join(WORKSPACE, 'toc.json'), JSON.stringify(toc, null, 2));

  // Write canonical Mermaid graph (no JSON)
  const mmdLines = ['graph TD'];
  for (const s of slices) {
    const title = String(s.title).replace(/"/g, '\\"');
    mmdLines.push(`${s.id}["${title}"]`);
  }
  for (let i = 0; i < slices.length - 1; i++) {
    mmdLines.push(`${slices[i].id}-->${slices[i + 1].id}`);
  }
  await fs.writeFile(path.join(WORKSPACE, 'graph.mmd'), mmdLines.join('\n') + '\n', 'utf8');

  const session = {
    current_goal: '',
    current_chapter: null,
    focus_node_id: slices[0]?.id || null,
    last_retrieved: [],
    pending_questions: [],
    completed_milestones: [],
    reading_progress: 0
  };
  await fs.writeFile(path.join(WORKSPACE, 'session.json'), JSON.stringify(session, null, 2));

  return { slices: slices.length };
}

module.exports = { setupKB };
