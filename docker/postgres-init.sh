#!/bin/bash
set -e

echo "Creating test database if it doesn't exist..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE scoreboard_test_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'scoreboard_test_db')\gexec
EOSQL

echo "Test database ready!"

