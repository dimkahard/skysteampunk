#include "common.h"
#include <thread>
#include <chrono>

static HWND g_overlayHwnd = nullptr;
static HBRUSH g_bgBrush = nullptr;

void DrawRadar(HDC hdc) {
    int cx = RADAR_CENTER_X, cy = RADAR_CENTER_Y, radius = RADAR_RADIUS;
    std::vector<RadarPoint> pts;
    bool localValid;
    {
        std::lock_guard<std::mutex> lk(g_mutex);
        pts = g_enemyPoints;
        localValid = g_localValid;
    }

    HPEN whitePen = CreatePen(PS_SOLID, 2, RGB(255, 255, 255));
    HPEN oldPen = (HPEN)SelectObject(hdc, whitePen);
    HBRUSH oldBr = (HBRUSH)SelectObject(hdc, GetStockObject(NULL_BRUSH));
    Ellipse(hdc, cx - radius, cy - radius, cx + radius, cy + radius);
    MoveToEx(hdc, cx - 12, cy, nullptr); LineTo(hdc, cx + 12, cy);
    MoveToEx(hdc, cx, cy - 12, nullptr); LineTo(hdc, cx, cy + 12);

    HBRUSH redBrush = CreateSolidBrush(RGB(255, 0, 0));
    HBRUSH dimBrush = CreateSolidBrush(RGB(120, 0, 0));
    SelectObject(hdc, GetStockObject(NULL_PEN));
    for (const auto& pt : pts) {
        SelectObject(hdc, pt.visible ? redBrush : dimBrush);
        Ellipse(hdc, (int)pt.x - 4, (int)pt.y - 4, (int)pt.x + 4, (int)pt.y + 4);
    }
    DeleteObject(redBrush);
    DeleteObject(dimBrush);

    if (!localValid) {
        SetBkMode(hdc, TRANSPARENT);
        SetTextColor(hdc, RGB(255, 200, 0));
        TextOutA(hdc, cx - 90, cy + 45, "Waiting for game...", 19);
    }
    SelectObject(hdc, oldPen);
    SelectObject(hdc, oldBr);
    DeleteObject(whitePen);
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    switch (msg) {
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        RECT rc;
        GetClientRect(hwnd, &rc);
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

DWORD WINAPI RenderThread(LPVOID) {
    WNDCLASSEXA wc = {};
    wc.cbSize = sizeof(wc);
    wc.lpfnWndProc = WndProc;
    wc.hInstance = GetModuleHandleA(nullptr);
    wc.lpszClassName = "RadarOverlay";
    RegisterClassExA(&wc);

    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);

    g_overlayHwnd = CreateWindowExA(
        WS_EX_TOPMOST | WS_EX_TRANSPARENT | WS_EX_LAYERED |
        WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
        "RadarOverlay", "Radar", WS_POPUP,
        0, 0, screenW, screenH,
        nullptr, nullptr, GetModuleHandleA(nullptr), nullptr);

    SetLayeredWindowAttributes(g_overlayHwnd, RGB(0, 0, 0), 0, LWA_COLORKEY);
    ShowWindow(g_overlayHwnd, SW_SHOW);
    UpdateWindow(g_overlayHwnd);

    g_bgBrush = CreateSolidBrush(RGB(0, 0, 0));

    MSG msg;
    while (g_running) {
        if (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
            if (msg.message == WM_QUIT) break;
        } else {
            InvalidateRect(g_overlayHwnd, NULL, FALSE);
            std::this_thread::sleep_for(std::chrono::milliseconds(1000 / 60));
        }
    }
    if (g_bgBrush) DeleteObject(g_bgBrush);
    if (g_overlayHwnd) DestroyWindow(g_overlayHwnd);
    return 0;
}

void StartRenderThread() {
    CreateThread(nullptr, 0, RenderThread, nullptr, 0, nullptr);
}