# Script to update .env file with correct credentials
# Run this script from the backend directory: .\update-env.ps1

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found. Please create it first using create-env.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Updating .env file..." -ForegroundColor Cyan

# Read current .env file
$content = Get-Content $envPath -Raw

# Update SMTP_PASS (remove spaces from App Password)
$content = $content -replace 'SMTP_PASS=.*', 'SMTP_PASS=fovygwijlrddube'

# Update or add LINE credentials
if ($content -match 'LINE_CHANNEL_ACCESS_TOKEN=') {
    $content = $content -replace 'LINE_CHANNEL_ACCESS_TOKEN=.*', 'LINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU='
} else {
    $content += "`n# LINE Bot Configuration`nLINE_CHANNEL_ACCESS_TOKEN=IgtnK/JcjYMpIzZQSHqbB0kQdLPWdjWj9TEJ050ayFYRDxSL1M6LuLJ28fdry6oABDt9WOeN/VtRYie5dSEgQE0/RQOKTF8X6b9JA0YUwvH/NuiTEu/55r97F7uRWK/gc/bP2dLk4ZUXs1aShLDD6AdB04t89/1O/w1cDnyilFU=`n"
}

if ($content -match 'LINE_CHANNEL_SECRET=') {
    $content = $content -replace 'LINE_CHANNEL_SECRET=.*', 'LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada'
} else {
    $content += "LINE_CHANNEL_SECRET=3110ecd8c8e5394724fab5333dc95ada`n"
}

# Write updated content
try {
    $content | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Updated credentials:" -ForegroundColor Cyan
    Write-Host "  - SMTP_PASS: fovygwijlrddube (spaces removed)" -ForegroundColor Yellow
    Write-Host "  - LINE_CHANNEL_ACCESS_TOKEN: Updated" -ForegroundColor Yellow
    Write-Host "  - LINE_CHANNEL_SECRET: Updated" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔄 Please restart your server for changes to take effect" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error updating .env file: $_" -ForegroundColor Red
    exit 1
}

