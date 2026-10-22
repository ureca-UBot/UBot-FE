#!/usr/bin/env bash
set -euo pipefail

# Prints AWS-RunShellScript parameters (JSON) that build and release one FE commit on the FE EC2:
# the release values followed by aws-fe-release.sh.
if [ "$#" -ne 2 ]; then
  echo 'usage: aws-fe-ssm-command.sh <commit-sha> <counsel-enabled true|false>' >&2
  exit 2
fi

commit_sha="$1"
counsel_enabled="$2"
# The values are pasted into shell text between single quotes, so allow only plain characters.
if ! [[ "$commit_sha" =~ ^[a-f0-9]{40}$ ]]; then
  echo 'Invalid commit SHA' >&2
  exit 2
fi
if ! [[ "$counsel_enabled" =~ ^(true|false)$ ]]; then
  echo 'Counsel flag must be true or false' >&2
  exit 2
fi

release_name="${commit_sha:0:7}-$(date -u +%Y%m%d%H%M%S)"
script="$(dirname "${BASH_SOURCE[0]}")/aws-fe-release.sh"
header=(
  "RELEASE_SHA='$commit_sha'"
  "RELEASE_NAME='$release_name'"
  "COUNSEL_ENABLED='$counsel_enabled'"
)

jq -n --rawfile body "$script" \
  '{commands: ($ARGS.positional + ($body | rtrimstr("\n") | split("\n"))), executionTimeout: ["900"]}' \
  --args "${header[@]}"
