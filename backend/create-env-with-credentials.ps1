# Script to create .env file with provided credentials
# Run this script from the backend directory

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists at: $envPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Cancelled. Existing .env file preserved." -ForegroundColor Red
        exit 0
    }
}

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

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada
"@

try {
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host "✅ .env file created successfully at: $envPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Configured credentials:" -ForegroundColor Cyan
    Write-Host "  ✅ Database configuration" -ForegroundColor Green
    Write-Host "  ✅ Gmail SMTP (App Password: fovygwijlrddube)" -ForegroundColor Green
    Write-Host "  ✅ LINE Bot credentials" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Please restart your server: npm run dev" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error creating .env file: $_" -ForegroundColor Red
    exit 1
}

