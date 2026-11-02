@echo off
setlocal
cd /d "%~dp0.."

set "JAR=otp-shaded\target\otp-shaded-2.11.0-SNAPSHOT-shaded.jar"
if not exist "%JAR%" set "JAR=otp-shaded-2.11.0-SNAPSHOT.jar"
if not exist "%JAR%" (
  echo OTP shaded JAR not found!
  exit /b 1
)

:: Locate Java 25
set "JAVA_CMD=java"
where java >nul 2>nul
if %errorlevel% neq 0 (
  if exist "%JAVA_HOME%\bin\java.exe" (
    set "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
  ) else if exist "C:\Users\HP\.antigravity-ide\extensions\redhat.java-1.58.0-win32-x64\jre\25.0.4.1-win32-x86_64\bin\java.exe" (
    set "JAVA_CMD=C:\Users\HP\.antigravity-ide\extensions\redhat.java-1.58.0-win32-x64\jre\25.0.4.1-win32-x86_64\bin\java.exe"
  )
)

echo.
echo ================================================================
echo Starting Bengaluru OTP (BMTC + Namma Metro) Backend...
echo ================================================================

set "JVM_OPTS=-Xms2200M -Xmx2600M -XX:+AlwaysPreTouch -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=20 -XX:CICompilerCount=4 -XX:+TieredCompilation -XX:+UseStringDeduplication"

:: Check if graph.obj already exists to avoid 15-minute rebuild
if exist "%~dp0graph.obj" (
  echo Found existing graph.obj. Starting fast load (takes ~15 seconds)...
  "%JAVA_CMD%" %JVM_OPTS% -jar "%JAR%" --load "%~dp0"
) else (
  echo Building graph from GTFS feeds and OSM network...
  "%JAVA_CMD%" %JVM_OPTS% -jar "%JAR%" --build --save --serve "%~dp0"
)
