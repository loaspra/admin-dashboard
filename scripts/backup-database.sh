#!/bin/bash

# Database backup script for Supabase - 'real' schema only
# Usage: ./scripts/backup-database.sh

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your Supabase DATABASE_URL and try again"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/real_schema_backup_${TIMESTAMP}.sql"

echo "🚀 Starting database backup..."
echo "📋 Target schema: real"
echo "📄 Backup file: ${BACKUP_FILE}"
echo

# Perform the backup using pg_dump
# --schema=real: Only backup the 'real' schema
# --no-owner: Don't include ownership information
# --no-privileges: Don't include privilege information
# --clean: Include DROP commands before CREATE
# --if-exists: Use IF EXISTS with DROP commands
pg_dump "$DATABASE_URL" \
    --schema=real \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo
    echo "✅ Backup completed successfully!"
    echo "📄 Backup saved to: ${BACKUP_FILE}"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo
    echo "🔒 To restore this backup later, run:"
    echo "   psql \"\$DATABASE_URL\" -f \"${BACKUP_FILE}\""
    echo
else
    echo
    echo "❌ Backup failed!"
    echo "Please check your DATABASE_URL and network connection"
    exit 1
fi 