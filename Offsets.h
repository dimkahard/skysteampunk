// Offsets.h
#pragma once
#include <cstdint>
#include <string>
#include <fstream>
#include <map>
#include <sstream>

struct CS2Offsets {
    static uintptr_t LOCAL_PLAYER_PAWN;
    static uintptr_t ENTITY_LIST;
    static uintptr_t PAWN_HANDLE;
    static uintptr_t TEAM;
    static uintptr_t HEALTH;
    static uintptr_t GAME_SCENE_NODE;
    static uintptr_t ABS_ORIGIN;
    static uintptr_t EYE_ANGLES;

    static bool LoadFromFile(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) return false;

        std::map<std::string, uintptr_t*> mapping = {
            {"LOCAL_PLAYER_PAWN", &LOCAL_PLAYER_PAWN},
            {"ENTITY_LIST", &ENTITY_LIST},
            {"PAWN_HANDLE", &PAWN_HANDLE},
            {"TEAM", &TEAM},
            {"HEALTH", &HEALTH},
            {"GAME_SCENE_NODE", &GAME_SCENE_NODE},
            {"ABS_ORIGIN", &ABS_ORIGIN},
            {"EYE_ANGLES", &EYE_ANGLES}
        };

        std::string line;
        while (std::getline(file, line)) {
            if (line.empty() || line[0] == ';') continue;
            size_t pos = line.find('=');
            if (pos == std::string::npos) continue;
            std::string key = line.substr(0, pos);
            std::string val = line.substr(pos + 1);
            // Удаляем пробелы
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            val.erase(0, val.find_first_not_of(" \t"));
            val.erase(val.find_last_not_of(" \t") + 1);
            uintptr_t value = std::stoull(val, nullptr, 16);
            if (mapping.find(key) != mapping.end()) {
                *mapping[key] = value;
            }
        }
        file.close();
        return true;
    }
};

// Статические определения (значения по умолчанию)
uintptr_t CS2Offsets::LOCAL_PLAYER_PAWN = 0x23C6268;
uintptr_t CS2Offsets::ENTITY_LIST = 0x2571220;
uintptr_t CS2Offsets::PAWN_HANDLE = 0x914;
uintptr_t CS2Offsets::TEAM = 0x3E7;
uintptr_t CS2Offsets::HEALTH = 0x34C;
uintptr_t CS2Offsets::GAME_SCENE_NODE = 0x330;
uintptr_t CS2Offsets::ABS_ORIGIN = 0xC8;
uintptr_t CS2Offsets::EYE_ANGLES = 0x3350;