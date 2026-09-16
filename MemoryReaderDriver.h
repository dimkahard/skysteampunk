// MemoryReaderDriver.h
#pragma once
#include "MemoryReader.h"

class MemoryReaderDriver : public IMemoryReader {
public:
    bool Connect() override;
    bool ReadLocalPlayer(Vec3& origin, float& yaw, int& team) override;
    std::vector<PlayerData> ReadEnemies(int localTeam) override;
    void Disconnect() override;
    ~MemoryReaderDriver() { Disconnect(); }
private:
    HANDLE m_hDriver = INVALID_HANDLE_VALUE;
    DWORD  m_pid = 0;
    uintptr_t m_clientBase = 0;
    ULONG m_dynamicIoctl = 0;
    UCHAR m_xorKey[16] = {0};
    ULONG m_callCounter = 0;
    bool m_connected = false;

    bool GetDynamicIoctl();
    bool GetEncryptionKey();
    void RotateKey();
    void XorBuffer(PVOID buf, SIZE_T size);
    bool SendIoctl(ULONG code, PVOID inBuffer, ULONG inSize, PVOID outBuffer, ULONG outSize, PULONG bytesReturned, bool addMuscle = true);
    bool ReadProcessMemoryInternal(HANDLE pid, uintptr_t address, PVOID buffer, SIZE_T size);
    bool GetModuleBase(HANDLE pid, const wchar_t* moduleName, uintptr_t& base);
};