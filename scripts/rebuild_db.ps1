<#
Rebuild and seed the database for PakuruSYS-Fleetman.

Usage (PowerShell):
  # Option A: full connection string
  $conn = "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
  .\scripts\rebuild_db.ps1 -ConnectionString $conn

  # Option B: env vars
  $env:PGHOST='HOST'; $env:PGPORT='5432'; $env:PGUSER='USER'; $env:PGPASSWORD='PASSWORD'; $env:PGDATABASE='DATABASE'
  .\scripts\rebuild_db.ps1

This script will attempt to run pg_dump (if available) to create a backup in ./scripts/backups
and then run the reset and seed SQL files in the repository.

WARNING: This will DROP and RECREATE tables in the public schema. Do not run on production.
#>

param(
    [string]$ConnectionString = $null,
    [switch]$NoBackup
)

function Write-ErrAndExit($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

# Resolve psql and pg_dump
$psql = Get-Command psql -ErrorAction SilentlyContinue
$pgdump = Get-Command pg_dump -ErrorAction SilentlyContinue

if (-not $psql) {
    Write-ErrAndExit "psql not found in PATH. Install PostgreSQL client tools or run these scripts from an environment with psql available (or use Supabase SQL editor)."
}

# Build psql args
if ($ConnectionString) {
    $psqlArgsPrefix = "`"$ConnectionString`""
} else {
    # Use env vars
    if (-not $env:PGHOST -or -not $env:PGUSER -or -not $env:PGDATABASE) {
        Write-Host "Using env vars requires PGHOST, PGUSER and PGDATABASE to be set. Example:" -ForegroundColor Yellow
        Write-Host "$env:PGPASSWORD = 'YourPassword'; psql -h host -p port -U user -d db -f .\scripts\000_reset_and_rebuild.sql" -ForegroundColor Yellow
        Write-ErrAndExit "Missing required env vars."
    }
    $host = $env:PGHOST
    $port = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
    $user = $env:PGUSER
    $db = $env:PGDATABASE
    $psqlArgsPrefix = "-h $host -p $port -U $user -d $db"
}

if (-not $NoBackup) {
    if ($pgdump) {
        $backupDir = Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -ChildPath 'backups'
        if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $backupFile = Join-Path $backupDir "pakuru_backup_$timestamp.sql"
        Write-Host "Running pg_dump -> $backupFile"
        if ($ConnectionString) {
            & $pgdump $ConnectionString -f $backupFile
        } else {
            & $pgdump -h $host -p $port -U $user -d $db -f $backupFile
        }
        if ($LASTEXITCODE -ne 0) { Write-Host "pg_dump failed (exit $LASTEXITCODE). Continuing at your risk..." -ForegroundColor Yellow }
    } else {
        Write-Host "pg_dump not available; skipping backup. Set -NoBackup to skip this message." -ForegroundColor Yellow
    }
}

# Run reset script
$resetSql = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '000_reset_and_rebuild.sql'
if (-not (Test-Path $resetSql)) { Write-ErrAndExit "Can't find $resetSql" }

Write-Host "Running reset script: $resetSql"
if ($ConnectionString) {
    & $psql $ConnectionString -f $resetSql
} else {
    & $psql $psqlArgsPrefix -f $resetSql
}
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "psql returned $LASTEXITCODE running reset script." }

# Run any other schema/migration scripts as needed. We will run the seed next.
$seedSql = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '003_seed_sample_data.sql'
if (-not (Test-Path $seedSql)) { Write-ErrAndExit "Can't find $seedSql" }

Write-Host "Running seed script: $seedSql"
if ($ConnectionString) {
    & $psql $ConnectionString -f $seedSql
} else {
    & $psql $psqlArgsPrefix -f $seedSql
}
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "psql returned $LASTEXITCODE running seed script." }

Write-Host "Database rebuild and seed finished. Verify and run application." -ForegroundColor Green
