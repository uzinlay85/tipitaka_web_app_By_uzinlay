# တိပိဋက Web App - VPS Deployment & Maintenance Guide
(Local PC မှ VPS သို့ တင်ဆင်ခြင်း၊ စီမံခန့်ခွဲခြင်းနှင့် နောင်တွင် Update ပြုလုပ်ခြင်း လမ်းညွှန်)

---

## 📌 စနစ် ဖွဲ့စည်းပုံ အကျဉ်းချုပ် (System Architecture)

| အမျိုးအစား | Local PC (စမ်းသပ်/ဖွံ့ဖြိုးရေး) | VPS Server (အမြဲတမ်း ၂၄ နာရီ) |
| :--- | :--- | :--- |
| **OS** | Windows | Ubuntu Linux |
| **Domain** | `https://tipitaka.upanna.top` | `https://tipi.upanna.top` |
| **Port** | `localhost:5000` | `localhost:5005` |
| **Runner** | Python `app.py` | Gunicorn (2 Workers) via Systemd |
| **Status** | PC ဖွင့်ထားချိန်တွင်သာ ရရှိ | PC ပိတ်ထားလည်း ၂၄ နာရီ မပြတ် ရရှိ |

---

## 🚀 အပိုင်း (၁) - အစအဆုံး အသစ် တပ်ဆင်ခြင်း (Initial Setup)

### အဆင့် ၁.၁ - Windows PC တွင် လိုအပ်သော ဖိုင်များကို Zip ဖိုင် ချုံ့ခြင်း
Windows PowerShell တွင် အောက်ပါ command ဖြင့် လိုအပ်သော Core ဖိုင်များကိုသာ ရွေးထုတ်ပြီး Zip ဖိုင်အဖြစ် ချုံ့နိုင်ပါသည် -

```powershell
python -c "
import os, zipfile
source_dir = r'C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app'
output_zip = r'C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app\tipitaka_vps.zip'
items = ['app.py', 'tipitaka_pali.db', 'tipitaka_mm.db', 'requirements.txt', 'templates', 'static']
with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for item in items:
        p = os.path.join(source_dir, item)
        if os.path.isfile(p): z.write(p, arcname=item)
        elif os.path.isdir(p):
            for root, dirs, files in os.walk(p):
                for f in files:
                    fp = os.path.join(root, f)
                    z.write(fp, arcname=os.path.relpath(fp, source_dir))
print('Zip Done!')
"
```
*(မူရင်း 850 MB မှ ~150 MB အထိ ကျစ်လျစ်စွာ ချုံ့ပေးသွားပါမည်)*

---

### အဆင့် ၁.၂ - VPS ပေါ်သို့ ဖိုင် ရယူခြင်း (Direct Web Download)
Local PC တွင် Web App ပွင့်နေချိန်တွင် VPS Terminal ထဲမှ တိုက်ရိုက် တစ်ကြောင်းတည်းဖြင့် ဆွဲယူနိုင်ပါသည် -

```bash
wget https://tipitaka.upanna.top/download-vps-zip -O tipitaka_vps.zip
```
*(သို့မဟုတ် Local PC မှ SCP ဖြင့် ပို့မည်ဆိုပါက: `scp -P 2213 tipitaka_vps.zip zinko@172.245.210.149:~/`)*

---

### အဆင့် ၁.၃ - ဖိုဒါဆောက်၍ ဖိုင်များ ဖြည်ချခြင်းနှင့် Permission သတ်မှတ်ခြင်း
```bash
sudo apt update && sudo apt install -y unzip python3-pip python3-venv
sudo mkdir -p /opt/tipitaka
sudo mv tipitaka_vps.zip /opt/tipitaka/
cd /opt/tipitaka
sudo unzip -o tipitaka_vps.zip
sudo chown -R zinko:zinko /opt/tipitaka
sudo chmod -R 755 /opt/tipitaka
```

---

### အဆင့် ၁.၄ - Python Virtual Environment ဆောက်ပြီး Packages သွင်းခြင်း
```bash
cd /opt/tipitaka
python3 -m venv venv
./venv/bin/pip install -r requirements.txt gunicorn
```

---

### အဆင့် ၁.၅ - ၂၄ နာရီ အလိုအလျောက် Run မည့် Systemd Service ဖိုင် တည်ဆောက်ခြင်း
Service ဖိုင်ကို ဖွင့်ပါ -
```bash
sudo nano /etc/systemd/system/tipitaka.service
```

အောက်ပါ စာသားများကို ကူးထည့်ပါ -
```ini
[Unit]
Description=Tipitaka Pali & Myanmar Web App
After=network.target

[Service]
User=zinko
WorkingDirectory=/opt/tipitaka
ExecStart=/opt/tipitaka/venv/bin/gunicorn -w 2 -b 127.0.0.1:5005 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
*(သိမ်းဆည်းရန်: `Ctrl + O` -> `Enter` -> `Ctrl + X`)*

---

### အဆင့် ၁.၆ - Service ကို စတင် Run ခြင်းနှင့် စစ်ဆေးခြင်း
```bash
sudo systemctl daemon-reload
sudo systemctl enable tipitaka
sudo systemctl start tipitaka

# Status စစ်ဆေးရန် (active running ဖြစ်ရမည်)
sudo systemctl status tipitaka

# Local စမ်းသပ်ရန်
curl -I http://127.0.0.1:5005
```

---

### အဆင့် ၁.၇ - VPS တွင် Cloudflare Tunnel တပ်ဆင် ချိတ်ဆက်ခြင်း

1. **`cloudflared` ကို VPS တွင် သွင်းခြင်း:**
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. **Cloudflare Zero Trust Dashboard မှ Connector ချိတ်ဆက်ခြင်း:**
   - [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) > **Networks** > **Tunnels** သို့ သွားပါ။
   - Tunnel အသစ်ဆောက်၍ (သို့မဟုတ် ရှိပြီးသား Tunnel ထဲတွင်) **Debian (64-bit)** ကို ရွေးပြီး ပေးထားသော `sudo cloudflared service install <TOKEN>` ကို VPS Terminal တွင် Run ပါ။

3. **Public Hostname လမ်းကြောင်း ညွှန်ခြင်း:**
   - **Subdomain:** `tipi`
   - **Domain:** `upanna.top`
   - **Type:** `HTTP`
   - **URL:** `localhost:5005`
   - **Complete setup** နှိပ်ပါ။

---

## 🔄 အပိုင်း (၂) - နောင်တွင် Local PC ၌ ဖိုင်များ ပြင်ဆင်ပြီးပါက VPS သို့ အလွယ်တကူ Update တင်နည်း

Database ဖိုင်များ (`tipitaka_pali.db` နှင့် `tipitaka_mm.db`) သည် အရွယ်အစားကြီးမားပြီး မကြာခဏ ပြင်ဆင်ရန် မလိုသဖြင့် UI / CSS / JS / Python Code များကိုသာ **စက္ကန့်ပိုင်းအတွင်း အလွယ်တကူ Update လုပ်နိုင်သော နည်းလမ်း** ဖြစ်ပါသည်။

### နည်းလမ်း (A) - GitHub ဖြင့် တိုက်ရိုက် Update ပြုလုပ်ခြင်း (အလွယ်ကူဆုံးနှင့် အကြံပြုဆုံး နည်းလမ်း)

GitHub Repo သို့ Code များ Push တင်ပြီးသည့်အခါတိုင်း VPS Terminal (SSH) သို့ ဝင်ရောက်ပြီး အောက်ပါ command (၃) ကြောင်းကိုသာ Run ပေးရုံဖြင့် စက္ကန့်ပိုင်းအတွင်း Update ပြီးစီးပါသည် -

```bash
cd /opt/tipitaka
git pull origin main
sudo systemctl restart tipitaka
```

> [!TIP]
> **အမြန် Run ရန် (တစ်ကြောင်းတည်း Run နည်း):**
> ```bash
> cd /opt/tipitaka && git pull origin main && sudo systemctl restart tipitaka
> ```

#### ⚠️ `git pull` ပြုလုပ်စဉ် Error (Conflict / Local Changes) ပေါ်ခဲ့ပါက ဖြေရှင်းနည်း:
အကယ်၍ VPS ပေါ်တွင် ဖိုင်တစ်ခုခု အမှတ်မထင် ပြင်ဆင်မိထား၍ `error: Your local changes to the following files would be overwritten by merge` ဟု ပြပါက GitHub ရှိ မူရင်းအတိုင်း အသစ်ပြန်လဲလှယ်ရန် အောက်ပါ command ကို Run ပါ -

```bash
cd /opt/tipitaka
git fetch origin main
git reset --hard origin/main
sudo systemctl restart tipitaka
```

#### 📦 Python Library အသစ်များ (`requirements.txt`) ပါဝင်လာသည့် အခါမျိုးတွင်:
```bash
cd /opt/tipitaka
git pull origin main
./venv/bin/pip install -r requirements.txt
sudo systemctl restart tipitaka
```

---

### နည်းလမ်း (B) - `code_update.zip` Upload တင်၍ Update ပြုလုပ်ခြင်း (Zip Method)

အကယ်၍ Git မသုံးလိုဘဲ ဖိုင်များကို Zip ဖြင့်သာ Upload တင်လိုပါက -

#### အဆင့် ၁ (Local PC တွင်):
Windows PowerShell တွင် အောက်ပါ command ဖြင့် Code ဖိုင်များကိုသာ သီးသန့် Zip အသေးလေး လုပ်ပါ (~1 MB သာ ရှိပါသည်) -
```powershell
python -c "
import os, zipfile
source_dir = r'C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app'
output_zip = r'C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app\code_update.zip'
items = ['app.py', 'requirements.txt', 'templates', 'static']
with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for item in items:
        p = os.path.join(source_dir, item)
        if os.path.isfile(p): z.write(p, arcname=item)
        elif os.path.isdir(p):
            for root, dirs, files in os.walk(p):
                for f in files:
                    fp = os.path.join(root, f)
                    z.write(fp, arcname=os.path.relpath(fp, source_dir))
print('Code zip ready!')
"
```

#### အဆင့် ၂ (VPS သို့ ပို့ခြင်း):
Windows PowerShell မှတစ်ဆင့် VPS သို့ တိုက်ရိုက် ပို့ပါ -
```powershell
scp -P 2213 "C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app\code_update.zip" zinko@172.245.210.149:/opt/tipitaka/
```

#### အဆင့် ၃ (VPS Terminal တွင် ဖြည်ချပြီး Service Restart လုပ်ခြင်း):
VPS Terminal တွင် အောက်ပါ command ကို Run ပါ -
```bash
cd /opt/tipitaka
unzip -o code_update.zip && sudo systemctl restart tipitaka
```

---

### နည်းလမ်း (B) - Database ဖိုင်များပါ ပြင်ဆင်ထား၍ အကုန်လုံး Update လုပ်လိုပါက
1. အပိုင်း (၁) ရှိ အဆင့် ၁.၁ အတိုင်း `tipitaka_vps.zip` အသစ် ပြန်ထုတ်ပါ။
2. Local PC တွင် app ဖွင့်ထားပြီး VPS ထဲမှ:
   ```bash
   cd /opt/tipitaka
   wget https://tipitaka.upanna.top/download-vps-zip -O tipitaka_vps.zip
   unzip -o tipitaka_vps.zip
   sudo chown -R zinko:zinko /opt/tipitaka
   sudo systemctl restart tipitaka
   ```

---

## 🛠️ အပိုင်း (၃) - VPS စီမံခန့်ခွဲမှု အထောက်အကူပြု Commands (Cheat Sheet)

| လိုလားချက် | Command |
| :--- | :--- |
| **Service အခြေအနေ ကြည့်ရန်** | `sudo systemctl status tipitaka` |
| **Service ကို ပြန်လည် စတင်ရန် (Restart)** | `sudo systemctl restart tipitaka` |
| **Service ကို ခေတ္တ ပိတ်ထားရန်** | `sudo systemctl stop tipitaka` |
| **Error Log / Live Log ဖတ်ရန်** | `sudo journalctl -u tipitaka -f` |
| **နောက်ဆုံး Error ၁၅ ကြောင်း ကြည့်ရန်** | `sudo journalctl -u tipitaka -n 15 --no-pager` |
| **Port 5005 အလုပ်လုပ်နေမှု စစ်ရန်** | `curl -I http://127.0.0.1:5005` |
| **Cloudflare Tunnel Status စစ်ရန်** | `sudo systemctl status cloudflared` |

---

> **မှတ်ချက်:** အသုံးပြုသူများ Browser တွင် Update အသစ်များကို ချက်ချင်း မြင်တွေ့နိုင်စေရန် Browser ၏ Cache ကို `Ctrl + F5` နှိပ်၍ Refresh ပြုလုပ်ရန် လိုအပ်နိုင်ပါသည်။
