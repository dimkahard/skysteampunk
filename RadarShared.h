// RadarShared.h
#pragma once

#include <cstdint>

#pragma pack(push, 1)  // Выравнивание для компактной передачи по сети

struct Vec3 {
    float x, y, z;
};

struct PlayerInfo {
    Vec3  origin;
    bool  alive;
    int   team;
};

struct RadarPacket {
    Vec3  localOrigin;
    float localYaw;          // радианы
    int   localTeam;
    int   playerCount;
    PlayerInfo players[64];
};

#pragma pack(pop)