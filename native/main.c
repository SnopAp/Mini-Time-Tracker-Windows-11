#define UNICODE
#define _UNICODE
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <windowsx.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define WIDGET_WIDTH 290
#define WIDGET_HEIGHT 76

#define TIMER_UI_ID 1001
#define TIMER_ANIM_ID 1002

typedef enum {
    DOCK_FLOATING = 0,
    DOCK_HIDDEN = 1,
    DOCK_OPENING = 2,
    DOCK_VISIBLE = 3,
    DOCK_CLOSING = 4
} DockState;

typedef struct {
    char id[32];
    wchar_t name[64];
    COLORREF color;
} Activity;

// Global State
static BOOL g_isRunning = FALSE;
static BOOL g_isTopmost = TRUE;
static BOOL g_isDocked = FALSE;
static DockState g_dockState = DOCK_FLOATING;
static ULONGLONG g_sessionStartTick = 0;
static time_t g_sessionStartTime = 0;

static Activity g_activities[32];
static int g_activityCount = 0;
static int g_selectedActivity = 0;

static wchar_t g_dataDirPath[MAX_PATH];
static wchar_t g_dataFilePath[MAX_PATH];

static HWND g_hwndMain = NULL;
static HFONT g_hFontTimer = NULL;
static HFONT g_hFontUI = NULL;
static HFONT g_hFontSmall = NULL;

static RECT g_rcPlayBtn = { 240, 28, 276, 64 };
static RECT g_rcPinBtn = { 164, 4, 186, 22 };
static RECT g_rcAddBtn = { 188, 4, 210, 22 };
static RECT g_rcHistoryBtn = { 212, 4, 234, 22 };
static RECT g_rcDockBtn = { 236, 4, 258, 22 };
static RECT g_rcCloseBtn = { 260, 4, 280, 22 };

static BOOL g_isHovered = FALSE;
static int g_leaveDebounceCount = 0;
static int g_currentAnimX = 0;
static int g_targetAnimX = 0;

// Helper: Ensure directory exists in %LOCALAPPDATA%\MiniTimeTracker
static void EnsureDataDir(void) {
    wchar_t localAppData[MAX_PATH];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", localAppData, MAX_PATH);
    if (len > 0 && len < MAX_PATH) {
        wsprintfW(g_dataDirPath, L"%s\\MiniTimeTracker", localAppData);
        CreateDirectoryW(g_dataDirPath, NULL);
        wsprintfW(g_dataFilePath, L"%s\\data.json", g_dataDirPath);
    } else {
        GetTempPathW(MAX_PATH, g_dataDirPath);
        wsprintfW(g_dataFilePath, L"%s\\MiniTimeTracker_data.json", g_dataDirPath);
    }
}

// Format duration HH:MM:SS
static void FormatTime(long totalSec, wchar_t* buffer, size_t maxLen) {
    long h = totalSec / 3600;
    long m = (totalSec % 3600) / 60;
    long s = totalSec % 60;
    _snwprintf(buffer, maxLen, L"%02ld:%02ld:%02ld", h, m, s);
}

// Load data safely from JSON
static void LoadData(void) {
    wcscpy(g_activities[0].name, L"Работа");
    strcpy(g_activities[0].id, "act-work");
    g_activities[0].color = RGB(59, 130, 246);
    g_activityCount = 1;

    FILE* fp = _wfopen(g_dataFilePath, L"rb");
    if (!fp) return;

    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    if (size <= 0) {
        fclose(fp);
        return;
    }

    char* buffer = (char*)malloc(size + 1);
    if (!buffer) {
        fclose(fp);
        return;
    }

    fread(buffer, 1, size, fp);
    buffer[size] = '\0';
    fclose(fp);

    // Simple parsing of activities
    char* actPtr = strstr(buffer, "\"name\":");
    while (actPtr && g_activityCount < 30) {
        char* quote1 = strchr(actPtr + 7, '\"');
        if (quote1) {
            char* quote2 = strchr(quote1 + 1, '\"');
            if (quote2) {
                int len = (int)(quote2 - quote1 - 1);
                if (len > 0 && len < 60) {
                    char tempName[64];
                    strncpy(tempName, quote1 + 1, len);
                    tempName[len] = '\0';

                    wchar_t wName[64];
                    MultiByteToWideChar(CP_UTF8, 0, tempName, -1, wName, 64);

                    BOOL exists = FALSE;
                    for (int i = 0; i < g_activityCount; i++) {
                        if (wcscmp(g_activities[i].name, wName) == 0) {
                            exists = TRUE;
                            break;
                        }
                    }
                    if (!exists) {
                        wcscpy(g_activities[g_activityCount].name, wName);
                        sprintf(g_activities[g_activityCount].id, "act-%d", g_activityCount);
                        g_activities[g_activityCount].color = RGB(16, 185, 129);
                        g_activityCount++;
                    }
                }
            }
        }
        actPtr = strstr(actPtr + 1, "\"name\":");
    }

    free(buffer);
}

// Save data safely (atomic write via temp file)
static void SaveData(void) {
    EnsureDataDir();

    wchar_t tempPath[MAX_PATH];
    wsprintfW(tempPath, L"%s\\data.json.tmp", g_dataDirPath);

    FILE* fp = _wfopen(tempPath, L"wb");
    if (!fp) return;

    fprintf(fp, "{\n  \"schemaVersion\": 1,\n  \"activities\": [\n");
    for (int i = 0; i < g_activityCount; i++) {
        char utf8Name[256];
        WideCharToMultiByte(CP_UTF8, 0, g_activities[i].name, -1, utf8Name, 256, NULL, NULL);
        fprintf(fp, "    { \"id\": \"%s\", \"name\": \"%s\" }%s\n",
            g_activities[i].id, utf8Name, (i == g_activityCount - 1) ? "" : ",");
    }
    fprintf(fp, "  ],\n  \"settings\": {\n    \"isTopmost\": %s,\n    \"isEdgeDocked\": %s\n  }\n}\n",
        g_isTopmost ? "true" : "false", g_isDocked ? "true" : "false");

    fclose(fp);
    MoveFileExW(tempPath, g_dataFilePath, MOVEFILE_REPLACE_EXISTING);
}

// Record finished session
static void SaveSession(long durationSec) {
    wchar_t historyPath[MAX_PATH];
    wsprintfW(historyPath, L"%s\\history.log", g_dataDirPath);

    FILE* fp = _wfopen(historyPath, L"ab");
    if (fp) {
        char utf8Name[256];
        WideCharToMultiByte(CP_UTF8, 0, g_activities[g_selectedActivity].name, -1, utf8Name, 256, NULL, NULL);
        time_t now = time(NULL);
        fprintf(fp, "%ld | %s | %ld sec\n", (long)now, utf8Name, durationSec);
        fclose(fp);
    }
}

// Prompt to add custom activity
static void PromptAddActivity(HWND hWnd) {
    if (g_activityCount < 30) {
        COLORREF colors[] = {
            RGB(59, 130, 246), RGB(16, 185, 129), RGB(139, 92, 246),
            RGB(245, 158, 11), RGB(239, 68, 68), RGB(6, 182, 212), RGB(236, 72, 153)
        };
        _snwprintf(g_activities[g_activityCount].name, 64, L"Активность %d", g_activityCount + 1);
        sprintf(g_activities[g_activityCount].id, "act-%d", g_activityCount);
        g_activities[g_activityCount].color = colors[g_activityCount % 7];
        g_selectedActivity = g_activityCount;
        g_activityCount++;
        SaveData();
        InvalidateRect(hWnd, NULL, TRUE);
        MessageBoxW(hWnd, L"Новая активность создана и выбрана для следующей сессии.", L"Mini Time Tracker", MB_OK | MB_ICONINFORMATION);
    }
}

// Start smooth animation towards target X position
static void StartSlideAnimation(HWND hWnd, int targetX, DockState nextState) {
    RECT rc;
    GetWindowRect(hWnd, &rc);
    g_currentAnimX = rc.left;
    g_targetAnimX = targetX;
    g_dockState = nextState;
    SetTimer(hWnd, TIMER_ANIM_ID, 16, NULL); // ~60 fps smooth step
}

// Edge auto-hide toggle
static void ToggleEdgeDock(HWND hWnd) {
    g_isDocked = !g_isDocked;
    SaveData();

    RECT rcWork;
    SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);

    if (g_isDocked) {
        // Slide to right edge
        int targetX = rcWork.right - 14;
        StartSlideAnimation(hWnd, targetX, DOCK_CLOSING);
    } else {
        // Restore window position
        int targetX = rcWork.right - WIDGET_WIDTH - 20;
        StartSlideAnimation(hWnd, targetX, DOCK_FLOATING);
    }
}

// Show history dialog
static void ShowHistoryDialog(HWND hWnd) {
    wchar_t historyPath[MAX_PATH];
    wsprintfW(historyPath, L"%s\\history.log", g_dataDirPath);
    FILE* fp = _wfopen(historyPath, L"rb");
    if (!fp) {
        MessageBoxW(hWnd, L"Завершённых сессий пока нет.", L"История сессий", MB_OK | MB_ICONINFORMATION);
        return;
    }

    char line[256];
    wchar_t summary[2048] = L"Последние сессии:\n\n";
    int count = 0;
    while (fgets(line, sizeof(line), fp) && count < 8) {
        wchar_t wLine[256];
        MultiByteToWideChar(CP_UTF8, 0, line, -1, wLine, 256);
        wcscat(summary, wLine);
        count++;
    }
    fclose(fp);

    if (count == 0) {
        MessageBoxW(hWnd, L"Завершённых сессий пока нет.", L"История сессий", MB_OK | MB_ICONINFORMATION);
    } else {
        MessageBoxW(hWnd, summary, L"История сессий", MB_OK | MB_ICONINFORMATION);
    }
}

// Window Procedure
static LRESULT CALLBACK WndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE: {
        SetTimer(hWnd, TIMER_UI_ID, 200, NULL);

        HRGN hRgn = CreateRoundRectRgn(0, 0, WIDGET_WIDTH + 1, WIDGET_HEIGHT + 1, 14, 14);
        SetWindowRgn(hWnd, hRgn, TRUE);

        g_hFontTimer = CreateFontW(26, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            FIXED_PITCH | FF_MODERN, L"Consolas");

        g_hFontUI = CreateFontW(14, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            VARIABLE_PITCH | FF_SWISS, L"Segoe UI");

        g_hFontSmall = CreateFontW(10, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
            VARIABLE_PITCH | FF_SWISS, L"Segoe UI");
        return 0;
    }

    case WM_TIMER: {
        if (wParam == TIMER_UI_ID) {
            if (g_isRunning) {
                InvalidateRect(hWnd, NULL, FALSE);
            }

            // Anti-flicker debounce check for edge docking (only when fully opened in DOCK_VISIBLE)
            if (g_isDocked && g_leaveDebounceCount > 0) {
                g_leaveDebounceCount--;
                if (g_leaveDebounceCount == 0 && g_dockState == DOCK_VISIBLE) {
                    POINT pt;
                    GetCursorPos(&pt);
                    RECT rc;
                    GetWindowRect(hWnd, &rc);
                    InflateRect(&rc, 10, 10); // 10px tolerance margin
                    if (!PtInRect(&rc, pt)) {
                        // Truly outside window: slide into edge
                        RECT rcWork;
                        SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);
                        StartSlideAnimation(hWnd, rcWork.right - 14, DOCK_CLOSING);
                    }
                }
            }
        }
        else if (wParam == TIMER_ANIM_ID) {
            // Smooth lerp step towards target X
            int diff = g_targetAnimX - g_currentAnimX;
            if (abs(diff) <= 2) {
                g_currentAnimX = g_targetAnimX;
                KillTimer(hWnd, TIMER_ANIM_ID);

                RECT rcWork;
                SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);
                if (g_currentAnimX >= rcWork.right - 18) {
                    g_dockState = DOCK_HIDDEN;
                    // If cursor remained over the protruding tab, smoothly re-open
                    POINT pt;
                    GetCursorPos(&pt);
                    RECT rc;
                    GetWindowRect(hWnd, &rc);
                    RECT rcTab = { rcWork.right - 18, rc.top - 4, rcWork.right + 4, rc.bottom + 4 };
                    if (PtInRect(&rcTab, pt)) {
                        StartSlideAnimation(hWnd, rcWork.right - WIDGET_WIDTH, DOCK_OPENING);
                    }
                } else {
                    g_dockState = (g_isDocked ? DOCK_VISIBLE : DOCK_FLOATING);
                    // Check if cursor left during opening animation
                    POINT pt;
                    GetCursorPos(&pt);
                    RECT rc;
                    GetWindowRect(hWnd, &rc);
                    InflateRect(&rc, 10, 10);
                    if (!PtInRect(&rc, pt)) {
                        g_leaveDebounceCount = 2; // ~400ms debounce
                    }
                }
            } else {
                g_currentAnimX += diff / 3;
            }

            RECT rc;
            GetWindowRect(hWnd, &rc);
            SetWindowPos(hWnd, g_isTopmost ? HWND_TOPMOST : HWND_NOTOPMOST,
                g_currentAnimX, rc.top, WIDGET_WIDTH, WIDGET_HEIGHT, SWP_NOACTIVATE | SWP_NOZORDER);
            InvalidateRect(hWnd, NULL, FALSE);
        }
        return 0;
    }

    case WM_MOUSEMOVE: {
        TRACKMOUSEEVENT tme;
        tme.cbSize = sizeof(tme);
        tme.dwFlags = TME_LEAVE;
        tme.hwndTrack = hWnd;
        TrackMouseEvent(&tme);

        g_leaveDebounceCount = 0; // Cancel closing debounce immediately

        if (!g_isHovered) {
            g_isHovered = TRUE;
            InvalidateRect(hWnd, NULL, FALSE);
        }

        // If hidden or closing, smoothly open immediately without jitter
        if (g_isDocked && (g_dockState == DOCK_HIDDEN || g_dockState == DOCK_CLOSING)) {
            RECT rcWork;
            SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);
            StartSlideAnimation(hWnd, rcWork.right - WIDGET_WIDTH, DOCK_OPENING);
        }
        return 0;
    }

    case WM_MOUSELEAVE: {
        g_isHovered = FALSE;
        InvalidateRect(hWnd, NULL, FALSE);

        // CRITICAL: NEVER trigger closing debounce while opening! Only when fully DOCK_VISIBLE
        if (g_isDocked && g_dockState == DOCK_VISIBLE) {
            // Set debounce counter (2 ticks of 200ms = 400ms before closing)
            g_leaveDebounceCount = 2;
        }
        return 0;
    }

    case WM_LBUTTONDOWN: {
        POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };

        // Play / Stop button
        if (PtInRect(&g_rcPlayBtn, pt)) {
            if (!g_isRunning) {
                g_isRunning = TRUE;
                g_sessionStartTick = GetTickCount64();
                g_sessionStartTime = time(NULL);
            } else {
                g_isRunning = FALSE;
                ULONGLONG elapsedMs = GetTickCount64() - g_sessionStartTick;
                long dur = (long)(elapsedMs / 1000);
                SaveSession(dur);
            }
            InvalidateRect(hWnd, NULL, TRUE);
            return 0;
        }

        // Topmost Pin button
        if (PtInRect(&g_rcPinBtn, pt)) {
            g_isTopmost = !g_isTopmost;
            SetWindowPos(hWnd, g_isTopmost ? HWND_TOPMOST : HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
            SaveData();
            InvalidateRect(hWnd, NULL, FALSE);
            return 0;
        }

        // Add Activity button
        if (PtInRect(&g_rcAddBtn, pt)) {
            if (!g_isRunning) {
                PromptAddActivity(hWnd);
            }
            return 0;
        }

        // History button
        if (PtInRect(&g_rcHistoryBtn, pt)) {
            ShowHistoryDialog(hWnd);
            return 0;
        }

        // Dock button
        if (PtInRect(&g_rcDockBtn, pt)) {
            ToggleEdgeDock(hWnd);
            return 0;
        }

        // Close button
        if (PtInRect(&g_rcCloseBtn, pt)) {
            if (g_isRunning) {
                ULONGLONG elapsedMs = GetTickCount64() - g_sessionStartTick;
                SaveSession((long)(elapsedMs / 1000));
            }
            DestroyWindow(hWnd);
            return 0;
        }

        // Switch activity on click
        RECT rcActivity = { 8, 4, 150, 24 };
        if (PtInRect(&rcActivity, pt) && !g_isRunning) {
            if (g_activityCount > 1) {
                g_selectedActivity = (g_selectedActivity + 1) % g_activityCount;
                InvalidateRect(hWnd, NULL, FALSE);
            }
            return 0;
        }

        // Drag window anywhere else
        ReleaseCapture();
        SendMessage(hWnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);

        // Check if dragged away from edge
        if (g_isDocked) {
            RECT rcWork, rc;
            SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);
            GetWindowRect(hWnd, &rc);
            if (rc.left < rcWork.right - WIDGET_WIDTH - 60) {
                g_isDocked = FALSE;
                g_dockState = DOCK_FLOATING;
                SaveData();
            }
        }
        return 0;
    }

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hWnd, &ps);

        RECT rcClient;
        GetClientRect(hWnd, &rcClient);
        HDC memDC = CreateCompatibleDC(hdc);
        HBITMAP memBm = CreateCompatibleBitmap(hdc, rcClient.right, rcClient.bottom);
        HBITMAP oldBm = (HBITMAP)SelectObject(memDC, memBm);

        // Windows 11 Fluent dark background (#1E1E24)
        HBRUSH bgBrush = CreateSolidBrush(RGB(30, 30, 36));
        FillRect(memDC, &rcClient, bgBrush);
        DeleteObject(bgBrush);

        // If docked & hidden, draw protruding peek tab on left edge
        if (g_dockState == DOCK_HIDDEN || (g_isDocked && g_dockState == DOCK_CLOSING)) {
            HBRUSH tabBrush = CreateSolidBrush(RGB(59, 130, 246));
            RECT rcTab = { 0, 10, 14, 66 };
            FillRect(memDC, &rcTab, tabBrush);
            DeleteObject(tabBrush);

            // Inner white pill
            HBRUSH whitePill = CreateSolidBrush(RGB(220, 230, 255));
            RECT rcPill = { 4, 24, 7, 52 };
            FillRect(memDC, &rcPill, whitePill);
            DeleteObject(whitePill);
        }

        // Subtle 1px border
        HPEN borderPen = CreatePen(PS_SOLID, 1, RGB(55, 55, 68));
        HPEN oldPen = (HPEN)SelectObject(memDC, borderPen);
        SelectObject(memDC, GetStockObject(NULL_BRUSH));
        RoundRect(memDC, 0, 0, rcClient.right, rcClient.bottom, 14, 14);
        SelectObject(memDC, oldPen);
        DeleteObject(borderPen);

        SetBkMode(memDC, TRANSPARENT);

        // Top Row: Activity Dot + Name
        COLORREF dotColor = g_activities[g_selectedActivity].color;
        HBRUSH dotBrush = CreateSolidBrush(dotColor);
        HBRUSH oldDotBrush = (HBRUSH)SelectObject(memDC, dotBrush);
        SelectObject(memDC, GetStockObject(NULL_PEN));
        Ellipse(memDC, 12, 8, 20, 16);
        SelectObject(memDC, oldDotBrush);
        DeleteObject(dotBrush);

        SelectObject(memDC, g_hFontUI);
        SetTextColor(memDC, RGB(243, 244, 246));
        TextOutW(memDC, 24, 4, g_activities[g_selectedActivity].name, (int)wcslen(g_activities[g_selectedActivity].name));

        // Hover Controls
        if (g_isHovered) {
            SelectObject(memDC, g_hFontSmall);

            // Pin
            SetTextColor(memDC, g_isTopmost ? RGB(96, 165, 250) : RGB(156, 163, 175));
            TextOutW(memDC, g_rcPinBtn.left, g_rcPinBtn.top + 2, L"📌", 2);

            // Add (+)
            SetTextColor(memDC, RGB(156, 163, 175));
            TextOutW(memDC, g_rcAddBtn.left, g_rcAddBtn.top + 2, L"➕", 2);

            // History
            SetTextColor(memDC, RGB(156, 163, 175));
            TextOutW(memDC, g_rcHistoryBtn.left, g_rcHistoryBtn.top + 2, L"📋", 2);

            // Dock
            SetTextColor(memDC, g_isDocked ? RGB(52, 211, 153) : RGB(156, 163, 175));
            TextOutW(memDC, g_rcDockBtn.left, g_rcDockBtn.top + 2, L"📐", 2);

            // Close
            SetTextColor(memDC, RGB(239, 68, 68));
            TextOutW(memDC, g_rcCloseBtn.left, g_rcCloseBtn.top + 2, L"✕", 1);
        }

        // Bottom Row: Timer HH:MM:SS
        long elapsedSec = 0;
        if (g_isRunning) {
            ULONGLONG elapsedMs = GetTickCount64() - g_sessionStartTick;
            elapsedSec = (long)(elapsedMs / 1000);
        }

        wchar_t timeStr[32];
        FormatTime(elapsedSec, timeStr, 32);

        SelectObject(memDC, g_hFontTimer);
        SetTextColor(memDC, RGB(255, 255, 255));
        TextOutW(memDC, 12, 32, timeStr, (int)wcslen(timeStr));

        // Play / Stop Round Button (36x36)
        HBRUSH btnBrush = CreateSolidBrush(g_isRunning ? RGB(239, 68, 68) : RGB(16, 185, 129));
        HBRUSH oldBtnBrush = (HBRUSH)SelectObject(memDC, btnBrush);
        SelectObject(memDC, GetStockObject(NULL_PEN));
        Ellipse(memDC, g_rcPlayBtn.left, g_rcPlayBtn.top, g_rcPlayBtn.right, g_rcPlayBtn.bottom);
        SelectObject(memDC, oldBtnBrush);
        DeleteObject(btnBrush);

        // White icon inside button
        HBRUSH whiteBrush = CreateSolidBrush(RGB(255, 255, 255));
        HBRUSH oldWhite = (HBRUSH)SelectObject(memDC, whiteBrush);
        if (g_isRunning) {
            // Square stop (12x12)
            Rectangle(memDC, g_rcPlayBtn.left + 12, g_rcPlayBtn.top + 12, g_rcPlayBtn.right - 12, g_rcPlayBtn.bottom - 12);
        } else {
            // Triangle play
            POINT pts[3] = {
                { g_rcPlayBtn.left + 14, g_rcPlayBtn.top + 10 },
                { g_rcPlayBtn.left + 14, g_rcPlayBtn.bottom - 10 },
                { g_rcPlayBtn.right - 11, g_rcPlayBtn.top + 18 }
            };
            Polygon(memDC, pts, 3);
        }
        SelectObject(memDC, oldWhite);
        DeleteObject(whiteBrush);

        BitBlt(hdc, 0, 0, rcClient.right, rcClient.bottom, memDC, 0, 0, SRCCOPY);
        SelectObject(memDC, oldBm);
        DeleteObject(memBm);
        DeleteDC(memDC);

        EndPaint(hWnd, &ps);
        return 0;
    }

    case WM_DESTROY: {
        KillTimer(hWnd, TIMER_UI_ID);
        KillTimer(hWnd, TIMER_ANIM_ID);
        if (g_hFontTimer) DeleteObject(g_hFontTimer);
        if (g_hFontUI) DeleteObject(g_hFontUI);
        if (g_hFontSmall) DeleteObject(g_hFontSmall);
        PostQuitMessage(0);
        return 0;
    }

    default:
        return DefWindowProc(hWnd, msg, wParam, lParam);
    }
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR lpCmdLine, int nCmdShow) {
    HANDLE hMutex = CreateMutexW(NULL, TRUE, L"MiniTimeTracker_SingleInstance_Mutex_W11");
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        MessageBoxW(NULL, L"Приложение Mini Time Tracker уже запущено.", L"Информация", MB_OK | MB_ICONINFORMATION);
        return 0;
    }

    EnsureDataDir();
    LoadData();

    WNDCLASSEXW wc = {0};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = L"MiniTimeTrackerWidget";
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.style = CS_HREDRAW | CS_VREDRAW;

    RegisterClassExW(&wc);

    RECT rcWork;
    SystemParametersInfoW(SPI_GETWORKAREA, 0, &rcWork, 0);
    int posX = rcWork.right - WIDGET_WIDTH - 20;
    int posY = rcWork.bottom - WIDGET_HEIGHT - 60;

    DWORD exStyle = WS_EX_TOOLWINDOW | (g_isTopmost ? WS_EX_TOPMOST : 0);
    DWORD style = WS_POPUP | WS_VISIBLE;

    g_hwndMain = CreateWindowExW(
        exStyle,
        L"MiniTimeTrackerWidget",
        L"Mini Time Tracker",
        style,
        posX, posY,
        WIDGET_WIDTH, WIDGET_HEIGHT,
        NULL, NULL, hInstance, NULL
    );

    if (!g_hwndMain) {
        return 1;
    }

    ShowWindow(g_hwndMain, SW_SHOW);
    UpdateWindow(g_hwndMain);

    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    CloseHandle(hMutex);
    return (int)msg.wParam;
}
