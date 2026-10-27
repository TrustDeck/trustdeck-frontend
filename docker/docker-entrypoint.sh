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
if [ -n "${AUTHORITY_POST_LOGOUT_REDIRECT_URI:-}" ]; then
  write_env_value AUTHORITY_POST_LOGOUT_REDIRECT_URI "$AUTHORITY_POST_LOGOUT_REDIRECT_URI"
fi
if [ -n "${ACCOUNT_CONSOLE_URL:-}" ]; then
  write_env_value ACCOUNT_CONSOLE_URL "$ACCOUNT_CONSOLE_URL"
fi

cat >> /usr/share/nginx/html/env.js <<'EOF_ENV'
};
EOF_ENV

# Reduces a URL to its origin (scheme, host, and port). Relative URLs yield nothing,
# since they point to the frontend's own origin, which 'self' already covers.
origin_of() {
  printf '%s' "$1" | sed -n -E 's#^([A-Za-z][A-Za-z0-9+.-]*://[^/?#]+).*$#\1#p'
}

# The Content-Security-Policy only allows scripts from the frontend itself and network
# requests to the frontend, the backend API, and Keycloak. It can be replaced entirely
# by setting CONTENT_SECURITY_POLICY.
if [ -z "${CONTENT_SECURITY_POLICY:-}" ]; then
  api_origin="$(origin_of "$API_BASE_URL")"
  authority_origin="$(origin_of "$AUTHORITY_URL")"
  CONTENT_SECURITY_POLICY="default-src 'self'; \
script-src 'self'; \
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src 'self' data: https://fonts.gstatic.com; \
img-src 'self' data: blob:; \
connect-src 'self' ${api_origin} ${authority_origin}; \
frame-src 'self' ${authority_origin}; \
frame-ancestors 'self'; \
form-action 'self'; \
base-uri 'self'; \
object-src 'none'"
fi

# The policy must not break out of the quoted nginx directive.
case "$CONTENT_SECURITY_POLICY" in
  *\"*)
    echo "CONTENT_SECURITY_POLICY must not contain double quotes." >&2
    exit 1
    ;;
esac

printf 'add_header Content-Security-Policy "%s" always;\n' "$(printf '%s' "$CONTENT_SECURITY_POLICY" | tr -s ' ')" \
  > /etc/nginx/security-headers.inc
printf 'add_header X-Content-Type-Options "nosniff" always;\n' >> /etc/nginx/security-headers.inc

exec nginx -g "daemon off;"
