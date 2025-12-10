#!/usr/bin/env sh
set -e

append_env() {
  key="$1"
  val="$2"
  if [ -n "$val" ]; then
    esc=$(printf %s "$val" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g")
    printf "window.__ENV__=Object.assign(window.__ENV__||{}, { %s: '%s' });\n" "$key" "$esc" >> /usr/share/nginx/html/env.js
  fi
}

# Always initialize env.js so the <script> doesn’t 404
printf "window.__ENV__=window.__ENV__||{};\n" > /usr/share/nginx/html/env.js

# Runtime-provided vars
append_env "API_BASE_URL" "${API_BASE_URL}"
append_env "AUTHORITY_URL" "${AUTHORITY_URL}"
append_env "AUTHORITY_CLIENT" "${AUTHORITY_CLIENT}"
append_env "AUTHORITY_REDIRECT_URI" "${AUTHORITY_REDIRECT_URI}"
append_env "AUTHORITY_SILENT_URI" "${AUTHORITY_SILENT_URI}"

# Start nginx in the foreground
exec nginx -g "daemon off;"