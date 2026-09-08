#!/usr/bin/env bash
# One-time host firewall hardening for the ISTPM VPS.
#
# The stack publishes frontend (:3003) and backend (:3004) on all interfaces so
# that eiden-nginx (running on the host) can proxy them. Those ports must NOT
# be reachable from the internet — only 22 (SSH), 80 and 443 are public.
#
# Usage (on the VPS, once):
#   sudo ./scripts/harden-firewall.sh
#
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

# Keep SSH reachable first — never lock yourself out.
ufw allow 22/tcp comment 'SSH' >/dev/null
ufw allow 80/tcp comment 'HTTP' >/dev/null
ufw allow 443/tcp comment 'HTTPS' >/dev/null

# Internal-only stack ports (eiden-nginx proxies via localhost).
ufw deny 3003/tcp comment 'school-crm frontend internal' >/dev/null
ufw deny 3004/tcp comment 'school-crm backend internal' >/dev/null

ufw --force enable
echo "✓ Firewall active. Public: 22, 80, 443. Internal-only: 3003, 3004."
ufw status numbered
