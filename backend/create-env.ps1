# Script to create .env file for backend
# Run this script from the backend directory: .\create-env.ps1

$envContent = @"
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345
DB_NAME=icas_cmu_hub

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=icascmu@gmail.com
SMTP_PASS=fovygwijlrddube
SMTP_FROM=iCAS CMU HUB <icascmu@gmail.com>

# LINE Bot Configuration (Optional - for LINE notifications)
# Get these from LINE Developers Console: https://developers.line.biz/
# Leave empty if you don't need LINE Bot functionality
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
"@

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists at: $envPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Cancelled. Existing .env file preserved." -ForegroundColor Red
        exit 0
    }
}

try {
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host "✅ .env file created successfully at: $envPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 File contents:" -ForegroundColor Cyan
    Get-Content $envPath
} catch {
    Write-Host "Error creating .env file: $_" -ForegroundColor Red
    exit 1
}

