# دليل المشغّل لوضع الاسترداد الآمن (Recovery Mode) - مستشفى ميت علي

هذا الدليل مخصص لمسؤولي النظام ومشغّلي الخادم للتعامل مع **وضع الاسترداد الآمن (Safe Recovery Mode)** في نظام `MeetAli-Hospital 2`.

---

## 1. ما هو وضع الاسترداد الآمن (Recovery Mode)؟
هو وضع حماية تلقائي ومشدد يدخل فيه خادم المستشفى المركزي عند اكتشاف أي خطر يهدد سلامة البيانات، مثل:
- تلف ملف قاعدة البيانات الرئيسي (`data/hospital_db.json`) أو احتوائه على كود JSON غير صالح.
- فقدان أو حذف ملف `hospital_db.json` بالخطأ مع وجود نسخ احتياطية سابقة في مجلد `data/backups/`.

### سياسة الأمان الصارمة أثناء وضع الاسترداد:
- **تجميد فوري لجميع عمليات الكتابة والتعديل (Writes Frozen)** لحماية البيانات من التلف أو التضارب.
- إرجاع خطأ `HTTP 503 Service Unavailable` لأي محاولة تعديل، مع إبقاء صفحات الاستعلام وفحص الحالة تعمل.
- **منع تام للكتابة فوق البيانات التالفة ببيانات أولية (No Silent Seed Overwrite)**؛ يقوم الخادم بعزل الملف التالف أولاً في مجلد `data/corrupted/` لحمايته تحليلياً.

---

## 2. كيف يعرف المشغّل أن الخادم في وضع الاسترداد (Recovery Mode)؟

يمكن معرفة ذلك بسهولة من خلال 3 مؤشرات واضحة:

### أ) عبر شاشة الطرفية (Terminal):
يطبع الخادم تنبيهاً بارزاً مع اسم أحدث نسخة احتياطية صالحة:
```text
****************************************************************
🚨 [JsonDatabaseEngine RECOVERY MODE ACTIVATED] 🚨
السبب (Reason): JSON corruption or invalid structure: ...
حالة الكتابة: مجمدة تماماً لحماية البيانات من التلف (Writes Frozen: 503)
أحدث نسخة احتياطية متاحة (Latest Backup Candidate): hospital_db_2026-11-04T12-03-04-960Z_startup.json
خطوات الاستعادة اليدوية السريعة:
  1. أوقف الخادم (Ctrl+C أو kill).
  2. نفّذ أمر النسخ: cp "data/backups/hospital_db_..." "data/hospital_db.json"
  3. أعد تشغيل الخادم.
****************************************************************
```

### ب) عبر الاستعلام عن حالة الخادم `/api/status`:
عند فتح الرابط `http://127.0.0.1:3000/api/status` في المتصفح أو عبر `curl`، ستظهر الاستجابة التالية:
```json
{
  "status": "recovery_mode",
  "recovery": {
    "isRecoveryMode": true,
    "recoveryReason": "JSON corruption or invalid structure",
    "isWritesFrozen": true,
    "latestBackup": {
      "filename": "hospital_db_2026-11-04T12-03-04-960Z_startup.json",
      "status": "success"
    }
  }
}
```

### ج) عند إرسال أي طلب تعديل (POST):
يُرجع الخادم كود `503` ورسالة خطأ توضح سبب التجميد:
```json
{
  "error": "SERVICE_UNAVAILABLE_RECOVERY_MODE",
  "message": "النظام في وضع الاسترداد الآمن (Recovery Mode) بسبب تلف أو فقدان ملف البيانات. تم تجميد كافة عمليات الحفظ لحين الاستعادة."
}
```

---

## 3. خطوات الاستعادة اليدوية البسيطة (Manual Restore)

لإعادة النظام للعمل الطبيعي واسترجاع البيانات، اتبع الخطوات الثلاث التالية:

### الخطوة 1: إيقاف الخادم
اضغط `Ctrl + C` في الطرفية التي يعمل بها الخادم، أو أوقفه عبر رقم العملية:
```bash
kill $(cat data/hospital_db.json.lock 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d: -f2)
```

### الخطوة 2: نسخ أحدث نسخة احتياطية صالحة
افحص مجلد النسخ الاحتياطية `data/backups/` واختر أحدث نسخة:
```bash
# استعراض أحدث النسخ
ls -lt data/backups/

# نسخ أحدث ملف إلى ملف قاعدة البيانات الرئيسي (مثال)
cp data/backups/hospital_db_2026-11-04T12-03-04-960Z_startup.json data/hospital_db.json
```

### الخطوة 3: إعادة تشغيل الخادم
شغّل الخادم مجدداً:
```bash
npm run dev
```
سيتعرف الخادم فوراً على الملف الجديد، وسيتحقق من سلامة بنيته، ويطبع رسالة النجاح:
```text
[JsonDatabaseEngine] Database successfully loaded (4 patients, 4 visits).
[JsonDatabaseEngine] Initial startup backup created: hospital_db_..._startup.json
[Mit Ali Hospital Server] Running securely at http://127.0.0.1:3000
```
وتعود حالة الخادم فوراً إلى `status: "online"` وتستأنف جميع العيادات وأجهزة الاستقبال عملها الطبيعي.
