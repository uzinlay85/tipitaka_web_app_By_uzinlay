#!/bin/bash
# တိပိဋက sync.db backup — app run နေစဉ်မှာပါ safe (sqlite3 .backup)
# VPS: /opt/tipitaka/backup_db.sh  (repo ထဲမှာ versioned)
set -euo pipefail

APP_DIR="${TIPITAKA_APP_DIR:-/opt/tipitaka}"
BACKUP_DIR="${TIPITAKA_BACKUP_DIR:-/var/backups/tipitaka}"
DB_FILE="$APP_DIR/sync.db"

# DB မရှိသေးရင် (fresh VPS / sync မသုံးရသေး) တိတ်တိတ်ဆိတ်ဆိတ် ထွက်
[ -f "$DB_FILE" ] || exit 0

# Optional config file (chmod 600 recommended if containing tokens)
if [ -f "$APP_DIR/.backup_env" ]; then
    # shellcheck disable=SC1090
    . "$APP_DIR/.backup_env"
elif [ -f "/etc/default/tipitaka_backup" ]; then
    # shellcheck disable=SC1091
    . "/etc/default/tipitaka_backup"
fi

OFFSITE_DEST="${TIPITAKA_OFFSITE_DEST:-}"
OFFSITE_RETENTION_DAYS="${TIPITAKA_OFFSITE_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/sync_${STAMP}.db"

sqlite3 "$DB_FILE" ".backup '$OUT'"

# ၇ ရက်ထက် ကြာသော local backup ဟောင်းများ ဖျက် (နေရာသက်သာရန်)
find "$BACKUP_DIR" -name 'sync_*.db' -type f -mtime +7 -delete

echo "backup OK: $OUT"

# Off-site cloud backup (rclone သုံး၍ Google Drive / Cloudflare R2 / S3 စသည်သို့ ကူးယူခြင်း)
if [ -n "$OFFSITE_DEST" ]; then
    if command -v rclone >/dev/null 2>&1; then
        rclone copy "$OUT" "$OFFSITE_DEST"
        if [ "$OFFSITE_RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
            rclone delete --min-age "${OFFSITE_RETENTION_DAYS}d" "$OFFSITE_DEST" 2>/dev/null || true
        fi
        echo "offsite sync OK: $OFFSITE_DEST"
    else
        echo "WARNING: TIPITAKA_OFFSITE_DEST is set but 'rclone' is not installed. Skipping off-site sync." >&2
    fi
else
    echo "(no TIPITAKA_OFFSITE_DEST configured; off-site sync skipped)"
fi
