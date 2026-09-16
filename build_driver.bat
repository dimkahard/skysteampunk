@echo off
setlocal
cd /d "%~dp0"
cl /nologo /LD /GS- /Gs /Zl /Gz /Zc:wchar_t /Zi /Qspectre /W4 /WX /kernel /std:c17 ^
   /D_WIN32_WINNT=0x0A00 /D_KERNEL_MODE /D_UNICODE /DUNICODE ^
   MemoryDriver.c ^
   /link /debug /driver /out:MemoryDriver.sys
if exist MemoryDriver.sys echo [+] Driver built.
pause