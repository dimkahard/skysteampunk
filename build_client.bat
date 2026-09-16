@echo off
cl /EHsc /O2 /std:c++17 RadarClient.cpp user32.lib gdi32.lib ws2_32.lib /OUT:RadarClient.exe
if exist RadarClient.exe echo [+] RadarClient.exe built successfully.