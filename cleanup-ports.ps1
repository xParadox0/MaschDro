# PowerShell script to clean up port conflicts
Write-Host "🔧 Cleaning up port conflicts..." -ForegroundColor Yellow
Write-Host "================================="

# Function to kill process by port
function Kill-ProcessByPort($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Killing process $($process.ProcessName) (PID: $processId) using port $port" -ForegroundColor Red
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

# Stop Docker containers first
Write-Host "`n🛑 Stopping Docker containers..."
docker-compose -f docker-compose.full.yml down --remove-orphans 2>$null
docker-compose -f docker-compose.minimal.yml down --remove-orphans 2>$null
docker-compose down --remove-orphans 2>$null

# Kill processes using our ports
Write-Host "`n🔪 Killing processes on conflicting ports..."
Kill-ProcessByPort 8080
Kill-ProcessByPort 3000
Kill-ProcessByPort 5173

# Kill specific process types
Write-Host "`n🔪 Killing specific process types..."
Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait and verify
Start-Sleep -Seconds 3

Write-Host "`n🔍 Checking port availability..."
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if (-not $port8080) { Write-Host "✅ Port 8080 is free" -ForegroundColor Green }
else { Write-Host "❌ Port 8080 still in use" -ForegroundColor Red }

if (-not $port3000) { Write-Host "✅ Port 3000 is free" -ForegroundColor Green }
else { Write-Host "❌ Port 3000 still in use" -ForegroundColor Red }

if (-not $port5173) { Write-Host "✅ Port 5173 is free" -ForegroundColor Green }
else { Write-Host "❌ Port 5173 still in use" -ForegroundColor Red }

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green