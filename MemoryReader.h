// MemoryReader.h
#pragma once
#include <cstdint>
#include <vector>

struct Vec3 { float x, y, z; };
struct PlayerData {
    Vec3 origin;
    bool alive;
    int team;
};

class IMemoryReader {
public:
    virtual ~IMemoryReader() = default;
    virtual bool Connect() = 0;
    virtual bool ReadLocalPlayer(Vec3& origin, float& yaw, int& team) = 0;
    virtual std::vector<PlayerData> ReadEnemies(int localTeam) = 0;
    virtual void Disconnect() = 0;
};