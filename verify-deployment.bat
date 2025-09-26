@echo off
echo ✅ Sengon Monitoring System - Deployment Verification
echo ===================================================

echo.
echo 📊 Container Status:
docker-compose -f docker-compose.minimal.yml ps

echo.
echo 🔍 Service Health Checks:
echo.

echo Backend API Health:
curl -s http://localhost:8080/health
echo.

echo.
echo Frontend Access:
curl -s -I http://localhost:3000 | findstr "HTTP\|200"

echo.
echo Database Connection:
docker exec sengon_timescaledb pg_isready -U sengon_user -d sengon_monitoring

echo.
echo MQTT Broker:
docker exec sengon_mqtt mosquitto_pub -h localhost -t test/topic -m "test" -d
echo (MQTT test message sent)

echo.
echo Redis:
docker exec sengon_redis redis-cli ping

echo.
echo 🌍 Access URLs:
echo   - Frontend Dashboard: http://localhost:3000
echo   - Backend API: http://localhost:8080
echo   - API Health: http://localhost:8080/health
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo.

echo 📋 API Endpoints Test:
echo.
echo GET /api/v1/devices:
curl -s http://localhost:8080/api/v1/devices

echo.
echo.
echo GET /api/v1/alerts:
curl -s http://localhost:8080/api/v1/alerts

echo.
echo.
echo ✅ Deployment verification complete!
echo   Open http://localhost:3000 in your browser to access the dashboard.
echo.
pause