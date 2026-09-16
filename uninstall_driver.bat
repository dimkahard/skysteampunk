@echo off
cd /d "%~dp0"
sc stop MemoryDriver 2>nul
sc delete MemoryDriver 2>nul
echo Driver removed.
pause