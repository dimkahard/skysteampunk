// MemoryDriver.h
#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#define DEVICE_NAME L"\\Device\\MemoryDriver"
#define SYMLINK_NAME L"\\DosDevices\\MemoryDriver"

#define IOCTL_GET_DYNAMIC_IOCTL \
    CTL_CODE(FILE_DEVICE_UNKNOWN, 0x801, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_GET_ENCRYPTION_KEY \
    CTL_CODE(FILE_DEVICE_UNKNOWN, 0x802, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_SET_ENCRYPTION_KEY \
    CTL_CODE(FILE_DEVICE_UNKNOWN, 0x803, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define CMD_READ_MEMORY         1
#define CMD_GET_MODULE_BASE     2

typedef struct _MEMORY_REQUEST {
    ULONG Command;
    HANDLE ProcessId;
    union {
        struct {
            ULONG64 Address;
            ULONG Size;
        } Read;
        struct {
            WCHAR ModuleName[64];
            ULONG64 BaseAddress;
        } Module;
    };
} MEMORY_REQUEST;

#ifdef __cplusplus
}
#endif