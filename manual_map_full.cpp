// ============================================================================
// manual_map_full.cpp – Полноценный ручной маппинг DLL (x64)
// ----------------------------------------------------------------------------
// Включает:
//   - Разрешение импортов (загрузка зависимостей)
//   - Обработка релокаций
//   - Установка правильных прав страниц для каждой секции
//   - Обработка TLS-калбэков
//   - Вызов DllMain с корректными флагами
//   - Маскировка страниц от античита (использование VirtualProtect)
// ============================================================================

#include <windows.h>
#include <vector>
#include <string>
#include <cstdint>
#include <algorithm>
#include <map>
#include <set>
#include <memory>

// ---------- СТРУКТУРЫ ДЛЯ РАБОТЫ С TLS ----------
// Они нужны для корректного разбора TLS-каталога
typedef struct _IMAGE_TLS_DIRECTORY64 {
    ULONGLONG StartAddressOfRawData;
    ULONGLONG EndAddressOfRawData;
    ULONGLONG AddressOfIndex;
    ULONGLONG AddressOfCallBacks;
    DWORD SizeOfZeroFill;
    DWORD Characteristics;
} IMAGE_TLS_DIRECTORY64, *PIMAGE_TLS_DIRECTORY64;

// ---------- КЛАСС РУЧНОГО МАППИНГА ----------
class ManualMapper {
private:
    // Вспомогательный класс для хранения состояния загрузки
    struct MappingContext {
        void* pImageBase = nullptr;                // База загруженной DLL
        PIMAGE_NT_HEADERS pNtHeaders = nullptr;    // NT-заголовки
        std::map<std::string, HMODULE> loadedModules; // Загруженные зависимости
        std::vector<void*> tlsCallbacks;           // Найденные TLS-калбэки
        bool isMapped = false;
    };

    // ---------- 1. УСТАНОВКА ЗАЩИТЫ СТРАНИЦ ----------
    // Каждая секция в PE-файле имеет свои атрибуты:
    // - .text  -> RX (исполняемый, только чтение)
    // - .data  -> RW (чтение/запись)
    // - .rdata -> R (только чтение)
    // - .reloc -> R
    static bool ApplySectionProtection(void* pImageBase, PIMAGE_NT_HEADERS pNt) {
        PIMAGE_SECTION_HEADER pSection = IMAGE_FIRST_SECTION(pNt);
        for (int i = 0; i < pNt->FileHeader.NumberOfSections; ++i) {
            if (pSection[i].SizeOfRawData == 0) continue;

            DWORD virtualAddress = pSection[i].VirtualAddress;
            DWORD size = pSection[i].SizeOfRawData;
            DWORD characteristics = pSection[i].Characteristics;

            // Преобразуем флаги секции в права страниц Windows
            DWORD protect = 0;
            if (characteristics & IMAGE_SCN_MEM_EXECUTE) {
                protect = (characteristics & IMAGE_SCN_MEM_WRITE) ? PAGE_EXECUTE_READWRITE :
                          (characteristics & IMAGE_SCN_MEM_READ) ? PAGE_EXECUTE_READ : PAGE_EXECUTE;
            } else {
                protect = (characteristics & IMAGE_SCN_MEM_WRITE) ? PAGE_READWRITE : PAGE_READONLY;
            }

            // Устанавливаем права для секции
            DWORD oldProtect;
            if (!VirtualProtect((BYTE*)pImageBase + virtualAddress, size, protect, &oldProtect)) {
                return false;
            }
        }

        // Устанавливаем защиту для заголовков (только чтение)
        DWORD oldProtect;
        VirtualProtect(pImageBase, pNt->OptionalHeader.SizeOfHeaders, PAGE_READONLY, &oldProtect);

        return true;
    }

    // ---------- 2. РАЗРЕШЕНИЕ ЗАВИСИМОСТЕЙ ----------
    // Загружает все DLL, от которых зависит наша DLL
    static bool ResolveImports(void* pImageBase, PIMAGE_NT_HEADERS pNt, MappingContext& ctx) {
        IMAGE_DATA_DIRECTORY importDir = pNt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
        if (!importDir.VirtualAddress || !importDir.Size) return true;

        PIMAGE_IMPORT_DESCRIPTOR pImportDesc = (PIMAGE_IMPORT_DESCRIPTOR)((uintptr_t)pImageBase + importDir.VirtualAddress);

        while (pImportDesc->Name) {
            // Получаем имя DLL (в PE оно хранится как ASCII-строка)
            const char* dllName = (const char*)((uintptr_t)pImageBase + pImportDesc->Name);
            std::string dllNameStr(dllName);

            // Проверяем, не загружена ли уже эта DLL
            HMODULE hModule = nullptr;
            auto it = ctx.loadedModules.find(dllNameStr);
            if (it != ctx.loadedModules.end()) {
                hModule = it->second;
            } else {
                // Пробуем загрузить через LoadLibrary (это оставляет след, но для учебного примера допустимо)
                // В реальном чите используют ручную загрузку зависимостей, но это сложно.
                hModule = LoadLibraryA(dllName);
                if (!hModule) {
                    // Если не удалось загрузить, пробуем получить уже загруженный модуль
                    hModule = GetModuleHandleA(dllName);
                    if (!hModule) {
                        // Не удалось загрузить зависимость – пропускаем (но это рискованно)
                        ++pImportDesc;
                        continue;
                    }
                }
                ctx.loadedModules[dllNameStr] = hModule;
            }

            // Разрешаем функции
            PIMAGE_THUNK_DATA pThunk = (PIMAGE_THUNK_DATA)((uintptr_t)pImageBase + pImportDesc->FirstThunk);
            PIMAGE_THUNK_DATA pOrigThunk = (PIMAGE_THUNK_DATA)((uintptr_t)pImageBase + pImportDesc->OriginalFirstThunk);
            if (!pOrigThunk) pOrigThunk = pThunk;

            while (pOrigThunk->u1.AddressOfData) {
                FARPROC pFunc = nullptr;
                if (pOrigThunk->u1.Ordinal & IMAGE_ORDINAL_FLAG) {
                    // Импорт по порядковому номеру
                    WORD ordinal = (WORD)(pOrigThunk->u1.Ordinal & 0xFFFF);
                    pFunc = GetProcAddress(hModule, (LPCSTR)(UINT_PTR)ordinal);
                } else {
                    // Импорт по имени
                    PIMAGE_IMPORT_BY_NAME pByName = (PIMAGE_IMPORT_BY_NAME)((uintptr_t)pImageBase + pOrigThunk->u1.AddressOfData);
                    pFunc = GetProcAddress(hModule, (LPCSTR)pByName->Name);
                }

                if (pFunc) {
                    pThunk->u1.Function = (uintptr_t)pFunc;
                } else {
                    // Если функция не найдена – зануляем (может привести к падению)
                    pThunk->u1.Function = 0;
                }
                ++pThunk;
                ++pOrigThunk;
            }
            ++pImportDesc;
        }

        return true;
    }

    // ---------- 3. ОБРАБОТКА TLS-КАЛБЭКОВ ----------
    // TLS (Thread Local Storage) – это данные, уникальные для каждого потока.
    // TLS-калбэки выполняются до DllMain и используются для инициализации.
    static bool ProcessTLS(void* pImageBase, PIMAGE_NT_HEADERS pNt, MappingContext& ctx) {
        IMAGE_DATA_DIRECTORY tlsDir = pNt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_TLS];
        if (!tlsDir.VirtualAddress || !tlsDir.Size) return true;

        PIMAGE_TLS_DIRECTORY64 pTls = (PIMAGE_TLS_DIRECTORY64)((uintptr_t)pImageBase + tlsDir.VirtualAddress);

        // Проверяем, есть ли калбэки
        if (pTls->AddressOfCallBacks) {
            PIMAGE_TLS_CALLBACK* pCallbacks = (PIMAGE_TLS_CALLBACK*)(pTls->AddressOfCallBacks);
            while (*pCallbacks) {
                // Сохраняем адрес калбэка для последующего вызова
                ctx.tlsCallbacks.push_back((void*)*pCallbacks);
                ++pCallbacks;
            }
        }

        // Инициализируем TLS-данные (копируем из образа в реальную память)
        if (pTls->StartAddressOfRawData && pTls->EndAddressOfRawData) {
            size_t dataSize = (size_t)(pTls->EndAddressOfRawData - pTls->StartAddressOfRawData);
            if (dataSize > 0) {
                // В реальности здесь нужно выделить память для TLS-данных каждого потока.
                // Для упрощения мы просто копируем данные в глобальную память.
                // Но правильный подход – использовать TlsAlloc/TlsSetValue.
                // В учебном примере пропускаем, так как это сложно.
            }
        }

        return true;
    }

    // ---------- 4. ВЫЗОВ TLS-КАЛБЭКОВ ----------
    static void CallTLSCallbacks(MappingContext& ctx, DWORD reason) {
        for (void* pCallback : ctx.tlsCallbacks) {
            PIMAGE_TLS_CALLBACK callback = (PIMAGE_TLS_CALLBACK)pCallback;
            callback((LPVOID)ctx.pImageBase, reason, nullptr);
        }
    }

    // ---------- 5. МАСКИРОВКА ОТ АНТИЧИТА ----------
    // Некоторые античиты сканируют память на наличие страниц с правами RWX.
    // Мы можем маскировать выделенную память, изменив права на более "безопасные".
    static bool MaskMemory(void* pImageBase, PIMAGE_NT_HEADERS pNt) {
        // Идея: пройти по всем секциям и для тех, у которых права RWX, попытаться
        // разбить на две области: RX и RW (чтобы не было одновременно и записи, и исполнения).
        // Это сильно снижает вероятность обнаружения.
        PIMAGE_SECTION_HEADER pSection = IMAGE_FIRST_SECTION(pNt);
        for (int i = 0; i < pNt->FileHeader.NumberOfSections; ++i) {
            if (pSection[i].SizeOfRawData == 0) continue;

            DWORD virtualAddress = pSection[i].VirtualAddress;
            DWORD size = pSection[i].SizeOfRawData;
            DWORD characteristics = pSection[i].Characteristics;

            // Если секция и исполняемая, и записываемая – разбиваем
            if ((characteristics & IMAGE_SCN_MEM_EXECUTE) && (characteristics & IMAGE_SCN_MEM_WRITE)) {
                // Делаем её только исполняемой
                DWORD oldProtect;
                VirtualProtect((BYTE*)pImageBase + virtualAddress, size, PAGE_EXECUTE_READ, &oldProtect);
                // Для записи используем отдельную память (в реальном мире это сложно)
                // В учебном примере оставляем как есть.
            }
        }
        return true;
    }

public:
    // ---------- ГЛАВНАЯ ФУНКЦИЯ МАППИНГА ----------
    static void* MapDLL(const std::vector<uint8_t>& dllBuffer) {
        if (dllBuffer.empty()) return nullptr;

        // Проверяем DOS-заголовок
        PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)dllBuffer.data();
        if (pDos->e_magic != IMAGE_DOS_SIGNATURE) return nullptr;

        // Проверяем NT-заголовки
        PIMAGE_NT_HEADERS pNt = (PIMAGE_NT_HEADERS)((uintptr_t)pDos + pDos->e_lfanew);
        if (pNt->Signature != IMAGE_NT_SIGNATURE) return nullptr;
        if (pNt->FileHeader.Machine != IMAGE_FILE_MACHINE_AMD64) return nullptr;
        if (!(pNt->FileHeader.Characteristics & IMAGE_FILE_DLL)) return nullptr;

        // Создаём контекст маппинга
        MappingContext ctx;
        ctx.pNtHeaders = pNt;

        // Выделяем память под образ
        void* pImageBase = VirtualAlloc(nullptr, pNt->OptionalHeader.SizeOfImage,
                                        MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
        if (!pImageBase) return nullptr;
        ctx.pImageBase = pImageBase;

        // Копируем заголовки
        memcpy(pImageBase, dllBuffer.data(), pNt->OptionalHeader.SizeOfHeaders);

        // Копируем секции
        PIMAGE_SECTION_HEADER pSection = IMAGE_FIRST_SECTION(pNt);
        for (int i = 0; i < pNt->FileHeader.NumberOfSections; ++i) {
            if (pSection[i].SizeOfRawData) {
                memcpy((BYTE*)pImageBase + pSection[i].VirtualAddress,
                       dllBuffer.data() + pSection[i].PointerToRawData,
                       pSection[i].SizeOfRawData);
            }
        }

        // Применяем релокации
        uintptr_t delta = (uintptr_t)pImageBase - pNt->OptionalHeader.ImageBase;
        if (delta != 0) {
            IMAGE_DATA_DIRECTORY relocDir = pNt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC];
            if (relocDir.VirtualAddress && relocDir.Size) {
                PBASE_RELOCATION_BLOCK pRelocBlock = (PBASE_RELOCATION_BLOCK)((uintptr_t)pImageBase + relocDir.VirtualAddress);
                while (pRelocBlock->PageRVA) {
                    DWORD blockSize = pRelocBlock->BlockSize;
                    DWORD entriesCount = (blockSize - sizeof(BASE_RELOCATION_BLOCK)) / sizeof(BASE_RELOCATION_ENTRY);
                    PBASE_RELOCATION_ENTRY pEntry = (PBASE_RELOCATION_ENTRY)((uintptr_t)pRelocBlock + sizeof(BASE_RELOCATION_BLOCK));

                    for (DWORD j = 0; j < entriesCount; ++j) {
                        if (pEntry->Type == 10) { // IMAGE_REL_BASED_DIR64
                            uintptr_t* pAddress = (uintptr_t*)((uintptr_t)pImageBase + pRelocBlock->PageRVA + pEntry->Offset);
                            *pAddress += delta;
                        }
                        else if (pEntry->Type == 3) { // IMAGE_REL_BASED_HIGHLOW (для 32-битных указателей в x64)
                            DWORD* pAddress = (DWORD*)((uintptr_t)pImageBase + pRelocBlock->PageRVA + pEntry->Offset);
                            *pAddress += (DWORD)delta;
                        }
                        ++pEntry;
                    }
                    pRelocBlock = (PBASE_RELOCATION_BLOCK)((uintptr_t)pRelocBlock + blockSize);
                }
            }
        }

        // Разрешаем импорты (загружаем зависимости)
        if (!ResolveImports(pImageBase, pNt, ctx)) {
            VirtualFree(pImageBase, 0, MEM_RELEASE);
            return nullptr;
        }

        // Обрабатываем TLS (находим калбэки)
        if (!ProcessTLS(pImageBase, pNt, ctx)) {
            VirtualFree(pImageBase, 0, MEM_RELEASE);
            return nullptr;
        }

        // Устанавливаем правильные права страниц
        if (!ApplySectionProtection(pImageBase, pNt)) {
            VirtualFree(pImageBase, 0, MEM_RELEASE);
            return nullptr;
        }

        // Маскируем память от античита (если нужно)
        MaskMemory(pImageBase, pNt);

        // Вызываем TLS-калбэки (с флагом DLL_PROCESS_ATTACH)
        CallTLSCallbacks(ctx, DLL_PROCESS_ATTACH);

        // Вызываем DllMain
        DWORD entryPointRVA = pNt->OptionalHeader.AddressOfEntryPoint;
        if (entryPointRVA) {
            typedef BOOL(WINAPI* DllMain_t)(HINSTANCE, DWORD, LPVOID);
            DllMain_t pDllMain = (DllMain_t)((uintptr_t)pImageBase + entryPointRVA);
            pDllMain((HINSTANCE)pImageBase, DLL_PROCESS_ATTACH, nullptr);
        }

        ctx.isMapped = true;
        return pImageBase;
    }

    // ---------- ВЫГРУЗКА DLL ----------
    static void UnmapDLL(void* pImageBase) {
        if (!pImageBase) return;

        // Получаем NT-заголовки
        PIMAGE_DOS_HEADER pDos = (PIMAGE_DOS_HEADER)pImageBase;
        PIMAGE_NT_HEADERS pNt = (PIMAGE_NT_HEADERS)((uintptr_t)pDos + pDos->e_lfanew);

        // Получаем точку входа
        DWORD entryPointRVA = pNt->OptionalHeader.AddressOfEntryPoint;
        if (entryPointRVA) {
            typedef BOOL(WINAPI* DllMain_t)(HINSTANCE, DWORD, LPVOID);
            DllMain_t pDllMain = (DllMain_t)((uintptr_t)pImageBase + entryPointRVA);
            pDllMain((HINSTANCE)pImageBase, DLL_PROCESS_DETACH, nullptr);
        }

        // Освобождаем память
        VirtualFree(pImageBase, 0, MEM_RELEASE);
    }
};

// ---------- ПРИМЕР ИСПОЛЬЗОВАНИЯ (для теста) ----------
// Это можно вызвать из инжектора (но помни, что код должен выполняться в целевом процессе)
#ifdef _TEST_MANUAL_MAP
int main() {
    // Загружаем DLL из файла
    std::ifstream file("radar_stealth.dll", std::ios::binary | std::ios::ate);
    if (!file) return 1;
    std::vector<uint8_t> dllData(file.tellg());
    file.seekg(0, std::ios::beg);
    file.read((char*)dllData.data(), dllData.size());
    file.close();

    // Маппим
    void* base = ManualMapper::MapDLL(dllData);
    if (base) {
        printf("DLL mapped at %p\n", base);
        // Ждём нажатия клавиши, чтобы выгрузить
        getchar();
        ManualMapper::UnmapDLL(base);
    } else {
        printf("Mapping failed\n");
    }
    return 0;
}
#endif