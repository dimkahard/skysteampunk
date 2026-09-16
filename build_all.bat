@echo off
echo Building radar DLL...
cd radar && call build_radar.bat && cd ..
echo Building injector...
cd injector && call build_injector.bat && cd ..
echo All done. Place radar.dll and injector.exe in the same folder.
echo Run injector.exe as administrator while CS2 is running (offline with bots).