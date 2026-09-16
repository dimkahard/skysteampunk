#pragma once
#include <windows.h>

// Структура параметров для удалённого потока
struct MapParams {
    const uint8_t* dllBuffer;
    size_t dllSize;
    void** outBase;
};

// Функция, которая будет вызвана в целевом процессе
DWORD WINAPI RemoteMapThread(LPVOID lpParam);