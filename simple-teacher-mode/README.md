# Simple Teacher Mode KB Demo

A minimal, self-contained example inspired by a larger system. It provides:

- PDF -> KB slices CLI that creates `workspace/` (`slices/`, `toc.json`, `graph.mmd`, `session.json`).
- Express server exposing read-only KB endpoints and a simple Mermaid graph UI (via CDN).
- Pre-prompt assembler that writes `workspace/injected/system.md` from Teacher + Study rules and session state.

- User profile support via `workspace/user.json` (served at `/kb/user.json`).
- Optional multi-agent topology via `workspace/agent_graph.mmd` rendered in UI.
- Workspace protocol prompt that teaches Claude Code how to use/update the KB (via JSON ops), included in `system.md`.

No cards. Purely file-based KB + simple UI.

## Quickstart

1) Install deps

```bash
npm install
```

2) Generate KB from a PDF

```bash
npm run setup -- path/to/book.pdf
```

This creates:
- `workspace/slices/*.md`
- `workspace/toc.json`
- `workspace/graph.mmd`
- `workspace/session.json`

3) Start server

```bash
npm run dev
```

Open http://localhost:3000 to view Mermaid graph and browse slices.

4) Generate pre-prompt

```bash
npm run preprompt
```

Writes `workspace/injected/system.md` combining `prompts/teacher_mode.md`, `prompts/study_mode_rules.md`, and a compact session snapshot.

## Endpoints

- `GET /kb/toc.json`
- `GET /kb/graph.mmd`
- `GET /kb/session.json`
- `GET /kb/user.json`
- `GET /kb/agent_graph.mmd`
- `GET /kb/system.md` (assembled system prompt for prehooks)
- `GET /kb/slices` -> list of slice slugs
- `GET /kb/slices/:slug` -> markdown content

All paths are read-only with basic path safety.

## Dev Container (VS Code / Codespaces)

Steps:
1) Prereqs: Install Docker. If using VS Code, install the "Dev Containers" extension. Or use GitHub Codespaces.
2) Open this folder in a container:
   - VS Code: Command Palette → "Dev Containers: Reopen in Container"
   - Codespaces: Create a new Codespace for this repo/folder
   The container runs `npm install` automatically (see `.devcontainer/devcontainer.json`).
3) Generate the KB from a PDF:
   ```bash
   npm run setup -- /workspaces/<repo-name>/path/to/book.pdf
   ```
4) Start the server:
   ```bash
   npm run dev
   ```
   - Port 3000 is forwarded; open it in your browser.
5) Optional: assemble the pre-prompt file:
   ```bash
   npm run preprompt
   ```

## Notes

- Mermaid and UI assets are loaded via CDN to keep this tiny.
- Use this as a reference example; adapt as needed.
- Excludes any cards feature by design.

### Workspace protocol and prehooks

- The preprompt generator now includes `prompts/workspace_protocol.md`, which defines how Claude Code should:
  - Retrieve slices via `/workspace/*` paths and cite sources as repo paths.
  - Propose structured JSON operations (not direct writes) for `session.json` and `user.json`.
- The assembled file is at `workspace/injected/system.md` and can be injected by prehooks to each agent instance.

### User and agent graph

- `workspace/user.json` stores user profile/preferences (template pre-created). Fill it in to personalize guidance.
- `workspace/agent_graph.mmd` (optional) describes running agents; the UI renders it above the content graph.
