# တိပိဋက Web App - USB Stick နှင့် Google Drive ဖြင့် ကူးယူတပ်ဆင်ခြင်း လမ်းညွှန်
(How to Transfer & Deploy via USB Stick & Google Drive)

---

## 📁 Deployment Package ဖိုဒါတွင် ပါဝင်သော ဖိုင်များ

| ဖိုင်အမည် | အရွယ်အစား | အသုံးဝင်ပုံ |
| :--- | :--- | :--- |
| **`tipitaka_vps.zip`** | **~150 MB** | တိပိဋက ပါဠိတော်/မြန်မာပြန် ဒေတာဘေ့စ် (850 MB) နှင့် Core စနစ်တစ်ခုလုံးကို ကျစ်လျစ်စွာ ချုံ့ထားသော အဓိကဖိုင်ကြီး (USB သို့ ကူးရန် / Google Drive သို့ တင်ရန် အဓိကဖိုင်) |
| **`code_update.zip`** | **~255 KB** | ဒေတာဘေ့စ် မပါဘဲ ကုဒ်အပြောင်းအလဲများ (UI / JS / CSS / Python logic) သီးသန့် အမြန် Update ဖိုင် |
| **`install_vps.sh`** | **~2 KB** | Ubuntu VPS ပေါ်တွင် အလိုအလျောက် ၁ ချက်နှိပ် တပ်ဆင်ပေးမည့် Shell Script |
| **`VPS_DEPLOYMENT_GUIDE.md`** | **~13 KB** | VPS Deployment နှင့် ပတ်သက်သော အပြည့်အစုံ လမ်းညွှန်စာအုပ် |
| **`HOW_TO_TRANSFER_USB_AND_GDRIVE.md`** | **~5 KB** | ယခု လမ်းညွှန်စာတမ်း (USB နှင့် Google Drive အသုံးပြုနည်း) |

---

## 💾 နည်းလမ်း (၁) - USB Stick (Flash Drive) ဖြင့် ကူးယူအသုံးပြုခြင်း

ဤ Package ဖိုဒါထဲရှိ `tipitaka_vps.zip` သည် မူရင်း 850 MB ကျော်ရှိသော SQLite Database နှစ်ခုလုံးကို အလွန်ကျစ်လျစ်သော ~150 MB အဖြစ်သာ ချုံ့ထားသဖြင့် **မည်သည့် USB Stick / Flash Drive မဆို စက္ကန့်ပိုင်းအတွင်း ကူးယူနိုင်ပါသည်**။

### အဆင့် ၁ - USB Stick ထဲသို့ ကူးယူခြင်း
1. USB Stick ကို ကွန်ပျူတာတွင် တပ်ဆင်ပါ (ဥပမာ Drive `E:` သို့မဟုတ် `F:`)။
2. `Tipitaka_Deploy_Package` ဖိုဒါတစ်ခုလုံးကိုဖြစ်စေ၊ သို့မဟုတ် `tipitaka_vps.zip` နှင့် `install_vps.sh` ဖိုင်များကိုဖြစ်စေ USB Stick ထဲသို့ Copy & Paste လုပ်ပါ။

### အဆင့် ၂ (က) - USB မှတစ်ဆင့် အခြား Windows PC တွင် Offline အသုံးပြုလိုပါက
1. အခြား Windows PC တွင် USB တပ်ဆင်ပါ။
2. `tipitaka_vps.zip` ကို Right Click နှိပ်၍ **Extract All... (ဖိုင်ဖြည်ချပါ)**။
3. ထွက်လာသော ဖိုဒါထဲရှိ `run.bat` (သို့မဟုတ် PowerShell မှ `python app.py`) ကို နှိပ်လိုက်ရုံဖြင့် **အင်တာနက် လုံးဝမလိုဘဲ တိပိဋက Web App ကို အပြည့်အဝ ဖတ်ရှုအသုံးပြုနိုင်ပါသည်**။

### အဆင့် ၂ (ခ) - USB မှတစ်ဆင့် VPS / Linux Server သို့ တင်လိုပါက
အကယ်၍ VPS သို့ အင်တာနက်မရှိဘဲ သို့မဟုတ် ကွန်ပျူတာမှတစ်ဆင့် လှမ်းတင်လိုပါက:
- **WinSCP / FileZilla သုံးပါက:** USB ထဲမှ `tipitaka_vps.zip` ကို Drag & Drop ဆွဲတင်ရုံဖြင့် VPS ထဲသို့ မိနစ်ပိုင်းအတွင်း ရောက်ရှိသွားပါမည်။
- **PowerShell (SCP) သုံးပါက:**
  ```powershell
  # USB Drive E: ဖြစ်ပါက
  scp -P 2213 E:\Tipitaka_Deploy_Package\tipitaka_vps.zip zinko@172.245.210.149:~/
  ```

---

## ☁️ နည်းလမ်း (၂) - Google Drive တွင် Upload တင်၍ မျှဝေ/ရယူခြင်း

ဤနည်းလမ်းသည် ဖိုင်ကို အွန်လိုင်းတွင် အမြဲသိမ်းဆည်းထားပြီး လိုအပ်သည့် VPS Server သို့မဟုတ် မည်သည့်စက်မှမဆို လွယ်ကူစွာ ပြန်လည်ဒေါင်းလုဒ်ဆွဲယူနိုင်ရန် ဖြစ်ပါသည်။

### အဆင့် ၁ - Google Drive သို့ Upload တင်ခြင်း
1. Browser မှတစ်ဆင့် [Google Drive](https://drive.google.com) သို့ ဝင်ရောက်ပါ။
2. `Tipitaka_Deploy_Package` ဖိုဒါထဲမှ **`tipitaka_vps.zip`** (150 MB) ကို Google Drive ထဲသို့ ဆွဲထည့် (Upload) ပါ။
3. Upload ပြီးပါက ဖိုင်ပေါ်တွင် Right-click နှိပ် -> **Share (မျှဝေရန်)** -> General access တွင် **"Anyone with the link" (လင့်ခ်ရှိသူတိုင်း)** ဟု ရွေးချယ်ပြီး **Copy link** နှိပ်ပါ။

### အဆင့် ၂ - VPS Terminal ပေါ်မှ တိုက်ရိုက်ဆွဲယူနည်း (Direct Download via gdown)
Google Drive မှ Large Zip ဖိုင်များကို VPS Terminal ပေါ်တွင် အလွယ်ကူဆုံး ဆွဲယူနိုင်ရန် `gdown` tool ကို အသုံးပြုနိုင်ပါသည်:

```bash
# ၁။ gdown ထည့်သွင်းခြင်း (မရှိသေးပါက)
pip install gdown || sudo apt install -y python3-pip && pip install gdown

# ၂။ Google Drive Link ဖြင့် တိုက်ရိုက်ဆွဲယူခြင်း
# (လင့်ခ်ထဲမှ File ID ကို ထည့်ပါ သို့မဟုတ် Link တစ်ခုလုံး ထည့်ပါ)
gdown "https://drive.google.com/uc?id=YOUR_FILE_ID" -O tipitaka_vps.zip
```
*(မှတ်ချက်: `YOUR_FILE_ID` နေရာတွင် Google Drive Share Link ထဲမှ ID နံပါတ်ကို ထည့်သွင်းပေးရပါမည်)*

---

## 🌐 နည်းလမ်း (၃) - Direct Web Download (လက်ရှိအလွယ်ဆုံးနည်း)

Local PC တွင် တိပိဋက Web App ပွင့်နေပါက (သို့မဟုတ် Cloudflare Tunnel ပွင့်နေပါက) VPS Terminal ထဲမှ တိုက်ရိုက် တစ်ကြောင်းတည်းဖြင့် အလွယ်ဆုံး ဆွဲယူနိုင်ပါသည် -

```bash
wget https://tipitaka.upanna.top/download-vps-zip -O tipitaka_vps.zip
```

---

## ⚡ အဆင့် (၄) - VPS ပေါ်တွင် အလိုအလျောက် ၁ ချက်နှိပ် တပ်ဆင်ခြင်း (1-Click Automated Install)

`tipitaka_vps.zip` ဖိုင်ကို VPS Server သို့ ရောက်ရှိသွားပြီဆိုပါက `install_vps.sh` ကို run လိုက်ရုံဖြင့် စနစ်တစ်ခုလုံး (Unzip, Python venv, dependencies, systemd service) အားလုံးကို အလိုအလျောက် တပ်ဆင်မောင်းနှင်ပေးသွားပါမည်:

```bash
# tipitaka_vps.zip ရှိသော ဖိုဒါတွင်
sudo bash install_vps.sh
```

တပ်ဆင်ပြီးစီးပါက `https://tipi.upanna.top` (သို့မဟုတ် VPS port 5005) တွင် တိပိဋက Web App အမြဲတမ်း ၂၄ နာရီ ချောမွေ့စွာ စတင်လည်ပတ်နေမည် ဖြစ်ပါသည် ဘုရား။
