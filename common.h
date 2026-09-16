#pragma once

#include <windows.h>
#include <vector>
#include <mutex>
#include <cmath>

// ---------- ОФФСЕТЫ (актуальны на 2026-09-07) ----------
constexpr uintptr_t OFFSET_ENTITY_LIST        = 0x2571220;
constexpr uintptr_t OFFSET_LOCAL_PLAYER_PAWN  = 0x23C6268;
constexpr uintptr_t OFFSET_PAWN_HANDLE        = 0x914;
constexpr uintptr_t OFFSET_TEAM               = 0x3E7;
constexpr uintptr_t OFFSET_HEALTH             = 0x34C;
constexpr uintptr_t OFFSET_GAME_SCENE_NODE    = 0x330;
constexpr uintptr_t OFFSET_ABS_ORIGIN         = 0xC8;
constexpr uintptr_t OFFSET_EYE_ANGLES         = 0x3350;

constexpr int   RADAR_MAX_PLAYERS  = 64;
constexpr float RADAR_SCALE        = 0.25f;   // 250/1000
constexpr float RADAR_MAX_RANGE    = 1000.0f;
constexpr int   RADAR_CENTER_X     = 300;
constexpr int   RADAR_CENTER_Y     = 300;
constexpr int   RADAR_RADIUS       = 250;
constexpr int   TARGET_FPS         = 60;

// ---------- СТРУКТУРЫ ----------
struct Vec3 {
    float x, y, z;
};

struct PlayerData {
    bool  alive   = false;
    int   team    = 0;
    Vec3  origin{};
};

struct LocalPlayerData {
    bool  valid   = false;
    int   team    = 0;
    Vec3  origin{};
    float yaw     = 0.0f;
};

struct RadarPoint {
    float x = 0, y = 0;
    bool  visible = false;
};

// ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----------
extern std::vector<RadarPoint> g_enemyPoints;
extern bool g_localValid;
extern std::mutex g_mutex;
extern bool g_running;

// ---------- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ БАЗЫ client.dll ----------
inline uintptr_t GetClientBase() {
    HMODULE hMod = GetModuleHandleW(L"client.dll");
    return (uintptr_t)hMod;
}

// ---------- БЕЗОПАСНОЕ ЧТЕНИЕ (SEH) ----------
template <typename T>
inline T ReadPtr(uintptr_t address) {
    T result = T{};
    __try {
        if (address < 0x10000) return result;
        result = *(T*)address;
    } __except (EXCEPTION_EXECUTE_HANDLER) {}
    return result;
}

// ---------- ОБЪЯВЛЕНИЯ ФУНКЦИЙ ----------
bool ReadOriginDirect(uintptr_t pawnAddr, Vec3& out);
LocalPlayerData ReadLocalPlayerDirect(uintptr_t clientBase);
std::vector<PlayerData> ReadEnemiesDirect(uintptr_t clientBase, int localTeam);
RadarPoint WorldToRadar(const Vec3& localPos, float localYaw,
                        const Vec3& enemyPos, float centerX, float centerY,
                        float scale, float maxRange);
DWORD WINAPI RadarUpdateThread(LPVOID);
void StartRenderThread();
void ShutdownRadar();