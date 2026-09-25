#!/bin/bash
# ============================================================
# Tipitaka Web App - Automated VPS One-Click Installer
# OS: Ubuntu 20.04 / 22.04 / 24.04 LTS
# ============================================================
set -e

echo "============================================================"
echo "☸️ တိပိဋက Web App - VPS အလိုအလျောက် တပ်ဆင်ခြင်း စတင်ပါပြီ..."
echo "============================================================"

# Check root or sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ သတိပေးချက်: ကျေးဇူးပြု၍ sudo ဖြင့် run ပေးပါ (ဥပမာ: sudo bash install_vps.sh)"
  exit 1
fi

TARGET_DIR="/opt/tipitaka"
REAL_USER=${SUDO_USER:-$(whoami)}

echo "Step 1: လိုအပ်သော Linux packages များ ထည့်သွင်းခြင်း..."
apt update -y
apt install -y unzip python3-pip python3-venv

echo "Step 2: /opt/tipitaka ဖိုဒါ ပြင်ဆင်ခြင်း..."
mkdir -p "$TARGET_DIR"

if [ -f "tipitaka_vps.zip" ]; then
    echo "လက်ရှိ ဖိုဒါထဲမှ tipitaka_vps.zip ကို /opt/tipitaka သို့ ကူးယူနေပါသည်..."
    cp tipitaka_vps.zip "$TARGET_DIR/"
elif [ -f "$TARGET_DIR/tipitaka_vps.zip" ]; then
    echo "$TARGET_DIR ထဲတွင် tipitaka_vps.zip ရှိနှင့်ပြီးဖြစ်ပါသည်..."
else
    echo "⚠️ tipitaka_vps.zip မတွေ့ရှိပါသဖြင့် ဆရာတော်၏ Google Drive အမြဲတမ်းလင့်ခ်မှ အလိုအလျောက် ဆွဲယူနေပါသည်..."
    pip install gdown || apt install -y python3-pip && pip install gdown
    gdown 1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx -O "$TARGET_DIR/tipitaka_vps.zip"
fi

cd "$TARGET_DIR"

echo "Step 3: tipitaka_vps.zip ကို ဖြည်ချနေပါသည် (Unzipping)..."
unzip -o tipitaka_vps.zip

echo "Step 4: ဖိုင် Permission နှင့် ပိုင်ဆိုင်ခွင့် သတ်မှတ်ခြင်း (User: $REAL_USER)..."
chown -R "$REAL_USER:$REAL_USER" "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"

echo "Step 5: Python Virtual Environment တည်ဆောက်ပြီး လိုအပ်သော Packages များ သွင်းယူနေပါသည်..."
sudo -u "$REAL_USER" python3 -m venv venv
sudo -u "$REAL_USER" ./venv/bin/pip install --upgrade pip
sudo -u "$REAL_USER" ./venv/bin/pip install -r requirements.txt gunicorn

echo "Step 6: Systemd Service ဖိုင် (/etc/systemd/system/tipitaka.service) ဖန်တီးခြင်း..."
cat << EOF > /etc/systemd/system/tipitaka.service
[Unit]
Description=Tipitaka Pali & Myanmar Web App
After=network.target

[Service]
User=$REAL_USER
WorkingDirectory=$TARGET_DIR
ExecStart=$TARGET_DIR/venv/bin/gunicorn -w 2 -b 127.0.0.1:5005 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "Step 7: Service ကို Reload လုပ်ပြီး စတင်မောင်းနှင်ခြင်း..."
systemctl daemon-reload
systemctl enable tipitaka
systemctl restart tipitaka

echo ""
echo "============================================================"
echo "🎉 ဂုဏ်ယူပါသည်! တိပိဋက Web App ကို VPS ပေါ်တွင် အောင်မြင်စွာ တပ်ဆင်ပြီးပါပြီ။"
echo "စနစ် အခြေအနေ (Service Status):"
echo "============================================================"
systemctl status tipitaka --no-pager
