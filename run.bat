@echo off
chcp 65001 > nul
title Tipitaka Pali Reader (တိပိဋက ပါဠိတော် နှင့် အဘိဓာန်)

echo ==============================================================
echo    တိပိဋက ပါဠိတော် နှင့် အဘိဓာန် (Tipitaka Pali Web Reader)
echo ==============================================================
echo.
echo [1/3] Python ရှာဖွေနေပါသည်...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python မတွေ့ရှိပါ။ ကျေးဇူးပြု၍ Python ကို install လုပ်ပေးပါ။
    pause
    exit /b 1
)

echo [2/3] လိုအပ်သော Packages များ စစ်ဆေးနေပါသည်...
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo Flask မရှိသေးပါသဖြင့် install ပြုလုပ်နေပါသည်...
    python -m pip install -r requirements.txt
)

echo [3/3] Server ကို စတင်ဖွင့်လှစ်နေပါသည်...
echo.
echo Browser တွင် http://localhost:5000 ဖြင့် အလိုအလျောက် ပွင့်လာပါမည်။
echo ပိတ်လိုပါက ဤ window တွင် Ctrl + C ကို နှိပ်ပါ။
echo.

python app.py
pause
