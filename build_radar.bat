@echo off
cl /LD /EHsc /O2 /std:c++17 ^
   dllmain.cpp radar_core.cpp gdi_render.cpp ^
   user32.lib gdi32.lib ^
   /link /SUBSYSTEM:WINDOWS /DLL /OUT:radar.dll
if exist radar.dll echo [+] radar.dll built.