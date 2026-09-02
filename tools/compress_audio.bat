@echo off
chcp 65001 >nul
REM ============================================================================
REM 其乐嵘戎 Power Up Assessment - audio compression (Opus)
REM Convert every audio\*.mp3 to Opus (speech-optimized). Original MP3 kept as fallback.
REM Requires ffmpeg in PATH:  winget install ffmpeg   (or choco install ffmpeg)
REM Usage:  tools\compress_audio.bat            (default 40 kbps mono)
REM         tools\compress_audio.bat 48         (custom bitrate kbps)
REM Web already prefers .opus and falls back to .mp3 when it fails to load.
REM ============================================================================
setlocal enabledelayedexpansion
set "BR=%~1"
if "%BR%"=="" set "BR=40"

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ffmpeg not found. Install it first:
  echo   Windows: winget install ffmpeg   (or choco install ffmpeg)
  echo   Download: https://ffmpeg.org/download.html
  exit /b 1
)

set "ROOT=%~dp0.."
set "AUDIO=%ROOT%\audio"

echo [INFO] Compressing audio\*.mp3 -> Opus (%BR%kbps, mono, voip)
set /a total_before=0
set /a total_after=0
set /a n=0

for /r "%AUDIO%" %%f in (*.mp3) do (
  set "MP3=%%f"
  set "OPUS=%%~dpnf.opus"
  if exist "!OPUS!" (
    echo [SKIP] already exists: %%~nxf.opus
  ) else (
    echo [CONV] %%~nxf
    ffmpeg -y -i "%%f" -c:a libopus -b:a %BR%k -ac 1 -application voip -vbr on "!OPUS!" <nul
    set /a n+=1
  )
  for %%a in ("%%f") do set /a before=%%~za
  for %%b in ("!OPUS!") do set /a after=%%~zb
  set /a total_before+=before
  set /a total_after+=after
  set /a pct=after*100/before
  echo   [OK] %%~nxf -^> %%~nxf.opus : !before!/1024 KB -^> !after!/1024 KB (!pct!%%)
)

echo ---------------------------------------------------------------
if %total_before% gtr 0 (
  set /a save=(total_before-total_after)*100/total_before
  echo [DONE] Converted %n% new files; %total_before%/1024 KB -^> %total_after%/1024 KB, saved %save%%%
)
echo [NOTE] Original MP3 kept as fallback. Web prefers .opus, falls back to .mp3.
endlocal
