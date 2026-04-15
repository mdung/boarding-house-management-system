# ============================================================
# Boarding House Management - Start/Restart Script
# ============================================================
$PROJECT = "D:\management\boarding-house-management-system"
$BACKEND  = "$PROJECT\backend"
$FRONTEND = "$PROJECT\frontend"

function Stop-App {
    Write-Host "Stopping existing processes..." -ForegroundColor Yellow
    # Kill processes on port 8080 (backend)
    $be = netstat -ano | Select-String ":8080 " | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
    foreach ($pid in $be) {
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
    # Kill processes on port 5173 (frontend)
    $fe = netstat -ano | Select-String ":5173 " | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
    foreach ($pid in $fe) {
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "Stopped." -ForegroundColor Green
}

function Start-Backend {
    Write-Host "Starting Backend (Spring Boot)..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c cd /d `"$BACKEND`" && mvn spring-boot:run" `
        -WindowStyle Minimized
}

function Start-Frontend {
    Write-Host "Starting Frontend (Vite)..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c cd /d `"$FRONTEND`" && npm run dev" `
        -WindowStyle Minimized
}

# Main
Stop-App
Start-Backend
Start-Sleep -Seconds 5
Start-Frontend

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  App is starting up!" -ForegroundColor Green
Write-Host "  Backend : http://localhost:8080" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
