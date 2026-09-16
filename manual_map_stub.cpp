#include "manual_map_stub.h"
#include <cstdint>
#include <cstring>

// Вспомогательные структуры для PE-формата
typedef struct {
    DWORD PageRVA;
    DWORD BlockSize;
} BASE_RELOCATION_BLOCK;

typedef struct {
    WORD Offset : 12;
    WORD Type : 4;
} BASE_RELOCATION_ENTRY;

// Упрощённый ручной маппинг
void* ManualMapInternal(const uint8_t* dllData, size_t dllSize) {
    PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)dllData;
    if (pDos->e_magic != IMAGE_DOS_SIGNATURE) return nullptr;

    PIMAGE_NT_HEADERS pNt = (PIMAGE_NT_HEADERS)(dllData + pDos->e_lfanew);
    if (pNt->Signature != IMAGE_NT_SIGNATURE) return nullptr;
    if (pNt->FileHeader.Machine != IMAGE_FILE_MACHINE_AMD64) return nullptr;

    // Выделяем память под образ
    void* pImageBase = VirtualAlloc(nullptr, pNt->OptionalHeader.SizeOfImage,
                                    MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    if (!pImageBase) return nullptr;

    // Копируем заголовки
    memcpy(pImageBase, dllData, pNt->OptionalHeader.SizeOfHeaders);

    // Копируем секции
    PIMAGE_SECTION_HEADER pSection = IMAGE_FIRST_SECTION(pNt);
    for (int i = 0; i < pNt->FileHeader.NumberOfSections; ++i) {
        if (pSection[i].SizeOfRawData) {
            memcpy((BYTE*)pImageBase + pSection[i].VirtualAddress,
                   dllData + pSection[i].PointerToRawData,
                   pSection[i].SizeOfRawData);
        }
    }

    // Применяем релокации
    uintptr_t delta = (uintptr_t)pImageBase - pNt->OptionalHeader.ImageBase;
    if (delta) {
        IMAGE_DATA_DIRECTORY relocDir = pNt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC];
        if (relocDir.VirtualAddress && relocDir.Size) {
            BASE_RELOCATION_BLOCK* pReloc = (BASE_RELOCATION_BLOCK*)((BYTE*)pImageBase + relocDir.VirtualAddress);
            while (pReloc->PageRVA) {
                DWORD blockSize = pReloc->BlockSize;
                DWORD entriesCount = (blockSize - sizeof(BASE_RELOCATION_BLOCK)) / sizeof(BASE_RELOCATION_ENTRY);
                BASE_RELOCATION_ENTRY* pEntry = (BASE_RELOCATION_ENTRY*)((BYTE*)pReloc + sizeof(BASE_RELOCATION_BLOCK));
                for (DWORD j = 0; j < entriesCount; ++j) {
                    if (pEntry->Type == 10) {
                        uintptr_t* pAddr = (uintptr_t*)((BYTE*)pImageBase + pReloc->PageRVA + pEntry->Offset);
                        *pAddr += delta;
                    }
                    ++pEntry;
                }
                pReloc = (BASE_RELOCATION_BLOCK*)((BYTE*)pReloc + blockSize);
            }
        }
    }

    // Разрешение импортов (упрощённо – только kernel32 и user32)
    IMAGE_DATA_DIRECTORY importDir = pNt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
    if (importDir.VirtualAddress && importDir.Size) {
        PIMAGE_IMPORT_DESCRIPTOR pImport = (PIMAGE_IMPORT_DESCRIPTOR)((BYTE*)pImageBase + importDir.VirtualAddress);
        while (pImport->Name) {
            const char* dllName = (const char*)((BYTE*)pImageBase + pImport->Name);
            HMODULE hMod = GetModuleHandleA(dllName);
            if (!hMod) hMod = LoadLibraryA(dllName); // оставляет след
            PIMAGE_THUNK_DATA pThunk = (PIMAGE_THUNK_DATA)((BYTE*)pImageBase + pImport->FirstThunk);
            PIMAGE_THUNK_DATA pOrigThunk = (PIMAGE_THUNK_DATA)((BYTE*)pImageBase + pImport->OriginalFirstThunk);
            if (!pOrigThunk) pOrigThunk = pThunk;
            while (pOrigThunk->u1.AddressOfData) {
                FARPROC pFunc = nullptr;
                if (pOrigThunk->u1.Ordinal & IMAGE_ORDINAL_FLAG) {
                    pFunc = GetProcAddress(hMod, (LPCSTR)(UINT_PTR)(pOrigThunk->u1.Ordinal & 0xFFFF));
                } else {
                    PIMAGE_IMPORT_BY_NAME pByName = (PIMAGE_IMPORT_BY_NAME)((BYTE*)pImageBase + pOrigThunk->u1.AddressOfData);
                    pFunc = GetProcAddress(hMod, pByName->Name);
                }
                if (pFunc) pThunk->u1.Function = (uintptr_t)pFunc;
                ++pThunk;
                ++pOrigThunk;
            }
            ++pImport;
        }
    }

    // Устанавливаем минимальные права страниц
    DWORD oldProtect;
    VirtualProtect(pImageBase, pNt->OptionalHeader.SizeOfHeaders, PAGE_READONLY, &oldProtect);

    // Вызываем DllMain
    DWORD entryRVA = pNt->OptionalHeader.AddressOfEntryPoint;
    if (entryRVA) {
        typedef BOOL(WINAPI* DllMain_t)(HINSTANCE, DWORD, LPVOID);
        DllMain_t pDllMain = (DllMain_t)((BYTE*)pImageBase + entryRVA);
        pDllMain((HINSTANCE)pImageBase, DLL_PROCESS_ATTACH, nullptr);
    }

    return pImageBase;
}

DWORD WINAPI RemoteMapThread(LPVOID lpParam) {
    MapParams* params = (MapParams*)lpParam;
    void* base = ManualMapInternal(params->dllBuffer, params->dllSize);
    if (params->outBase) *params->outBase = base;
    return 0;
}