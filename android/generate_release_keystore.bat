@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo  Tipitaka Android Release Keystore Generator
echo ============================================================
echo.
echo This script will generate the official release keystore
echo (tipitaka-release.jks) and configure release-keystore.properties.
echo.
echo IMPORTANT: Keep tipitaka-release.jks in a safe backup location
echo (e.g. Google Drive, USB). If you lose this key, future updates
echo cannot be installed without uninstalling the app!
echo.

set KEYSTORE_FILE=tipitaka-release.jks
set ALIAS=tipitaka

if exist "%KEYSTORE_FILE%" (
    echo [WARNING] %KEYSTORE_FILE% already exists in this folder!
    echo Generating a new one would overwrite your existing release key.
    echo Exiting to protect your existing keystore.
    pause
    exit /b 1
)

set /p STORE_PASS="Enter password for keystore: "
if "%STORE_PASS%"=="" (
    echo Password cannot be empty!
    pause
    exit /b 1
)

echo Generating %KEYSTORE_FILE%...
keytool -genkeypair -v -keystore "%KEYSTORE_FILE%" -alias "%ALIAS%" -keyalg RSA -keysize 2048 -validity 10000 -storepass "%STORE_PASS%" -keypass "%STORE_PASS%" -dname "CN=Tipitaka App, OU=Dhamma, O=Upanna, L=Yangon, C=MM"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] keytool failed! Ensure Java/JDK is installed and in your PATH.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Writing release-keystore.properties...
(
    echo RELEASE_STORE_FILE=%KEYSTORE_FILE%
    echo RELEASE_KEY_ALIAS=%ALIAS%
    echo RELEASE_STORE_PASSWORD=%STORE_PASS%
    echo RELEASE_KEY_PASSWORD=%STORE_PASS%
) > release-keystore.properties

echo.
echo ============================================================
echo [SUCCESS] Release keystore generated successfully!
echo Keystore: %CD%\%KEYSTORE_FILE%
echo Config:   %CD%\release-keystore.properties
echo ============================================================
echo.
pause
