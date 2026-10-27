#!/bin/sh
# Builds one FE commit on the FE EC2 and switches Nginx to it. Runs as root through SSM
# AWS-RunShellScript; aws-fe-ssm-command.sh puts RELEASE_SHA, RELEASE_NAME and COUNSEL_ENABLED
# in front of this script. Nginx serves /srv/ubot-fe/current, so switching the link is the
# release. npm runs as ssm-user so package scripts never run as root.
set -eu

root=/srv/ubot-fe
src="$root/src"
keep=5
builder=ssm-user
# Server-only build settings such as VITE_KAKAO_JAVASCRIPT_KEY. The API base and counsel flag
# below are passed as environment variables, which take precedence over this file in Vite.
build_env=/home/ssm-user/ubot-fe/.env.local
release="$root/releases/$RELEASE_NAME"
# NodeSource installs npm under /usr/lib/node_modules without a /usr/bin/npm link on this host.
npm_bin="$(command -v npm || echo /usr/lib/node_modules/npm/bin/npm)"

if [ ! -d "$src/.git" ]; then
  install -d -o "$builder" -g "$builder" "$src"
  runuser -u "$builder" -- git clone --quiet https://github.com/ureca-UBot/UBot-FE.git "$src"
fi

# t3.small has about 1.4GB free; keep the build below that.
runuser -u "$builder" -- env \
  HOME="/home/$builder" \
  NODE_OPTIONS=--max-old-space-size=1024 \
  VITE_API_BASE_URL= \
  VITE_COUNSEL_ENABLED="$COUNSEL_ENABLED" \
  sh -eu -c '
    cd "$1"
    git fetch --quiet origin "$2"
    git checkout --quiet --force --detach "$2"
    git clean --quiet -fdx
    if [ -f "$4" ]; then
      cp "$4" .env.production.local
    else
      echo "Warning: $4 not found; building without its settings (maps need VITE_KAKAO_JAVASCRIPT_KEY)" >&2
    fi
    "$3" ci --no-audit --no-fund --loglevel=error
    # vite.config.ts builds for GitHub Pages (/UBot-FE/) in production; this site is served from /.
    "$3" run build -- --base /
  ' build "$src" "$RELEASE_SHA" "$npm_bin" "$build_env"
test -f "$src/dist/index.html"

rm -rf "$release"
mkdir -p "$release"
cp -a "$src/dist/." "$release/"
chown -R root:root "$release"
chmod -R a+rX "$release"

previous="$(readlink "$root/current" || true)"
switch_to() {
  ln -sfn "$1" "$root/current.next"
  mv -Tf "$root/current.next" "$root/current"
}
switch_to "$release"

# Check through the local Nginx with the real TLS name: the new index and its script are served.
asset="$(grep -o 'src="/assets/[^"]*"' "$release/index.html" | head -n 1 | cut -d '"' -f 2)"
if ! curl -fsS --max-time 5 --resolve u-bot.cloud:443:127.0.0.1 https://u-bot.cloud/ | grep -q "$asset" \
    || ! curl -fsS --max-time 5 -o /dev/null --resolve u-bot.cloud:443:127.0.0.1 "https://u-bot.cloud$asset"; then
  echo "New FE release is not served; switching back to $previous" >&2
  if [ -n "$previous" ]; then
    switch_to "$previous"
  fi
  exit 1
fi
if [ -n "$previous" ] && [ "$previous" != "$release" ]; then
  printf '%s\n' "$previous" > "$root/previous-release"
fi

# Keep the newest releases; never remove the live one or the one before it.
ls -1dt "$root"/releases/*/ | tail -n +$((keep + 1)) | while read -r dir; do
  dir="${dir%/}"
  if [ "$dir" != "$release" ] && [ "$dir" != "$previous" ]; then
    rm -rf "$dir"
  fi
done

echo "FE release live: $RELEASE_NAME (previous: ${previous:-none})"
