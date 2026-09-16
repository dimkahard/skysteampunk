@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
set RANDOM_NAME=
for /L %%i in (1,1,8) do (
    set /a rnd=!random! %% 36
    set RANDOM_NAME=!RANDOM_NAME!!CHARS:~%rnd%,1!
)
echo Случайное имя службы: !RANDOM_NAME!
sc stop MemoryDriver 2>nul
sc delete MemoryDriver 2>nul
sc create !RANDOM_NAME! type= kernel binPath= "%~dp0MemoryDriver.sys"
sc start !RANDOM_NAME!
echo Драйвер установлен как служба !RANDOM_NAME!
pause