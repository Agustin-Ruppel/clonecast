# 11 — Workspaces

A **workspace** is an isolated container for everything Clonecast stores locally: secrets, profile, brand, character, presets, settings, jobs and avatar cache. Each workspace is a separate SQLite database file. Nothing leaks across workspaces.

## When to use multiple workspaces

- **Different creators** — one workspace per personal brand, each with its own HeyGen avatar, voice and visual identity.
- **Client work** — a fresh workspace per client, so secrets, brand pack and jobs stay isolated and easy to hand off.
- **Personas / experiments** — try a different tone, model mix or preset library without polluting your main setup.

## Where files live

Everything lives under `~/.clonecast/`:

```
~/.clonecast/
├── workspace-default.db        # the default workspace
├── workspace-client-a.db       # extra workspaces you create
├── workspace-personal.db
└── keychain-fallback.json      # only used if OS keychain is unavailable
```

The master encryption key lives in your OS keychain (macOS Keychain / libsecret on Linux / DPAPI on Windows). Workspaces share the same key — losing it makes every workspace's secrets unreadable.

## Creating and switching

Use the **Workspace switcher** in the top nav:

1. Click `Workspace: default ▾`.
2. Pick an existing workspace to switch (the page reloads).
3. Or type a new id (lowercase, digits and dashes only, max 40 chars) and click **Crear** — the new workspace gets its own DB and becomes active.

You can also set the env var manually when running the dev server:

```bash
CLONECAST_WORKSPACE=client-a npm run dev
```

The active workspace is persisted as a cookie (`cc_ws`) for 30 days.

## Backups

A workspace is just a single `.db` file. To back one up, copy `~/.clonecast/workspace-<id>.db` somewhere safe. To restore, drop it back into `~/.clonecast/` — it will appear in the switcher on next reload.

To delete a workspace, close the dev server and remove its `.db` file. (No UI for deletion yet — intentional friction.)
