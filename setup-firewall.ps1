# Run as Administrator
Write-Host "Opening firewall ports for Boarding House App..." -ForegroundColor Yellow

netsh advfirewall firewall delete rule name="BH-Frontend-5173" 2>$null
netsh advfirewall firewall delete rule name="BH-Backend-8080" 2>$null

netsh advfirewall firewall add rule name="BH-Frontend-5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="BH-Backend-8080" dir=in action=allow protocol=TCP localport=8080

Write-Host ""
Write-Host "Done! Firewall rules added." -ForegroundColor Green
Write-Host ""

# Show LAN IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" }).IPAddress
Write-Host "Your LAN IP: $ip" -ForegroundColor Cyan
Write-Host "Mobile access: http://$ip`:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
