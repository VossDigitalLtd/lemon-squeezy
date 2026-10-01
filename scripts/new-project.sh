#!/usr/bin/env bash
# Bootstrap a new project from this boilerplate.
#
# Usage:
#   ./scripts/new-project.sh <project-name> <new-github-repo-url>
#
# Example:
#   ./scripts/new-project.sh my-app git@github.com:VossDigitalLtd/my-app.git
#
# What it does:
#   1. Clones the boilerplate into a new local directory
#   2. Replaces origin with the new project's repo
#   3. Keeps the boilerplate as a remote named "boilerplate"
#   4. Pushes the initial commit to the new repo
#
# To pull boilerplate updates into the project later:
#   git fetch boilerplate
#   git merge boilerplate/main

set -e

BOILERPLATE_REMOTE="git@github.com-gv-dig-sat-mb:VossDigitalLtd/web-app-boilerplate.git"
PROJECT_NAME=$1
NEW_ORIGIN=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$NEW_ORIGIN" ]; then
  echo "Usage: $0 <project-name> <new-github-repo-url>"
  exit 1
fi

if [ -d "$PROJECT_NAME" ]; then
  echo "Error: directory '$PROJECT_NAME' already exists"
  exit 1
fi

echo "Creating project '$PROJECT_NAME'..."
git clone "$BOILERPLATE_REMOTE" "$PROJECT_NAME"
cd "$PROJECT_NAME"

git remote remove origin
git remote add origin "$NEW_ORIGIN"
git remote add boilerplate "$BOILERPLATE_REMOTE"

git push -u origin main

echo ""
echo "Done. Project '$PROJECT_NAME' is ready."
echo ""
echo "Remotes:"
git remote -v
echo ""
echo "To pull boilerplate updates in the future:"
echo "  git fetch boilerplate"
echo "  git merge boilerplate/main"
