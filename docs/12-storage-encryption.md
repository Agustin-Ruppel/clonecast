# 12 — Storage & encryption

## Where state lives

All Clonecast state lives locally in `~/.clonecast/workspace-<id>.db` — one SQLite file per workspace. There is no remote sync, no telemetry. If you delete that file, the workspace is gone.

A first-run migration moves any legacy `state/*.json` files into the active workspace DB once, then leaves the JSON alone (so you can keep a copy if you want).

## What's stored where

| Data | Storage | Encrypted? |
|------|---------|-----------|
| Provider API keys (HeyGen, ElevenLabs, Cartesia, Runway, R2…) | `secrets` table | Yes — AES-256-GCM |
| Profile (name, default voice, default avatar) | `profile` table | No |
| Brand pack (colors, fonts) | `brand` table | No |
| Character meta + reference images | `character` table | No (image bytes on disk) |
| Presets, settings, jobs, avatar cache | dedicated tables | No |

Secrets are the only thing encrypted at rest. Everything else is plaintext SQLite — readable with any SQLite client if you have filesystem access. Treat your home directory accordingly.

## How the encryption works

- Algorithm: **AES-256-GCM**, 12-byte random nonce, 16-byte tag, no AAD.
- Per-secret payload format: `nonce || ciphertext || tag` base64-encoded.
- Master key: **256-bit random**, generated on first run.
- Master key storage: **OS keychain** via `keytar`
  - macOS → Keychain
  - Linux → libsecret (GNOME Keyring / KWallet)
  - Windows → DPAPI / Credential Manager
- Fallback: if no keychain is available, the master key is written to `~/.clonecast/keychain-fallback.json` with mode `0600`. A warning is logged. This is fine for headless servers you control; less fine on shared boxes.

## Resetting / regenerating the master key

There is no built-in "rotate" command yet — rotation would require re-encrypting every secret. Workaround:

1. Stop the dev server.
2. Open Settings → re-enter and save each API key. They'll be re-encrypted with the current master key.

To **fully reset** (lose all secrets):

```bash
# remove keychain entry
keytar-cli delete-password clonecast master-key   # or use Keychain Access / seahorse
# remove fallback if it exists
rm -f ~/.clonecast/keychain-fallback.json
```

Next start will generate a new master key. Existing encrypted secrets become unreadable — you'll need to re-enter them in `/setup`.
