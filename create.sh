#!/usr/bin/env sh
set -e

append_env() {
  key="$1"
  val="$2"
  if [ -n "$val" ]; then
    esc=$(printf %s "$val" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g")
    printf "window.__ENV__=Object.assign(window.__ENV__||{}, { %s: '%s' });\n" "$key" "$esc" >> env.js
  fi
}

# Always initialize env.js so the <script> doesn’t 404
printf "window.__ENV__=window.__ENV__||{};\n" > env.js

# Runtime-provided vars
append_env "API_BASE_URL" "http://localhost:8081/api"
append_env "AUTHORITY_URL" "https://ttp-gw.charite.de/realms/ttp"
append_env "AUTHORITY_CLIENT" "frontend"
append_env "AUTHORITY_REDIRECT_URI" "https://localhost:5173/"