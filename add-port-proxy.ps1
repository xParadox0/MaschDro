# Add port proxy rules for WSL Docker to Windows Network
# Run this script as Administrator

Write-Host "Adding netsh port proxy rules..." -ForegroundColor Cyan

$WSL_IP = "172.22.131.85"
$WINDOWS_IP = "192.168.18.176"

Write-Host "WSL IP: $WSL_IP"
Write-Host "Windows IP: $WINDOWS_IP"
Write-Host ""

# Port 3001 (Frontend)
Write-Host "Adding port 3001..." -NoNewline
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=$WINDOWS_IP connectport=3001 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

# Port 8083 (Backend API)
Write-Host "Adding port 8083..." -NoNewline
netsh interface portproxy add v4tov4 listenport=8083 listenaddress=$WINDOWS_IP connectport=8083 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

# Port 1884 (MQTT)
Write-Host "Adding port 1884..." -NoNewline
netsh interface portproxy add v4tov4 listenport=1884 listenaddress=$WINDOWS_IP connectport=1884 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

Write-Host ""
Write-Host "Verifying port proxy rules..." -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host ""
Write-Host "Port proxy rules configured! You can now access:" -ForegroundColor Green
Write-Host "  http://$WINDOWS_IP:3001     - Frontend Dashboard"
Write-Host "  http://$WINDOWS_IP:8083     - Backend API"
Write-Host "  mqtt://$WINDOWS_IP:1884     - MQTT Broker"
