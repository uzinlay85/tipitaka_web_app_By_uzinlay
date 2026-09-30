#!/bin/bash
# တိပိဋက sync.db backup — app run နေစဉ်မှာပါ safe (sqlite3 .backup)
# VPS: /opt/tipitaka/backup_db.sh  (repo ထဲမှာ versioned)
set -euo pipefail

APP_DIR="${TIPITAKA_APP_DIR:-/opt/tipitaka}"
BACKUP_DIR="${TIPITAKA_BACKUP_DIR:-/var/backups/tipitaka}"
DB_FILE="$APP_DIR/sync.db"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/sync_${STAMP}.db"

sqlite3 "$DB_FILE" ".backup '$OUT'"

# ၇ ရက်ထက် ကြာသော backup ဟောင်းများ ဖျက် (နေရာသက်သာရန်)
find "$BACKUP_DIR" -name 'sync_*.db' -type f -mtime +7 -delete

echo "backup OK: $OUT"
