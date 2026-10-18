@echo off
echo ========================================================
echo  Mini Time Tracker - Сборка автономного EXE для Windows 11
echo ========================================================
echo.

where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] .NET SDK не найден в PATH. Установите .NET 10 SDK:
    echo https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [1/2] Проверка сборки проекта...
dotnet build MiniTimeTracker.csproj -c Release
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка проекта завершилась с ошибкой.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Публикация автономного единого файла (win-x64 Self-Contained)...
dotnet publish MiniTimeTracker.csproj -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o ./publish

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  УСПЕХ! Автономный файл готов:
    echo  %~dp0publish\MiniTimeTracker.exe
    echo ========================================================
    echo.
    echo Файл можно переносить на любой компьютер с Windows 11 x64 без необходимости установки .NET Runtime.
) else (
    echo [ОШИБКА] Публикация завершилась сбоем.
)

pause
