#!/usr/bin/env sh
set -eu

require_env() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

js_escape() {
  # Escape values for safe inclusion in a JavaScript double-quoted string.
  printf '%s' "$1" | sed \
    -e 's/\\/\\\\/g' \
    -e 's/"/\\"/g' \
    -e 's/\r/\\r/g'
}

write_env_value() {
  key="$1"
  value="$2"
  escaped="$(js_escape "$value")"
  printf '  %s: "%s",\n' "$key" "$escaped" >> /usr/share/nginx/html/env.js
}

require_env API_BASE_URL
require_env AUTHORITY_URL
require_env AUTHORITY_CLIENT
require_env AUTHORITY_REDIRECT_URI
require_env AUTHORITY_SILENT_URI

cat > /usr/share/nginx/html/env.js <<'EOF_ENV'
window.__ENV__ = {
EOF_ENV

write_env_value API_BASE_URL "$API_BASE_URL"
write_env_value AUTHORITY_URL "$AUTHORITY_URL"
write_env_value AUTHORITY_CLIENT "$AUTHORITY_CLIENT"
write_env_value AUTHORITY_REDIRECT_URI "$AUTHORITY_REDIRECT_URI"
write_env_value AUTHORITY_SILENT_URI "$AUTHORITY_SILENT_URI"
if [ -n "${ACCOUNT_CONSOLE_URL:-}" ]; then
  write_env_value ACCOUNT_CONSOLE_URL "$ACCOUNT_CONSOLE_URL"
fi

cat >> /usr/share/nginx/html/env.js <<'EOF_ENV'
};
EOF_ENV

exec nginx -g "daemon off;"
