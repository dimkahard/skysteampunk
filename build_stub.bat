@echo off
cl /LD /EHsc /O2 /std:c++17 manual_map_stub.cpp /link /DLL /OUT:manual_map_stub.dll
if exist manual_map_stub.dll echo [+] manual_map_stub.dll built.