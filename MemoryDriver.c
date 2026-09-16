// MemoryDriver.c
#include <ntddk.h>
#include <wdm.h>
#include <ntstrsafe.h>
#include <stdlib.h>
#include <ntintsafe.h>
#include "MemoryDriver.h"
#include "../common/obfuscate.h"

static PDEVICE_OBJECT g_DeviceObject = NULL;
static UNICODE_STRING g_DevName, g_SymLink;
static ULONG g_DynamicIoctlCode = 0;
static HANDLE g_AllowedCallerPid = NULL;

static UCHAR g_XorKey[16] = {0};

// ---------- ГЕНЕРАЦИЯ КЛЮЧА ----------
VOID GenerateXorKey() {
    LARGE_INTEGER perf = KeQueryPerformanceCounter();
    srand((ULONG)(perf.LowPart ^ perf.HighPart));
    for (int i = 0; i < 16; ++i) {
        g_XorKey[i] = (UCHAR)(rand() % 256);
    }
}

// ---------- ШИФРОВАНИЕ/ДЕШИФРОВАНИЕ (XOR) ----------
VOID XorBuffer(PVOID Buffer, SIZE_T Size) {
    UCHAR* p = (UCHAR*)Buffer;
    for (SIZE_T i = 0; i < Size; ++i) {
        p[i] ^= g_XorKey[i % 16];
    }
}

// ---------- АНТИ-ОТЛАДКА ----------
BOOLEAN IsDebuggerPresent() {
    return (BOOLEAN)(KdDebuggerEnabled != 0);
}

// ---------- ПРОВЕРКА ВЫЗЫВАЮЩЕГО (по имени процесса) ----------
BOOLEAN IsAllowedCaller(HANDLE CallerPid) {
    // Получаем EPROCESS вызывающего
    PEPROCESS pCaller = NULL;
    if (!NT_SUCCESS(PsLookupProcessByProcessId(CallerPid, &pCaller)))
        return FALSE;

    // Получаем имя процесса
    PCHAR imageName = PsGetProcessImageFileName(pCaller);
    if (!imageName) {
        ObDereferenceObject(pCaller);
        return FALSE;
    }

    // Проверяем, что имя процесса содержит "RadarServer.exe" или "injector.exe"
    BOOLEAN allowed = FALSE;
    if (strstr(imageName, "RadarServer.exe") || strstr(imageName, "injector.exe")) {
        allowed = TRUE;
    }

    ObDereferenceObject(pCaller);
    return allowed;
}

// ---------- СКРЫТИЕ ДРАЙВЕРА ----------
VOID HideDriver() {
    PLIST_ENTRY pLoadListHead = &PsLoadedModuleList;
    PLIST_ENTRY pEntry = pLoadListHead->Flink;
    while (pEntry != pLoadListHead) {
        LDR_DATA_TABLE_ENTRY* pModule = CONTAINING_RECORD(pEntry, LDR_DATA_TABLE_ENTRY, InLoadOrderLinks);
        UNICODE_STRING usName;
        RtlInitUnicodeString(&usName, L"MemoryDriver.sys");
        if (RtlCompareUnicodeString(&pModule->BaseDllName, &usName, TRUE) == 0) {
            pEntry->Flink->Blink = pEntry->Blink;
            pEntry->Blink->Flink = pEntry->Flink;
            PLIST_ENTRY pMemoryEntry = &pModule->InMemoryOrderLinks;
            pMemoryEntry->Flink->Blink = pMemoryEntry->Blink;
            pMemoryEntry->Blink->Flink = pMemoryEntry->Flink;
            PLIST_ENTRY pInitEntry = &pModule->InInitializationOrderLinks;
            pInitEntry->Flink->Blink = pInitEntry->Blink;
            pInitEntry->Blink->Flink = pInitEntry->Flink;
            break;
        }
        pEntry = pEntry->Flink;
    }

    UNICODE_STRING symLink;
    RtlInitUnicodeString(&symLink, SYMLINK_NAME);
    IoDeleteSymbolicLink(&symLink);
}

// ---------- ЧТЕНИЕ ПАМЯТИ ----------
NTSTATUS ReadProcessMemory(HANDLE ProcessId, ULONG64 Address, PVOID Buffer, ULONG Size, PULONG BytesRead) {
    PEPROCESS pProcess = NULL;
    NTSTATUS status = PsLookupProcessByProcessId(ProcessId, &pProcess);
    if (!NT_SUCCESS(status)) return status;

    KAPC_STATE apcState;
    KeStackAttachProcess(pProcess, &apcState);

    __try {
        if (Address < (ULONG64)MM_LOWEST_USER_ADDRESS || 
            Address + Size > (ULONG64)MM_HIGHEST_USER_ADDRESS) {
            status = STATUS_ACCESS_VIOLATION;
            *BytesRead = 0;
        } else {
            ProbeForRead((PVOID)Address, Size, sizeof(CHAR));
            RtlCopyMemory(Buffer, (PVOID)Address, Size);
            status = STATUS_SUCCESS;
            *BytesRead = Size;
        }
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        status = GetExceptionCode();
        *BytesRead = 0;
    }

    KeUnstackDetachProcess(&apcState);
    ObDereferenceObject(pProcess);
    return status;
}

// ---------- ПОЛУЧЕНИЕ БАЗЫ МОДУЛЯ ----------
NTSTATUS GetModuleBaseAddress(HANDLE ProcessId, PCWSTR ModuleName, ULONG64* BaseAddress) {
    PEPROCESS pProcess = NULL;
    NTSTATUS status = PsLookupProcessByProcessId(ProcessId, &pProcess);
    if (!NT_SUCCESS(status)) return status;

    KAPC_STATE apcState;
    KeStackAttachProcess(pProcess, &apcState);

    __try {
        *BaseAddress = 0;
        PPEB pPeb = PsGetProcessPeb(pProcess);
        if (pPeb) {
            PPEB_LDR_DATA pLdr = pPeb->Ldr;
            if (pLdr) {
                PLIST_ENTRY pListHead = &pLdr->InLoadOrderModuleList;
                PLIST_ENTRY pEntry = pListHead->Flink;
                while (pEntry != pListHead) {
                    LDR_DATA_TABLE_ENTRY* pModule = CONTAINING_RECORD(pEntry, LDR_DATA_TABLE_ENTRY, InLoadOrderLinks);
                    if (pModule->FullDllName.Buffer) {
                        UNICODE_STRING usModuleName;
                        RtlInitUnicodeString(&usModuleName, ModuleName);
                        if (RtlCompareUnicodeString(&pModule->BaseDllName, &usModuleName, TRUE) == 0) {
                            *BaseAddress = (ULONG64)pModule->DllBase;
                            break;
                        }
                    }
                    pEntry = pEntry->Flink;
                }
            }
        }
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        status = GetExceptionCode();
    }

    KeUnstackDetachProcess(&apcState);
    ObDereferenceObject(pProcess);
    return (*BaseAddress != 0) ? STATUS_SUCCESS : STATUS_NOT_FOUND;
}

// ---------- ОБРАБОТЧИК IOCTL ----------
NTSTATUS DeviceIoControl(PDEVICE_OBJECT DeviceObject, PIRP Irp) {
    PIO_STACK_LOCATION pStack = IoGetCurrentIrpStackLocation(Irp);
    NTSTATUS status = STATUS_SUCCESS;
    ULONG bytesReturned = 0;
    ULONG ioctlCode = pStack->Parameters.DeviceIoControl.IoControlCode;

    if (IsDebuggerPresent()) {
        Irp->IoStatus.Status = STATUS_DEBUGGER_INACTIVE;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return STATUS_DEBUGGER_INACTIVE;
    }

    PEPROCESS callerProcess = IoGetCurrentProcess();
    HANDLE callerPid = PsGetProcessId(callerProcess);
    if (!IsAllowedCaller(callerPid)) {
        Irp->IoStatus.Status = STATUS_ACCESS_DENIED;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return STATUS_ACCESS_DENIED;
    }

    ULONG inputLen = pStack->Parameters.DeviceIoControl.InputBufferLength;
    ULONG outputLen = pStack->Parameters.DeviceIoControl.OutputBufferLength;

    if (ioctlCode == IOCTL_GET_DYNAMIC_IOCTL) {
        if (outputLen >= sizeof(ULONG)) {
            *(PULONG)Irp->AssociatedIrp.SystemBuffer = g_DynamicIoctlCode;
            bytesReturned = sizeof(ULONG);
            status = STATUS_SUCCESS;
        } else {
            status = STATUS_BUFFER_TOO_SMALL;
        }
        Irp->IoStatus.Status = status;
        Irp->IoStatus.Information = bytesReturned;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return status;
    }

    if (ioctlCode == IOCTL_GET_ENCRYPTION_KEY) {
        if (outputLen >= sizeof(g_XorKey)) {
            RtlCopyMemory(Irp->AssociatedIrp.SystemBuffer, g_XorKey, sizeof(g_XorKey));
            bytesReturned = sizeof(g_XorKey);
            status = STATUS_SUCCESS;
        } else {
            status = STATUS_BUFFER_TOO_SMALL;
        }
        Irp->IoStatus.Status = status;
        Irp->IoStatus.Information = bytesReturned;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return status;
    }

    if (ioctlCode == IOCTL_SET_ENCRYPTION_KEY) {
        if (inputLen >= sizeof(g_XorKey)) {
            RtlCopyMemory(g_XorKey, Irp->AssociatedIrp.SystemBuffer, sizeof(g_XorKey));
            bytesReturned = 0;
            status = STATUS_SUCCESS;
        } else {
            status = STATUS_BUFFER_TOO_SMALL;
        }
        Irp->IoStatus.Status = status;
        Irp->IoStatus.Information = bytesReturned;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return status;
    }

    if (ioctlCode != g_DynamicIoctlCode) {
        Irp->IoStatus.Status = STATUS_INVALID_DEVICE_REQUEST;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return STATUS_INVALID_DEVICE_REQUEST;
    }

    // Основной IOCTL
    if (inputLen < sizeof(MEMORY_REQUEST)) {
        Irp->IoStatus.Status = STATUS_BUFFER_TOO_SMALL;
        IoCompleteRequest(Irp, IO_NO_INCREMENT);
        return STATUS_BUFFER_TOO_SMALL;
    }

    MEMORY_REQUEST* pReq = (MEMORY_REQUEST*)Irp->AssociatedIrp.SystemBuffer;
    XorBuffer(pReq, sizeof(MEMORY_REQUEST));

    switch (pReq->Command) {
        case CMD_READ_MEMORY: {
            if (pReq->Read.Size > 1024 * 1024) {
                status = STATUS_INVALID_PARAMETER;
                break;
            }
            ULONG neededSize = sizeof(MEMORY_REQUEST) + pReq->Read.Size;
            if (inputLen < neededSize || outputLen < neededSize) {
                status = STATUS_BUFFER_TOO_SMALL;
                break;
            }
            ULONG bytesRead = 0;
            status = ReadProcessMemory(pReq->ProcessId, pReq->Read.Address,
                                       (PVOID)((ULONG_PTR)pReq + sizeof(MEMORY_REQUEST)),
                                       pReq->Read.Size, &bytesRead);
            if (NT_SUCCESS(status)) {
                bytesReturned = neededSize;
                XorBuffer(pReq, bytesReturned);
            }
            break;
        }
        case CMD_GET_MODULE_BASE: {
            if (inputLen < sizeof(MEMORY_REQUEST) || outputLen < sizeof(MEMORY_REQUEST)) {
                status = STATUS_BUFFER_TOO_SMALL;
                break;
            }
            ULONG64 base = 0;
            status = GetModuleBaseAddress(pReq->ProcessId, pReq->Module.ModuleName, &base);
            if (NT_SUCCESS(status)) {
                pReq->Module.BaseAddress = base;
                bytesReturned = sizeof(MEMORY_REQUEST);
                XorBuffer(pReq, bytesReturned);
            }
            break;
        }
        default:
            status = STATUS_INVALID_PARAMETER;
            break;
    }

    Irp->IoStatus.Status = status;
    Irp->IoStatus.Information = bytesReturned;
    IoCompleteRequest(Irp, IO_NO_INCREMENT);
    return status;
}

NTSTATUS CreateClose(PDEVICE_OBJECT DeviceObject, PIRP Irp) {
    Irp->IoStatus.Status = STATUS_SUCCESS;
    IoCompleteRequest(Irp, IO_NO_INCREMENT);
    return STATUS_SUCCESS;
}

VOID DriverUnload(PDRIVER_OBJECT DriverObject) {
    if (g_DeviceObject) {
        IoDeleteDevice(g_DeviceObject);
    }
}

NTSTATUS DriverEntry(PDRIVER_OBJECT DriverObject, PUNICODE_STRING RegistryPath) {
    if (IsDebuggerPresent()) {
        return STATUS_DEBUGGER_INACTIVE;
    }

    GenerateXorKey();

    LARGE_INTEGER perf = KeQueryPerformanceCounter();
    ULONG seed = (ULONG)(perf.LowPart ^ perf.HighPart);
    srand(seed);
    g_DynamicIoctlCode = CTL_CODE(FILE_DEVICE_UNKNOWN, (rand() % 0xFFF) + 0x800, METHOD_BUFFERED, FILE_ANY_ACCESS);

    RtlInitUnicodeString(&g_DevName, DEVICE_NAME);
    RtlInitUnicodeString(&g_SymLink, SYMLINK_NAME);

    NTSTATUS status = IoCreateDevice(DriverObject, 0, &g_DevName, FILE_DEVICE_UNKNOWN,
                                     0, FALSE, &g_DeviceObject);
    if (!NT_SUCCESS(status)) return status;

    status = IoCreateSymbolicLink(&g_SymLink, &g_DevName);
    if (!NT_SUCCESS(status)) {
        IoDeleteDevice(g_DeviceObject);
        return status;
    }

    HideDriver();

    DriverObject->MajorFunction[IRP_MJ_CREATE] = CreateClose;
    DriverObject->MajorFunction[IRP_MJ_CLOSE] = CreateClose;
    DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DeviceIoControl;
    DriverObject->DriverUnload = DriverUnload;

    DbgPrint("[MemoryDriver] Loaded.\n");
    return STATUS_SUCCESS;
}