# Add port proxy rules for WiFi IP (192.168.18.12)
# Run this script as Administrator

Write-Host "Adding netsh port proxy rules for WiFi IP..." -ForegroundColor Cyan

$WSL_IP = "172.22.131.85"
$WIFI_IP = "192.168.18.12"

Write-Host "WSL IP: $WSL_IP"
Write-Host "WiFi IP: $WIFI_IP"
Write-Host ""

# Port 3001 (Frontend)
Write-Host "Adding port 3001..." -NoNewline
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=$WIFI_IP connectport=3001 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

# Port 8083 (Backend API)
Write-Host "Adding port 8083..." -NoNewline
netsh interface portproxy add v4tov4 listenport=8083 listenaddress=$WIFI_IP connectport=8083 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

# Port 1884 (MQTT)
Write-Host "Adding port 1884..." -NoNewline
netsh interface portproxy add v4tov4 listenport=1884 listenaddress=$WIFI_IP connectport=1884 connectaddress=$WSL_IP 2>&1 | Out-Null
Write-Host " OK"

Write-Host ""
Write-Host "Verifying port proxy rules..." -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host ""
Write-Host "Port proxy rules configured! You can now access:" -ForegroundColor Green
Write-Host "  http://$WIFI_IP:3001      - Frontend Dashboard (WiFi)"
Write-Host "  http://$WIFI_IP:8083      - Backend API (WiFi)"
Write-Host "  mqtt://$WIFI_IP:1884      - MQTT Broker (WiFi)"
