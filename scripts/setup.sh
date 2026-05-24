#!/usr/bin/env bash
# scripts/setup.sh — bootstrap básico (node deps + python venv + git hooks)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing Node dependencies"
npm install

echo "==> Setting up Python venv"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -e .

echo "==> Configuring .env"
if [ ! -f ".env" ]; then
  cp .env.example .env
  chmod 600 .env
  echo "    Created .env from template. Edit it with your API keys."
else
  echo "    .env already exists — leaving it alone."
  chmod 600 .env
fi

echo "==> Installing gitleaks pre-commit hook (if gitleaks installed)"
if command -v gitleaks >/dev/null 2>&1; then
  mkdir -p .git/hooks
  cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
gitleaks protect --staged --redact --no-banner || {
  echo "✗ gitleaks detected secrets in staged changes. Commit aborted."
  echo "  Remove the secret, then re-stage and commit."
  exit 1
}
EOF
  chmod +x .git/hooks/pre-commit
  echo "    Hook installed."
else
  echo "    gitleaks not installed — skipping. Install with: brew install gitleaks"
fi

echo ""
echo "==> Done. Next steps:"
echo "    1. Edit .env with your API keys"
echo "    2. Run: npm run doctor"
echo "    3. Run: npm run setup    (interactive wizard)"
