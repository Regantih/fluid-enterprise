#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Fluid Enterprise — GitHub Push Script
# Run this once locally after cloning/copying the project folder.
#
# Prerequisites:
#   1. GitHub CLI installed: https://cli.github.com
#      OR: a GitHub Personal Access Token with 'repo' scope
#   2. Git installed
#
# Usage:
#   chmod +x push-to-github.sh
#   ./push-to-github.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

REPO_NAME="fluid-enterprise"
GITHUB_USER="regantih"
DESCRIPTION="AI-native enterprise control plane — capability-based agent orchestration for ERP transformation"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Fluid Enterprise → GitHub Push Script        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Method 1: GitHub CLI (preferred) ──────────────────────────────────────────
if command -v gh &> /dev/null; then
  echo "✓ GitHub CLI detected"
  echo ""

  # Check auth
  if ! gh auth status &> /dev/null; then
    echo "→ Not logged in. Running: gh auth login"
    gh auth login
  fi

  echo "→ Creating repo: github.com/${GITHUB_USER}/${REPO_NAME}"
  gh repo create "${REPO_NAME}" \
    --public \
    --description "${DESCRIPTION}" \
    --homepage "https://github.com/${GITHUB_USER}/${REPO_NAME}" \
    2>/dev/null || echo "  (repo may already exist — continuing)"

  echo "→ Setting remote origin..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

  echo "→ Pushing to main..."
  git push -u origin main

  echo ""
  echo "✅ Done! View your repo:"
  echo "   https://github.com/${GITHUB_USER}/${REPO_NAME}"

# ── Method 2: curl + Personal Access Token ────────────────────────────────────
else
  echo "GitHub CLI not found. Falling back to Personal Access Token method."
  echo ""
  echo "Generate a token at: https://github.com/settings/tokens/new"
  echo "Required scopes: repo (full control)"
  echo ""
  read -sp "Paste your GitHub Personal Access Token: " GH_TOKEN
  echo ""

  if [ -z "$GH_TOKEN" ]; then
    echo "✗ No token provided. Exiting."
    exit 1
  fi

  echo "→ Creating repo via GitHub API..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token ${GH_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"${REPO_NAME}\",\"description\":\"${DESCRIPTION}\",\"private\":false,\"auto_init\":false}")

  if [ "$RESPONSE" = "201" ]; then
    echo "✓ Repo created successfully"
  elif [ "$RESPONSE" = "422" ]; then
    echo "  Repo already exists — continuing"
  else
    echo "✗ API returned HTTP $RESPONSE — check your token and try again"
    exit 1
  fi

  echo "→ Setting remote with token auth..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://${GH_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

  echo "→ Pushing to main..."
  git push -u origin main

  # Clean token from remote URL for security
  git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

  echo ""
  echo "✅ Done! View your repo:"
  echo "   https://github.com/${GITHUB_USER}/${REPO_NAME}"
fi

echo ""
echo "Next steps:"
echo "  1. Add screenshots:  docs/screenshots/ (see README for guidance)"
echo "  2. Star your own repo and share the link"
echo "  3. Run locally:  npm install --legacy-peer-deps && npm run dev"
echo ""
