// MemoryReaderDriver.cpp
#include "MemoryReaderDriver.h"
#include "Offsets.h"
#include "../Driver/MemoryDriver.h"
#include "../common/obfuscate.h"
#include <windows.h>
#include <tlhelp32.h>
#include <cstdio>
#include <vector>
#include <string>
#include <random>
#include <cstring>

#define KEY_ROTATE_INTERVAL 100
#define MAX_MUSCLE_SIZE 32

static std::random_device g_rd;
static std::mt19937 g_gen(g_rd());
static std::uniform_int_distribution<> g_muscleDist(1, MAX_MUSCLE_SIZE);

bool MemoryReaderDriver::GetDynamicIoctl() {
    if (m_hDriver == INVALID_HANDLE_VALUE) return false;
    DWORD returned = 0;
    ULONG code = 0;
    BOOL ok = DeviceIoControl(m_hDriver, IOCTL_GET_DYNAMIC_IOCTL,
                              nullptr, 0, &code, sizeof(code), &returned, NULL);
    if (ok && returned == sizeof(code)) {
        m_dynamicIoctl = code;
        return true;
    }
    return false;
}

bool MemoryReaderDriver::GetEncryptionKey() {
    if (m_hDriver == INVALID_HANDLE_VALUE) return false;
    DWORD returned = 0;
    BOOL ok = DeviceIoControl(m_hDriver, IOCTL_GET_ENCRYPTION_KEY,
                              nullptr, 0, m_xorKey, sizeof(m_xorKey), &returned, NULL);
    return ok && returned == sizeof(m_xorKey);
}

void MemoryReaderDriver::RotateKey() {
    std::random_device rd;
    std::mt19937 gen(rd());
    UCHAR newKey[16];
    for (int i = 0; i < 16; ++i) {
        newKey[i] = (UCHAR)(gen() % 256);
    }
    memcpy(m_xorKey, newKey, 16);
    DeviceIoControl(m_hDriver, IOCTL_SET_ENCRYPTION_KEY, newKey, 16, nullptr, 0, NULL);
}

void MemoryReaderDriver::XorBuffer(PVOID buf, SIZE_T size) {
    UCHAR* p = (UCHAR*)buf;
    for (SIZE_T i = 0; i < size; ++i) {
        p[i] ^= m_xorKey[i % 16];
    }
}

bool MemoryReaderDriver::SendIoctl(ULONG code, PVOID inBuffer, ULONG inSize, PVOID outBuffer, ULONG outSize, PULONG bytesReturned, bool addMuscle) {
    if (m_hDriver == INVALID_HANDLE_VALUE || code == 0) return false;
    DWORD returned = 0;

    std::vector<BYTE> inBuf;
    ULONG totalInSize = inSize;
    if (addMuscle) {
        int muscleSize = g_muscleDist(g_gen);
        totalInSize = inSize + muscleSize;
        inBuf.resize(totalInSize);
        memcpy(inBuf.data(), inBuffer, inSize);
        for (int i = 0; i < muscleSize; ++i) {
            inBuf[inSize + i] = (BYTE)(g_gen() % 256);
        }
    } else {
        inBuf.resize(inSize);
        memcpy(inBuf.data(), inBuffer, inSize);
    }

    XorBuffer(inBuf.data(), totalInSize);

    BOOL ok = DeviceIoControl(m_hDriver, code, inBuf.data(), totalInSize,
                              outBuffer, outSize, &returned, NULL);
    if (ok && outBuffer && outSize > 0) {
        XorBuffer(outBuffer, outSize);
    }
    if (ok && bytesReturned) *bytesReturned = returned;

    if (ok) {
        m_callCounter++;
        if (m_callCounter >= KEY_ROTATE_INTERVAL) {
            m_callCounter = 0;
            RotateKey();
        }
    }

    return ok;
}

bool MemoryReaderDriver::ReadProcessMemoryInternal(HANDLE pid, uintptr_t address, PVOID buffer, SIZE_T size) {
    if (size > 1024 * 1024) return false;
    ULONG totalSize = sizeof(MEMORY_REQUEST) + (ULONG)size;
    std::vector<BYTE> buf(totalSize);
    MEMORY_REQUEST* pReq = (MEMORY_REQUEST*)buf.data();
    pReq->Command = CMD_READ_MEMORY;
    pReq->ProcessId = pid;
    pReq->Read.Address = address;
    pReq->Read.Size = (ULONG)size;

    ULONG bytesReturned = 0;
    if (!SendIoctl(m_dynamicIoctl, buf.data(), totalSize, buf.data(), totalSize, &bytesReturned, true))
        return false;
    if (bytesReturned < sizeof(MEMORY_REQUEST)) return false;
    SIZE_T dataSize = bytesReturned - sizeof(MEMORY_REQUEST);
    if (dataSize != size) return false;
    memcpy(buffer, buf.data() + sizeof(MEMORY_REQUEST), size);
    return true;
}

bool MemoryReaderDriver::GetModuleBase(HANDLE pid, const wchar_t* moduleName, uintptr_t& base) {
    MEMORY_REQUEST req = {};
    req.Command = CMD_GET_MODULE_BASE;
    req.ProcessId = pid;
    wcscpy_s(req.Module.ModuleName, moduleName);

    ULONG bytesReturned = 0;
    if (!SendIoctl(m_dynamicIoctl, &req, sizeof(req), &req, sizeof(req), &bytesReturned, false))
        return false;
    if (bytesReturned != sizeof(req)) return false;
    base = (uintptr_t)req.Module.BaseAddress;
    return base != 0;
}

bool MemoryReaderDriver::Connect() {
    if (m_connected) return true;

    m_hDriver = CreateFileA("\\\\.\\MemoryDriver", GENERIC_READ | GENERIC_WRITE,
                            0, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (m_hDriver == INVALID_HANDLE_VALUE) {
        printf("[!] Failed to open driver.\n");
        return false;
    }

    if (!GetDynamicIoctl()) {
        printf("[!] Failed to get dynamic IOCTL.\n");
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
        return false;
    }
    printf("[+] Dynamic IOCTL = 0x%X\n", m_dynamicIoctl);

    if (!GetEncryptionKey()) {
        printf("[!] Failed to get encryption key.\n");
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
        return false;
    }

    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
        return false;
    }
    PROCESSENTRY32W entry = { sizeof(entry) };
    if (Process32FirstW(snapshot, &entry)) {
        do {
            if (_wcsicmp(entry.szExeFile, L"cs2.exe") == 0) {
                m_pid = entry.th32ProcessID;
                break;
            }
        } while (Process32NextW(snapshot, &entry));
    }
    CloseHandle(snapshot);
    if (!m_pid) {
        printf("[!] CS2 not found.\n");
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
        return false;
    }
    printf("[+] CS2 PID: %d\n", m_pid);

    wchar_t wDllName[] = L"client.dll";
    if (!GetModuleBase((HANDLE)m_pid, wDllName, m_clientBase)) {
        printf("[!] Failed to get client.dll base.\n");
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
        return false;
    }
    printf("[+] client.dll base: 0x%llX\n", (uint64_t)m_clientBase);

    m_connected = true;
    return true;
}

bool MemoryReaderDriver::ReadLocalPlayer(Vec3& origin, float& yaw, int& team) {
    if (!m_connected) return false;
    uintptr_t pawn = 0;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, m_clientBase + CS2Offsets::LOCAL_PLAYER_PAWN, &pawn, sizeof(pawn)))
        return false;
    if (!pawn) return false;

    Vec3 angles;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, pawn + CS2Offsets::EYE_ANGLES, &angles, sizeof(angles)))
        return false;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, pawn + CS2Offsets::TEAM, &team, sizeof(team)))
        return false;

    uintptr_t sceneNode = 0;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, pawn + CS2Offsets::GAME_SCENE_NODE, &sceneNode, sizeof(sceneNode)))
        return false;
    if (!sceneNode) return false;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, sceneNode + CS2Offsets::ABS_ORIGIN, &origin, sizeof(origin)))
        return false;

    yaw = angles.y;
    return true;
}

std::vector<PlayerData> MemoryReaderDriver::ReadEnemies(int localTeam) {
    std::vector<PlayerData> enemies;
    if (!m_connected) return enemies;

    uintptr_t entityList = 0;
    if (!ReadProcessMemoryInternal((HANDLE)m_pid, m_clientBase + CS2Offsets::ENTITY_LIST, &entityList, sizeof(entityList)))
        return enemies;
    if (!entityList) return enemies;

    for (int i = 0; i < 64; ++i) {
        uintptr_t controller = 0;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, entityList + i * 8, &controller, sizeof(controller)))
            continue;
        if (!controller) continue;

        uintptr_t pawnHandle = 0;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, controller + CS2Offsets::PAWN_HANDLE, &pawnHandle, sizeof(pawnHandle)))
            continue;

        int pawnIndex = (int)(pawnHandle & 0x7FF);
        uintptr_t pawnListEntry = 0;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, entityList + pawnIndex * 8, &pawnListEntry, sizeof(pawnListEntry)))
            continue;
        if (!pawnListEntry) continue;

        uintptr_t pawnAddr = 0;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, pawnListEntry + 0x10, &pawnAddr, sizeof(pawnAddr)))
            continue;
        if (!pawnAddr) continue;

        int team = 0, health = 0;
        ReadProcessMemoryInternal((HANDLE)m_pid, pawnAddr + CS2Offsets::TEAM, &team, sizeof(team));
        ReadProcessMemoryInternal((HANDLE)m_pid, pawnAddr + CS2Offsets::HEALTH, &health, sizeof(health));

        if (team == 0 || team == localTeam || health <= 0 || health > 1000)
            continue;

        uintptr_t sceneNode = 0;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, pawnAddr + CS2Offsets::GAME_SCENE_NODE, &sceneNode, sizeof(sceneNode)))
            continue;
        if (!sceneNode) continue;

        Vec3 origin;
        if (!ReadProcessMemoryInternal((HANDLE)m_pid, sceneNode + CS2Offsets::ABS_ORIGIN, &origin, sizeof(origin)))
            continue;

        PlayerData p{ origin, true, team };
        enemies.push_back(p);
    }
    return enemies;
}

void MemoryReaderDriver::Disconnect() {
    if (m_hDriver != INVALID_HANDLE_VALUE) {
        CloseHandle(m_hDriver);
        m_hDriver = INVALID_HANDLE_VALUE;
    }
    m_connected = false;
}