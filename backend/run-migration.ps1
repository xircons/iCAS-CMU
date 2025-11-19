# PowerShell script to add regenerate_on_checkin column
# Usage: .\run-migration.ps1

Write-Host "🔄 Adding regenerate_on_checkin column to check_in_sessions..." -ForegroundColor Cyan

$envFile = ".\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found. Please create backend/.env first." -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$dbName = $env:DB_NAME
$dbHost = $env:DB_HOST
$dbUser = $env:DB_USER
$dbPass = $env:DB_PASSWORD

if (-not $dbName -or -not $dbHost -or -not $dbUser) {
    Write-Host "❌ Database credentials not found in .env file." -ForegroundColor Red
    exit 1
}

Write-Host "📊 Connecting to database: $dbName on $dbHost" -ForegroundColor Yellow

# Check if mysql command is available
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Host "❌ mysql command not found. Please install MySQL client or run the SQL manually:" -ForegroundColor Red
    Write-Host ""
    Write-Host "ALTER TABLE check_in_sessions" -ForegroundColor Yellow
    Write-Host "ADD COLUMN regenerate_on_checkin tinyint(1) NOT NULL DEFAULT 1" -ForegroundColor Yellow
    Write-Host "AFTER is_active;" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run the script: npm run db:add-regenerate-column" -ForegroundColor Cyan
    exit 1
}

# Run SQL
$sql = @"
ALTER TABLE check_in_sessions 
ADD COLUMN IF NOT EXISTS regenerate_on_checkin tinyint(1) NOT NULL DEFAULT 1 
AFTER is_active;
"@

$sql | & mysql -h $dbHost -u $dbUser -p"$dbPass" $dbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Column regenerate_on_checkin added successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error adding column. Please check the error above." -ForegroundColor Red
    Write-Host ""
    Write-Host "You can also run the SQL manually:" -ForegroundColor Yellow
    Write-Host $sql -ForegroundColor Cyan
}

