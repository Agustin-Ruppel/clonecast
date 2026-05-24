# 05 — Seguridad y manejo de secrets

> Clonecast maneja credenciales API que cuestan dinero real y assets biométricos (tu cara, tu voz). Esta página es lectura obligatoria antes del primer commit.

## TL;DR — Las 5 reglas de oro

1. **Nunca commitees `.env`**. Está en `.gitignore`, no lo saques.
2. **Permisos 600** en `.env` (`chmod 600 .env`).
3. **Pre-commit hook con gitleaks** activado (`npm run setup` lo instala).
4. **Assets sensibles fuera del repo** — `assets/character/`, `assets/voice/` están gitignored.
5. **Validá con `npm run doctor`** antes de cualquier `git push`.

## Tres niveles de protección

### Nivel 1 — Default (todos los usuarios)

- `.env` con permisos `600`.
- `.gitignore` agresivo (ver el archivo, está comentado).
- Pre-commit hook con [gitleaks](https://github.com/gitleaks/gitleaks):

  ```bash
  # se instala automático con npm run setup
  brew install gitleaks   # mac
  # o
  go install github.com/gitleaks/gitleaks/v8@latest
  ```

  Si intentás commitear una API key conocida (regex de Anthropic, OpenAI, HeyGen, ElevenLabs, Higgsfield, fal.ai), el commit se bloquea.

- `.env.example` con placeholders, **nunca** valores reales.
- Logs enmascarados: `sk-ant-...XYZ` en vez de la key completa.

### Nivel 2 — Usuarios avanzados (backend de secrets)

Si no querés guardar secrets en `.env`, cambialo:

```bash
# En .env, dejá sólo:
SECRETS_BACKEND=1password
```

**Backends soportados:**

| Backend | Setup |
|---|---|
| `env` (default) | Lee de `.env` |
| `1password` | Requiere [1Password CLI](https://developer.1password.com/docs/cli/) (`op` en PATH) |
| `keychain` | macOS Keychain via `security` command |
| `doppler` | [Doppler CLI](https://docs.doppler.com/docs/cli) configurado |

Para `1password`, tus keys viven como items en 1P y se leen on-demand:

```bash
# Configurá uno por servicio:
op item create --category=password \
  --title="Clonecast / Anthropic" \
  --vault="Personal" \
  password=sk-ant-xxx
```

Clonecast resuelve `ANTHROPIC_API_KEY` con `op read "op://Personal/Clonecast Anthropic/password"`.

### Nivel 3 — Assets sensibles (Character Pack)

Tus fotos son **PII biométrica**. No están en git, pero si las querés backupear seguras:

```bash
npx clonecast encrypt-assets
```

Genera `assets.encrypted.tar.age` usando [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age). Esa carpeta sí podés subirla a cloud, dropbox, etc — está cifrada con tu key personal.

Para restaurar en otra máquina:

```bash
npx clonecast decrypt-assets assets.encrypted.tar.age
```

## Validaciones automáticas

`npx clonecast doctor` corre:

- [ ] `.env` existe y tiene permisos `600`
- [ ] `.env` NO está tracked por git
- [ ] Todas las API keys requeridas para tu modo están presentes
- [ ] Todas las API keys responden con un ping (200 OK)
- [ ] No hay secrets hardcodeados en `src/` (escaneo con gitleaks)
- [ ] `assets/character/` NO está tracked
- [ ] Pre-commit hook está activo
- [ ] No hay secrets en commits de los últimos 30 días

Si algo rojo, **arreglálo antes de pushear**.

## Si se te leakeó una key

1. **Revocala inmediatamente** en el dashboard del servicio.
2. Generá una nueva, ponéla en `.env`.
3. Si la key entró en un commit: el repo está comprometido para siempre (rotar la key alcanza, pero la historia de git la conserva).
4. Si era el repo público: considerá [git filter-repo](https://github.com/newren/git-filter-repo) + force push **y** revocá igual.

## Política recomendada para teams

- **Una key por developer**, no compartir. Las APIs de Anthropic/OpenAI/HeyGen permiten múltiples keys por cuenta.
- **Usar workspace/org separado** para cada cliente si producís contenido para varios.
- **Doppler o Vault** para producción/CI, no `.env`.

## Reportar vulnerabilidades

Si encontrás un agujero en Clonecast, escribí a [security@clonecast.dev](mailto:security@clonecast.dev) (TODO: setup) en vez de abrir issue público.
