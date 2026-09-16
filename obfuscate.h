// obfuscate.h
#pragma once

#include <string.h>

#define OBFUSCATE_KEY 0xAA

// Применяет XOR-шифрование к строке (изменяет на месте)
#define OBFUSCATE(str) _obfuscate(str, sizeof(str))

static inline void _obfuscate(char* str, size_t len) {
    for (size_t i = 0; i < len; ++i) {
        str[i] ^= OBFUSCATE_KEY;
    }
}