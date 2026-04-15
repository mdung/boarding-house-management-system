# ============================================================
# Boarding House Management - System Tray App
# ============================================================
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$PROJECT  = "D:\management\boarding-house-management-system"
$BACKEND  = "$PROJECT\backend"
$FRONTEND = "$PROJECT\frontend"
$SCRIPT   = "$PROJECT\start-app.ps1"

# ── Helper: kill port ────────────────────────────────────────
function Kill-Port($port) {
    $pids = netstat -ano | Select-String ":$port " |
            ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}

function Is-Running($port) {
    $r = netstat -ano | Select-String ":$port "
    return ($null -ne $r)
}

function Start-Backend {
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND`" && mvn spring-boot:run" -WindowStyle Minimized
}

function Start-Frontend {
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$FRONTEND`" && npm run dev" -WindowStyle Minimized
}

function Restart-All {
    Kill-Port 8080
    Kill-Port 5173
    Start-Sleep 2
    Start-Backend
    Start-Sleep 5
    Start-Frontend
}

function Get-Status {
    $be = if (Is-Running 8080) { "✅ Running" } else { "❌ Stopped" }
    $fe = if (Is-Running 5173) { "✅ Running" } else { "❌ Stopped" }
    return "Backend: $be`nFrontend: $fe"
}

# ── Build tray icon ──────────────────────────────────────────
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName)

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon    = $icon
$tray.Text    = "Boarding House App"
$tray.Visible = $true

# Context menu
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$itemStatus.Text    = "Checking status..."
$itemStatus.Enabled = $false
$menu.Items.Add($itemStatus) | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

$itemRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$itemRestart.Text = "🔄 Restart All"
$itemRestart.Add_Click({ Restart-All; $tray.ShowBalloonTip(3000, "Boarding House", "Restarting app...", [System.Windows.Forms.ToolTipIcon]::Info) })
$menu.Items.Add($itemRestart) | Out-Null

$itemOpen = New-Object System.Windows.Forms.ToolStripMenuItem
$itemOpen.Text = "🌐 Open in Browser"
$itemOpen.Add_Click({ Start-Process "http://localhost:5173" })
$menu.Items.Add($itemOpen) | Out-Null

$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

$itemStop = New-Object System.Windows.Forms.ToolStripMenuItem
$itemStop.Text = "⏹ Stop All"
$itemStop.Add_Click({
    Kill-Port 8080; Kill-Port 5173
    $tray.ShowBalloonTip(2000, "Boarding House", "App stopped.", [System.Windows.Forms.ToolTipIcon]::Info)
})
$menu.Items.Add($itemStop) | Out-Null

$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem
$itemExit.Text = "❌ Exit Tray"
$itemExit.Add_Click({ $tray.Visible = $false; [System.Windows.Forms.Application]::Exit() })
$menu.Items.Add($itemExit) | Out-Null

$tray.ContextMenuStrip = $menu

# Double-click → open browser
$tray.Add_DoubleClick({ Start-Process "http://localhost:5173" })

# Timer to update status every 10s
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.Add_Tick({
    $status = Get-Status
    $itemStatus.Text = $status -replace "`n", " | "
    $be = Is-Running 8080
    $fe = Is-Running 5173
    if ($be -and $fe) { $tray.Text = "Boarding House ✅" }
    elseif (!$be -and !$fe) { $tray.Text = "Boarding House ❌ Stopped" }
    else { $tray.Text = "Boarding House ⚠️ Partial" }
})
$timer.Start()

# Start app on launch
Restart-All
$tray.ShowBalloonTip(4000, "Boarding House App", "Starting up...`nFrontend: http://localhost:5173", [System.Windows.Forms.ToolTipIcon]::Info)

# Run message loop
[System.Windows.Forms.Application]::Run()
