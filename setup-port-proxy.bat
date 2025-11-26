@echo off
REM Port Proxy Setup for WSL Docker to Windows Network

REM Get WSL IP address
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i

echo Adding port proxy rules...
echo From Windows IP (192.168.18.176) to WSL IP (%WSL_IP%)
echo.

REM Add port proxy rules
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=192.168.18.176 connectport=3001 connectaddress=%WSL_IP%
echo Port 3001: OK

netsh interface portproxy add v4tov4 listenport=8083 listenaddress=192.168.18.176 connectport=8083 connectaddress=%WSL_IP%
echo Port 8083: OK

netsh interface portproxy add v4tov4 listenport=1884 listenaddress=192.168.18.176 connectport=1884 connectaddress=%WSL_IP%
echo Port 1884: OK

echo.
echo Port proxy rules configured!
echo Verify with: netsh interface portproxy show all
echo.
pause
