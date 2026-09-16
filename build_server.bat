@echo off
setlocal
cd /d "%~dp0"
cl /EHsc /O2 /std:c++17 /FeRadarServer.exe RadarServer.cpp ws2_32.lib
if exist RadarServer.exe echo [+] Server built.
pause