@echo off
title Radar Launcher
color 0A
cd /d "%~dp0"
echo ========================================
echo   RADAR LAUNCHER
echo ========================================
echo.
if not exist "Driver\MemoryDriver.sys" (
    echo [ОШИБКА] Драйвер не найден. Сначала соберите проект.
    pause
    exit /b 1
)
if not exist "UserMode\RadarServer.exe" (
    echo [ОШИБКА] Сервер не найден. Сначала соберите проект.
    pause
    exit /b 1
)

call Deploy\install_driver.bat

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set IP=%%a
    goto :ipfound
)
:ipfound
set IP=%IP: =%
if "%IP%"=="" set IP=НЕ ОПРЕДЕЛЁН

start "Radar Server" cmd /c "UserMode\RadarServer.exe"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   СЕРВЕР ЗАПУЩЕН
echo ========================================
echo.
echo Откройте на iPhone Safari:
echo http://%IP%:8080/?token=ТОКЕН
echo.
echo ТОКЕН показан в окне сервера.
echo Закройте окно сервера для завершения.
pause >nul