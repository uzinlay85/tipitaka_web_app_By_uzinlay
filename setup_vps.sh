#!/bin/bash
# ==============================================================================
# တိပိဋက Web App - Modern VPS 2-Step Automated Installer
# GitHub (Code) + Google Drive (Databases) Hybrid Architecture
# Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS, Debian 11/12
# ==============================================================================
set -e

echo "=================================================================="
echo "☸️ တိပိဋက ပါဠိတော် နှင့် မြန်မာပြန် Web App - VPS တပ်ဆင်ခြင်း စတင်ပါပြီ..."
echo "=================================================================="

# ၁။ Root သို့မဟုတ် Sudo စစ်ဆေးခြင်း
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ သတိပေးချက်: ကျေးဇူးပြု၍ sudo ဖြင့် run ပေးပါ (ဥပမာ: sudo bash setup_vps.sh)"
  exit 1
fi

TARGET_DIR="/opt/tipitaka"
REAL_USER=${SUDO_USER:-$(whoami)}
GDRIVE_FILE_ID="1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx"

# Check if target directory exists; if not, create
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

echo "=== [1/5] စနစ်အတွက် လိုအပ်သော Linux Packages များ ထည့်သွင်းခြင်း ==="
apt update -y
apt install -y unzip python3-pip python3-venv git curl

echo "=== [2/5] တိပိဋက ပါဠိတော် နှင့် မြန်မာပြန် ဒေတာဘေ့စ်များ စစ်ဆေးခြင်း ==="
if [ -f "$TARGET_DIR/tipitaka_pali.db" ] && [ -f "$TARGET_DIR/tipitaka_mm.db" ]; then
    echo "✅ ဒေတာဘေ့စ်ဖိုင်များ ရှိနှင့်ပြီးဖြစ်ပါသဖြင့် ဒေါင်းလုဒ်ဆွဲခြင်းကို ကျော်ပါမည်။"
else
    if [ -f "$TARGET_DIR/tipitaka_vps.zip" ] || [ -f "tipitaka_vps.zip" ]; then
        echo "✅ ဒေသတွင်း tipitaka_vps.zip ဖိုင် တွေ့ရှိပါသဖြင့် Google Drive မှ ဒေါင်းလုဒ်ဆွဲခြင်းကို ကျော်ပါမည်။"
        if [ -f "tipitaka_vps.zip" ] && [ ! -f "$TARGET_DIR/tipitaka_vps.zip" ]; then
            cp tipitaka_vps.zip "$TARGET_DIR/"
        fi
    else
        echo "📥 ဆရာတော်၏ Google Drive အမြဲတမ်းလင့်ခ်မှ ဒေတာဘေ့စ်များကို ဆွဲယူနေပါသည်..."
        echo "Google Drive File ID: $GDRIVE_FILE_ID (~150 MB)"
        
        # Install gdown if needed
        pip install gdown || apt install -y python3-pip && pip install gdown
        
        # Download zip directly from Google Drive
        gdown "$GDRIVE_FILE_ID" -O "$TARGET_DIR/tipitaka_vps.zip"
    fi
    
    echo "📦 ဒေတာဘေ့စ်ဖိုင်များ ဖြည်ချနေပါသည် (Extracting databases)..."
    unzip -o "$TARGET_DIR/tipitaka_vps.zip" tipitaka_pali.db tipitaka_mm.db -d "$TARGET_DIR/"
    
    # Clean up zip to save disk space
    rm -f "$TARGET_DIR/tipitaka_vps.zip"
    echo "✅ ဒေတာဘေ့စ်များ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။"
fi

echo "=== [3/5] ဖိုင် Permission နှင့် ပိုင်ဆိုင်ခွင့် သတ်မှတ်ခြင်း (User: $REAL_USER) ==="
chown -R "$REAL_USER:$REAL_USER" "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"

echo "=== [4/5] Python Virtual Environment တည်ဆောက်ပြီး Packages များ သွင်းခြင်း ==="
if [ ! -d "$TARGET_DIR/venv" ]; then
    sudo -u "$REAL_USER" python3 -m venv "$TARGET_DIR/venv"
fi
sudo -u "$REAL_USER" "$TARGET_DIR/venv/bin/pip" install --upgrade pip
sudo -u "$REAL_USER" "$TARGET_DIR/venv/bin/pip" install -r "$TARGET_DIR/requirements.txt" gunicorn

echo "=== [5/5] ၂၄ နာရီ Systemd Service ဖိုင် တည်ဆောက်ပြီး စတင်မောင်းနှင်ခြင်း ==="
SERVICE_FILE="/etc/systemd/system/tipitaka.service"
cat << EOF > "$SERVICE_FILE"
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

systemctl daemon-reload
systemctl enable tipitaka
systemctl restart tipitaka

echo ""
echo "=================================================================="
echo "🎉 ဂုဏ်ယူပါသည်! တိပိဋက Web App ကို VPS ပေါ်တွင် အောင်မြင်စွာ တပ်ဆင်ပြီးပါပြီ။"
echo "Port: 5005 (127.0.0.1:5005)"
echo "Service Status စစ်ဆေးချက်:"
echo "=================================================================="
systemctl status tipitaka --no-pager
