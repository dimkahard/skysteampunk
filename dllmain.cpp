#include "common.h"
#include <thread>

void InitRadar() {
    while (!GetClientBase()) Sleep(200);
    CreateThread(nullptr, 0, RadarUpdateThread, nullptr, 0, nullptr);
    StartRenderThread();
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(hModule);
        CreateThread(nullptr, 0, [](LPVOID) -> DWORD {
            InitRadar();
            return 0;
        }, nullptr, 0, nullptr);
    } else if (reason == DLL_PROCESS_DETACH) {
        g_running = false;
        Sleep(200);
        ShutdownRadar();
    }
    return TRUE;
}