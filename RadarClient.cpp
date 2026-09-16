// RadarClient.cpp
// Запускается на втором ПК. Принимает данные по UDP и рисует радар через GDI.

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <cstdio>
#include <thread>
#include <chrono>
#include <mutex>
#include <cmath>

#include "../RadarShared.h"

#pragma comment(lib, "ws2_32.lib")

// ---------- ГЛОБАЛЬНЫЕ ДАННЫЕ ----------
static RadarPacket g_packet = {};
static std::mutex g_mutex;
static bool g_hasData = false;
static HWND g_hwnd = nullptr;
static HBRUSH g_bgBrush = nullptr;

// ---------- ПРЕОБРАЗОВАНИЕ КООРДИНАТ ----------
struct RadarPoint {
    float x, y;
    bool visible;
};

RadarPoint WorldToRadar(const Vec3& localPos, float localYaw,
                        const Vec3& enemyPos, float centerX, float centerY,
                        float scale, float maxRange) {
    float dx = enemyPos.x - localPos.x;
    float dy = enemyPos.y - localPos.y;
    float theta = -localYaw;
    float c = std::cos(theta);
    float s = std::sin(theta);
    float rx = dx * c - dy * s;
    float ry = dx * s + dy * c;
    float dist = std::sqrt(rx*rx + ry*ry);
    RadarPoint pt;
    if (dist > maxRange && dist > 0.0001f) {
        rx *= maxRange / dist;
        ry *= maxRange / dist;
        pt.visible = false;
    } else {
        pt.visible = true;
    }
    pt.x = centerX + rx * scale;
    pt.y = centerY + ry * scale;
    return pt;
}

// ---------- ОТРИСОВКА ----------
void DrawRadar(HDC hdc) {
    if (!g_hasData) {
        // Ждём данные
        SetBkMode(hdc, TRANSPARENT);
        SetTextColor(hdc, RGB(255, 200, 0));
        TextOutA(hdc, 250, 280, "Waiting for server...", 21);
        return;
    }

    RadarPacket packet;
    {
        std::lock_guard<std::mutex> lk(g_mutex);
        packet = g_packet;
    }

    constexpr int CX = 300, CY = 300, RADIUS = 250;
    constexpr float SCALE = 0.25f;
    constexpr float MAX_RANGE = 1000.0f;

    // Рисуем круг
    HPEN whitePen = CreatePen(PS_SOLID, 2, RGB(255, 255, 255));
    HPEN oldPen = (HPEN)SelectObject(hdc, whitePen);
    HBRUSH oldBr = (HBRUSH)SelectObject(hdc, GetStockObject(NULL_BRUSH));
    Ellipse(hdc, CX - RADIUS, CY - RADIUS, CX + RADIUS, CY + RADIUS);

    // Крест в центре
    MoveToEx(hdc, CX - 12, CY, nullptr); LineTo(hdc, CX + 12, CY);
    MoveToEx(hdc, CX, CY - 12, nullptr); LineTo(hdc, CX, CY + 12);

    // Точки врагов
    HBRUSH redBrush = CreateSolidBrush(RGB(255, 0, 0));
    HBRUSH dimBrush = CreateSolidBrush(RGB(120, 0, 0));
    SelectObject(hdc, GetStockObject(NULL_PEN));

    for (int i = 0; i < packet.playerCount; ++i) {
        const PlayerInfo& p = packet.players[i];
        RadarPoint pt = WorldToRadar(packet.localOrigin, packet.localYaw,
                                     p.origin, CX, CY, SCALE, MAX_RANGE);
        SelectObject(hdc, pt.visible ? redBrush : dimBrush);
        Ellipse(hdc, (int)pt.x - 4, (int)pt.y - 4, (int)pt.x + 4, (int)pt.y + 4);
    }

    DeleteObject(redBrush);
    DeleteObject(dimBrush);

    // Подпись с количеством врагов
    if (packet.playerCount > 0) {
        char buf[64];
        sprintf_s(buf, "Enemies: %d", packet.playerCount);
        SetBkMode(hdc, TRANSPARENT);
        SetTextColor(hdc, RGB(0, 255, 0));
        TextOutA(hdc, CX - 60, CY + RADIUS + 15, buf, (int)strlen(buf));
    }

    SelectObject(hdc, oldPen);
    SelectObject(hdc, oldBr);
    DeleteObject(whitePen);
}

// ---------- ОКОННАЯ ПРОЦЕДУРА ----------
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    switch (msg) {
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);
        // Двойная буферизация
        HDC mem = CreateCompatibleDC(hdc);
        HBITMAP bmp = CreateCompatibleBitmap(hdc, rc.right - rc.left, rc.bottom - rc.top);
        HGDIOBJ oldBmp = SelectObject(mem, bmp);
        FillRect(mem, &rc, g_bgBrush);
        DrawRadar(mem);
        BitBlt(hdc, 0, 0, rc.right - rc.left, rc.bottom - rc.top, mem, 0, 0, SRCCOPY);
        SelectObject(mem, oldBmp);
        DeleteObject(bmp);
        DeleteDC(mem);
        EndPaint(hwnd, &ps);
        return 0;
    }
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProc(hwnd, msg, wp, lp);
}

// ---------- ПОТОК ПРИЁМА ДАННЫХ ----------
DWORD WINAPI ReceiveThread(LPVOID) {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);

    SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (sock == INVALID_SOCKET) return 1;

    sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(12345);
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(sock, (sockaddr*)&addr, sizeof(addr)) == SOCKET_ERROR) {
        closesocket(sock);
        WSACleanup();
        return 1;
    }

    while (true) {
        RadarPacket packet;
        int received = recv(sock, (char*)&packet, sizeof(packet), 0);
        if (received == sizeof(packet)) {
            std::lock_guard<std::mutex> lk(g_mutex);
            g_packet = packet;
            g_hasData = true;
            // Просим перерисовать окно
            if (g_hwnd) InvalidateRect(g_hwnd, NULL, FALSE);
        }
    }

    closesocket(sock);
    WSACleanup();
    return 0;
}

// ---------- ТОЧКА ВХОДА ----------
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int) {
    // Создаём прозрачное окно
    WNDCLASSEXA wc = {};
    wc.cbSize = sizeof(wc);
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = "RadarClient";
    wc.hbrBackground = CreateSolidBrush(RGB(0, 0, 0));
    RegisterClassExA(&wc);

    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);

    g_hwnd = CreateWindowExA(
        WS_EX_TOPMOST | WS_EX_TRANSPARENT | WS_EX_LAYERED |
        WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
        "RadarClient", "Radar", WS_POPUP,
        0, 0, screenW, screenH,
        nullptr, nullptr, hInstance, nullptr);

    SetLayeredWindowAttributes(g_hwnd, RGB(0, 0, 0), 0, LWA_COLORKEY);
    ShowWindow(g_hwnd, SW_SHOW);
    UpdateWindow(g_hwnd);

    g_bgBrush = CreateSolidBrush(RGB(0, 0, 0));

    // Запускаем поток приёма
    CreateThread(nullptr, 0, ReceiveThread, nullptr, 0, nullptr);

    // Основной цикл сообщений
    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    if (g_bgBrush) DeleteObject(g_bgBrush);
    return 0;
}