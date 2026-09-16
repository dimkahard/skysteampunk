// RadarServer.cpp
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <cstdio>
#include <vector>
#include <thread>
#include <chrono>
#include <mutex>
#include <string>
#include <sstream>
#include <atomic>
#include <limits>
#include <random>

#include "MemoryReaderDriver.h"
#include "MemoryReader.h"
#include "Offsets.h"

#pragma comment(lib, "ws2_32.lib")

constexpr int HTTP_PORT = 8080;
constexpr int MAX_CLIENTS = 10;
constexpr int BUFFER_SIZE = 8192;

static std::string g_AuthToken;

static std::random_device g_rd;
static std::mt19937 g_gen(g_rd());
static std::uniform_int_distribution<> g_delayDist(10, 30);
static std::uniform_int_distribution<> g_showChance(0, 100);
static std::uniform_int_distribution<> g_noiseDist(-100, 100);

static IMemoryReader* g_reader = nullptr;
static std::atomic<bool> g_running = true;
static std::mutex g_dataMutex;
static std::string g_lastJsonData = "{}";
static bool g_hasData = false;

BOOL WINAPI CtrlHandler(DWORD fdwCtrlType) {
    if (fdwCtrlType == CTRL_C_EVENT || fdwCtrlType == CTRL_CLOSE_EVENT) {
        g_running = false;
        return TRUE;
    }
    return FALSE;
}

std::string GenerateToken() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    const char* hex = "0123456789ABCDEF";
    std::string token;
    for (int i = 0; i < 32; ++i) token += hex[dis(gen)];
    return token;
}

template <typename T>
bool IsFinite(T v) {
    return v == v && v != std::numeric_limits<T>::infinity() && v != -std::numeric_limits<T>::infinity();
}

void AppendVec3(std::stringstream& ss, const Vec3& v, const char* name) {
    ss << "\"" << name << "\":{";
    ss << "\"x\":" << (IsFinite(v.x) ? v.x : 0.0f) << ",";
    ss << "\"y\":" << (IsFinite(v.y) ? v.y : 0.0f) << ",";
    ss << "\"z\":" << (IsFinite(v.z) ? v.z : 0.0f) << "}";
}

std::string BuildJsonData() {
    if (!g_reader || !g_hasData) return "{}";
    std::lock_guard<std::mutex> lock(g_dataMutex);
    return g_lastJsonData;
}

DWORD WINAPI UpdateThread(LPVOID) {
    while (g_running) {
        if (g_reader) {
            Vec3 localOrigin;
            float localYaw;
            int localTeam;

            if (g_reader->ReadLocalPlayer(localOrigin, localYaw, localTeam)) {
                auto enemies = g_reader->ReadEnemies(localTeam);

                int extraDelay = g_delayDist(g_gen);
                std::this_thread::sleep_for(std::chrono::milliseconds(extraDelay));

                std::vector<PlayerData> filtered;
                for (auto& e : enemies) {
                    if (g_showChance(g_gen) < 70) {
                        e.origin.x += (g_noiseDist(g_gen) % 50) * 0.1f;
                        e.origin.y += (g_noiseDist(g_gen) % 50) * 0.1f;
                        filtered.push_back(e);
                    }
                }

                int baseInterval = 0;
                if (filtered.empty()) {
                    baseInterval = 80;
                } else if (filtered.size() < 3) {
                    baseInterval = 30;
                } else {
                    baseInterval = 10;
                }

                bool gunshot = (rand() % 100 < 5);
                if (gunshot) baseInterval += 100 + (rand() % 101);

                bool moving = (rand() % 100 < 30);
                if (moving) baseInterval += 20 + (rand() % 31);

                if (baseInterval < 10) baseInterval = 10;
                if (baseInterval > 300) baseInterval = 300;

                int jitter = (rand() % 11) - 5;
                int finalInterval = baseInterval + jitter;
                if (finalInterval < 5) finalInterval = 5;

                if (rand() % 100 < 5) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(200 + rand() % 100));
                    continue;
                }

                std::stringstream json;
                json << "{";
                AppendVec3(json, localOrigin, "localOrigin");
                json << ",\"localYaw\":" << localYaw;
                json << ",\"localTeam\":" << localTeam;
                json << ",\"playerCount\":" << filtered.size() << ",";
                json << "\"players\":[";
                for (size_t i = 0; i < filtered.size(); ++i) {
                    if (i > 0) json << ",";
                    const auto& p = filtered[i];
                    json << "{";
                    AppendVec3(json, p.origin, "origin");
                    json << ",\"alive\":" << (p.alive ? "true" : "false");
                    json << ",\"team\":" << p.team;
                    json << "}";
                }
                json << "]}";

                {
                    std::lock_guard<std::mutex> lock(g_dataMutex);
                    g_lastJsonData = json.str();
                    g_hasData = true;
                }

                std::this_thread::sleep_for(std::chrono::milliseconds(finalInterval));
            }
        }
    }
    return 0;
}

void RunHttpServer() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        printf("[!] WSAStartup failed\n");
        return;
    }

    SOCKET listenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (listenSocket == INVALID_SOCKET) {
        printf("[!] socket failed\n");
        WSACleanup();
        return;
    }

    int opt = 1;
    setsockopt(listenSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));

    sockaddr_in serverAddr = {};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(HTTP_PORT);
    serverAddr.sin_addr.s_addr = INADDR_ANY;

    if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        printf("[!] bind failed: %d\n", WSAGetLastError());
        closesocket(listenSocket);
        WSACleanup();
        return;
    }

    if (listen(listenSocket, MAX_CLIENTS) == SOCKET_ERROR) {
        printf("[!] listen failed\n");
        closesocket(listenSocket);
        WSACleanup();
        return;
    }

    printf("[+] HTTP server started on port %d\n", HTTP_PORT);
    printf("[+] Open http://<your-ip>:%d on your iPhone\n", HTTP_PORT);
    printf("[+] Token (use ?token=...): %s\n", g_AuthToken.c_str());

    fd_set masterSet, readSet;
    FD_ZERO(&masterSet);
    FD_SET(listenSocket, &masterSet);
    SOCKET maxFd = listenSocket;
    std::vector<SOCKET> clientSockets;

    while (g_running) {
        readSet = masterSet;
        timeval tv = { 1, 0 };
        int activity = select(maxFd + 1, &readSet, nullptr, nullptr, &tv);
        if (activity == SOCKET_ERROR) {
            printf("[!] select error: %d\n", WSAGetLastError());
            break;
        }

        if (FD_ISSET(listenSocket, &readSet)) {
            sockaddr_in clientAddr;
            int addrLen = sizeof(clientAddr);
            SOCKET client = accept(listenSocket, (sockaddr*)&clientAddr, &addrLen);
            if (client != INVALID_SOCKET) {
                if (clientSockets.size() < MAX_CLIENTS) {
                    FD_SET(client, &masterSet);
                    if (client > maxFd) maxFd = client;
                    clientSockets.push_back(client);
                    char ipStr[INET_ADDRSTRLEN];
                    inet_ntop(AF_INET, &clientAddr.sin_addr, ipStr, sizeof(ipStr));
                    printf("[+] Client from %s\n", ipStr);
                } else {
                    closesocket(client);
                }
            }
        }

        for (auto it = clientSockets.begin(); it != clientSockets.end(); ) {
            SOCKET sock = *it;
            if (FD_ISSET(sock, &readSet)) {
                char buffer[BUFFER_SIZE];
                int recvLen = recv(sock, buffer, sizeof(buffer) - 1, 0);
                if (recvLen <= 0) {
                    FD_CLR(sock, &masterSet);
                    closesocket(sock);
                    it = clientSockets.erase(it);
                    continue;
                }
                buffer[recvLen] = '\0';

                char method[16] = {0};
                char path[256] = {0};
                if (sscanf_s(buffer, "%15s %255s", method, (unsigned)sizeof(method), path, (unsigned)sizeof(path)) < 2) {
                    const char* bad = "HTTP/1.1 400 Bad Request\r\n\r\n";
                    send(sock, bad, (int)strlen(bad), 0);
                    FD_CLR(sock, &masterSet);
                    closesocket(sock);
                    it = clientSockets.erase(it);
                    continue;
                }

                bool authOk = false;
                const char* tokenPos = strstr(path, "token=");
                if (tokenPos) {
                    char tokenBuf[128] = {0};
                    sscanf_s(tokenPos + 6, "%127s", tokenBuf, (unsigned)sizeof(tokenBuf));
                    char* amp = strchr(tokenBuf, '&');
                    if (amp) *amp = '\0';
                    if (strcmp(tokenBuf, g_AuthToken.c_str()) == 0) authOk = true;
                }

                std::string response;
                if (!authOk) {
                    response = "HTTP/1.1 401 Unauthorized\r\n";
                    response += "Content-Type: text/plain\r\n";
                    response += "Content-Length: 13\r\n";
                    response += "Connection: close\r\n\r\n";
                    response += "Invalid token";
                } else if (strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0) {
                    const char* html_template =
                        "<!DOCTYPE html>"
                        "<html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                        "<title>CS2 Radar</title>"
                        "<style>body{margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh;}"
                        "canvas{display:block;background:black;border:1px solid #333;}</style>"
                        "</head>"
                        "<body>"
                        "<canvas id='radar' width='600' height='600'></canvas>"
                        "<script>"
                        "const canvas=document.getElementById('radar');const ctx=canvas.getContext('2d');"
                        "const CX=300,CY=300,RADIUS=250,SCALE=0.25,MAX_RANGE=1000;"
                        "function worldToRadar(localPos,localYaw,enemyPos){"
                        "   let dx=enemyPos.x-localPos.x;let dy=enemyPos.y-localPos.y;"
                        "   let theta=-localYaw*Math.PI/180;"
                        "   let c=Math.cos(theta);let s=Math.sin(theta);"
                        "   let rx=dx*c-dy*s;let ry=dx*s+dy*c;"
                        "   let dist=Math.sqrt(rx*rx+ry*ry);let visible=true;"
                        "   if(dist>MAX_RANGE&&dist>0.0001){rx*=MAX_RANGE/dist;ry*=MAX_RANGE/dist;visible=false;}"
                        "   return{x:CX+rx*SCALE,y:CY+ry*SCALE,visible:visible};}"
                        "function fetchData(){"
                        "   fetch('/data?token=TOKEN_PLACEHOLDER')"
                        "       .then(r=>{if(!r.ok)throw new Error('Auth failed');return r.json();})"
                        "       .then(data=>{"
                        "           ctx.clearRect(0,0,canvas.width,canvas.height);"
                        "           ctx.strokeStyle='white';ctx.lineWidth=2;"
                        "           ctx.beginPath();ctx.arc(CX,CY,RADIUS,0,2*Math.PI);ctx.stroke();"
                        "           ctx.beginPath();ctx.moveTo(CX-12,CY);ctx.lineTo(CX+12,CY);"
                        "           ctx.moveTo(CX,CY-12);ctx.lineTo(CX,CY+12);ctx.stroke();"
                        "           if(data.playerCount>0){"
                        "               for(let i=0;i<data.playerCount;i++){"
                        "                   const p=data.players[i];"
                        "                   const pt=worldToRadar(data.localOrigin,data.localYaw,p.origin);"
                        "                   ctx.fillStyle=pt.visible?'red':'#800000';"
                        "                   ctx.beginPath();ctx.arc(pt.x,pt.y,4,0,2*Math.PI);ctx.fill();"
                        "               }"
                        "           }else{"
                        "               ctx.fillStyle='yellow';ctx.font='16px Arial';"
                        "               ctx.fillText('Waiting for game...',CX-90,CY+45);"
                        "           }"
                        "       }).catch(e=>console.error(e));}"
                        "setInterval(fetchData,100);fetchData();"
                        "</script></body></html>";
                    std::string html = html_template;
                    size_t pos = html.find("TOKEN_PLACEHOLDER");
                    if (pos != std::string::npos)
                        html.replace(pos, 16, g_AuthToken);
                    response = "HTTP/1.1 200 OK\r\n";
                    response += "Content-Type: text/html\r\n";
                    response += "Content-Length: " + std::to_string(html.size()) + "\r\n";
                    response += "Connection: close\r\n\r\n";
                    response += html;
                } else if (strcmp(path, "/data") == 0) {
                    std::string json = BuildJsonData();
                    response = "HTTP/1.1 200 OK\r\n";
                    response += "Content-Type: application/json\r\n";
                    response += "Content-Length: " + std::to_string(json.size()) + "\r\n";
                    response += "Connection: close\r\n\r\n";
                    response += json;
                } else {
                    response = "HTTP/1.1 404 Not Found\r\n";
                    response += "Content-Length: 9\r\n";
                    response += "Connection: close\r\n\r\n";
                    response += "Not Found";
                }

                size_t totalSent = 0;
                while (totalSent < response.size()) {
                    int sent = send(sock, response.c_str() + totalSent, (int)(response.size() - totalSent), 0);
                    if (sent == SOCKET_ERROR) break;
                    totalSent += sent;
                }
                FD_CLR(sock, &masterSet);
                closesocket(sock);
                it = clientSockets.erase(it);
            } else {
                ++it;
            }
        }
    }

    for (SOCKET s : clientSockets) closesocket(s);
    closesocket(listenSocket);
    WSACleanup();
}

int main() {
    SetConsoleCtrlHandler(CtrlHandler, TRUE);
    g_AuthToken = GenerateToken();

    // Загружаем оффсеты из файла
    if (!CS2Offsets::LoadFromFile("offsets.ini")) {
        printf("[!] Failed to load offsets.ini, using defaults.\n");
    } else {
        printf("[+] Offsets loaded from offsets.ini\n");
    }

    MemoryReaderDriver reader;
    g_reader = &reader;
    if (!g_reader->Connect()) {
        printf("[!] Failed to connect. Make sure driver is loaded and CS2 is running.\n");
        return 1;
    }
    printf("[+] Connected to CS2 via driver.\n");

    HANDLE hUpdate = CreateThread(nullptr, 0, UpdateThread, nullptr, 0, nullptr);
    if (!hUpdate) {
        g_reader->Disconnect();
        printf("[!] Failed to create update thread.\n");
        return 1;
    }

    RunHttpServer();

    g_running = false;
    WaitForSingleObject(hUpdate, 3000);
    CloseHandle(hUpdate);
    g_reader->Disconnect();

    // Корректное завершение: выгружаем драйвер
    printf("[+] Shutting down driver...\n");
    system("sc stop MemoryDriver 2>nul");
    system("sc delete MemoryDriver 2>nul");

    return 0;
}