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
  scp E:\Tipitaka_Deploy_Package\tipitaka_vps.zip username@YOUR_SERVER_IP:~/
  ```

---

## ☁️ နည်းလမ်း (၂) - Google Drive အမြဲတမ်းလင့်ခ်မှ တိုက်ရိုက် ရယူခြင်း (Permanent Google Drive Link)

ဆရာတော်၏ Google Drive ပေါ်တွင် `tipitaka_vps.zip` (~150 MB) ကို အမြဲတမ်း အဆင်သင့် တင်ထားပြီးဖြစ်ပါသည်:
- **အမြဲတမ်း Google Drive လင့်ခ်:**  
  [https://drive.google.com/file/d/1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx/view?usp=drive_link](https://drive.google.com/file/d/1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx/view?usp=drive_link)
- **Google Drive File ID:** `1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx`

### VPS Terminal ပေါ်မှ တိုက်ရိုက်ဆွဲယူနည်း (Direct Download via gdown)
Google Drive မှ Large Zip ဖိုင်များကို VPS Terminal ပေါ်တွင် Browser ဖွင့်စရာမလိုဘဲ အောက်ပါ command ၂ ကြောင်းဖြင့် တိုက်ရိုက်ဆွဲယူနိုင်ပါသည်:

```bash
# ၁။ gdown tool ထည့်သွင်းခြင်း (မရှိသေးပါက)
pip install gdown || sudo apt install -y python3-pip && pip install gdown

# ၂။ Google Drive အမြဲတမ်းလင့်ခ်မှ တိုက်ရိုက်ဆွဲယူခြင်း
gdown 1WX-09wlmRDma__j4ErLTK8jrSn8a1Fbx -O tipitaka_vps.zip
```
*(မှတ်ချက်: ဤ command ကို run လိုက်သည်နှင့် ဆရာတော်၏ Google Drive မှ tipitaka_vps.zip ကို မည်သည့် VPS / Linux terminal မှမဆို စက္ကန့်ပိုင်းအတွင်း အလိုအလျောက် ဆွဲယူပေးသွားမည် ဖြစ်ပါသည်)*

---

## ⚡ နည်းလမ်း (၃) - VPS ပေါ်တွင် အလိုအလျောက် ၁ ချက်နှိပ် တပ်ဆင်ခြင်း (1-Click Automated Setup)

`setup_vps.sh` (သို့မဟုတ် `install_vps.sh`) ကို run လိုက်ရုံဖြင့် စနစ်တစ်ခုလုံး (Google Drive မှ Database ဆွဲယူဖြည်ချခြင်း၊ Python venv၊ dependencies၊ systemd service) အားလုံးကို အလိုအလျောက် အစအဆုံး တပ်ဆင်မောင်းနှင်ပေးသွားပါမည်:

```bash
# /opt/tipitaka ဖိုဒါထဲတွင်
sudo bash setup_vps.sh
```

တပ်ဆင်ပြီးစီးပါက `https://tipi.your-domain.com` (သို့မဟုတ် VPS port 5005) တွင် တိပိဋက Web App အမြဲတမ်း ၂၄ နာရီ ချောမွေ့စွာ စတင်လည်ပတ်နေမည် ဖြစ်ပါသည် ဘုရား။
