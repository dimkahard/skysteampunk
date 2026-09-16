#include "common.h"
#include <thread>
#include <chrono>
#include <random>

std::vector<RadarPoint> g_enemyPoints;
bool g_localValid = false;
std::mutex g_mutex;
bool g_running = true;

bool ReadOriginDirect(uintptr_t pawnAddr, Vec3& out) {
    uintptr_t sceneNode = ReadPtr<uintptr_t>(pawnAddr + OFFSET_GAME_SCENE_NODE);
    if (!sceneNode) return false;
    Vec3 temp = ReadPtr<Vec3>(sceneNode + OFFSET_ABS_ORIGIN);
    if (temp.x == 0.0f && temp.y == 0.0f && temp.z == 0.0f) return false;
    out = temp;
    return true;
}

LocalPlayerData ReadLocalPlayerDirect(uintptr_t clientBase) {
    LocalPlayerData local;
    uintptr_t pawn = ReadPtr<uintptr_t>(clientBase + OFFSET_LOCAL_PLAYER_PAWN);
    if (!pawn) return local;
    Vec3 angles = ReadPtr<Vec3>(pawn + OFFSET_EYE_ANGLES);
    local.team = ReadPtr<int>(pawn + OFFSET_TEAM);
    if (!ReadOriginDirect(pawn, local.origin)) return local;
    local.yaw = angles.y;
    local.valid = true;
    return local;
}

std::vector<PlayerData> ReadEnemiesDirect(uintptr_t clientBase, int localTeam) {
    std::vector<PlayerData> enemies;
    uintptr_t entityList = ReadPtr<uintptr_t>(clientBase + OFFSET_ENTITY_LIST);
    if (!entityList) return enemies;
    for (int i = 0; i < RADAR_MAX_PLAYERS; ++i) {
        uintptr_t controllerAddr = ReadPtr<uintptr_t>(entityList + i * 8);
        if (!controllerAddr) continue;
        uintptr_t pawnHandle = ReadPtr<uintptr_t>(controllerAddr + OFFSET_PAWN_HANDLE);
        int pawnIndex = static_cast<int>(pawnHandle & 0x7FF);
        uintptr_t pawnListEntry = ReadPtr<uintptr_t>(entityList + pawnIndex * 8);
        if (!pawnListEntry) continue;
        uintptr_t pawnAddr = ReadPtr<uintptr_t>(pawnListEntry + 0x10);
        if (!pawnAddr) continue;
        PlayerData p;
        p.team = ReadPtr<int>(pawnAddr + OFFSET_TEAM);
        int health = ReadPtr<int>(pawnAddr + OFFSET_HEALTH);
        if (health > 0 && health < 1000) p.alive = true;
        if (!ReadOriginDirect(pawnAddr, p.origin)) continue;
        if (p.alive && p.team != 0 && p.team != localTeam)
            enemies.push_back(p);
    }
    return enemies;
}

RadarPoint WorldToRadar(const Vec3& localPos, float localYaw,
                        const Vec3& enemyPos, float centerX, float centerY,
                        float scale, float maxRange) {
    float dx = enemyPos.x - localPos.x;
    float dy = enemyPos.y - localPos.y;
    float theta = -localYaw;
    float c = std::cos(theta);
    float s = std::sin(theta);
    float rx = dx * c - dy * s;
    float ry = dx * s + dy * c;
    float dist = std::sqrt(rx*rx + ry*ry);
    RadarPoint pt;
    if (dist > maxRange && dist > 0.0001f) {
        rx *= maxRange / dist;
        ry *= maxRange / dist;
        pt.visible = false;
    } else {
        pt.visible = true;
    }
    pt.x = centerX + rx * scale;
    pt.y = centerY + ry * scale;
    return pt;
}

DWORD WINAPI RadarUpdateThread(LPVOID) {
    while (g_running) {
        uintptr_t clientBase = GetClientBase();
        if (!clientBase) { Sleep(200); continue; }
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> jitter(-4, 4);
        const int baseMs = 1000 / TARGET_FPS;
        while (g_running) {
            auto start = std::chrono::steady_clock::now();
            LocalPlayerData local = ReadLocalPlayerDirect(clientBase);
            std::vector<RadarPoint> pts;
            if (local.valid) {
                auto enemies = ReadEnemiesDirect(clientBase, local.team);
                pts.reserve(enemies.size());
                for (const auto& e : enemies) {
                    pts.push_back(WorldToRadar(local.origin, local.yaw, e.origin,
                                               RADAR_CENTER_X, RADAR_CENTER_Y,
                                               RADAR_SCALE, RADAR_MAX_RANGE));
                }
            }
            {
                std::lock_guard<std::mutex> lk(g_mutex);
                g_enemyPoints.swap(pts);
                g_localValid = local.valid;
            }
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::steady_clock::now() - start).count();
            int sleepMs = baseMs + jitter(gen);
            if (sleepMs < 1) sleepMs = 1;
            int delay = sleepMs - static_cast<int>(elapsed);
            if (delay > 0) std::this_thread::sleep_for(std::chrono::milliseconds(delay));
        }
    }
    return 0;
}