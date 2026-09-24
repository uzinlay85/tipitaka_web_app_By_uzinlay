@echo off
chcp 65001 > nul
echo Tipitaka Server ကို ရပ်တန့်နေပါသည်...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo Server process PID %%a ကို ရပ်တန့်ပြီးပါပြီ။
)
echo ပြီးပါပြီ။
pause
