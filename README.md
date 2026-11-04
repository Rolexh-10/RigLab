# RigLab (نسخة Claude)

أداة عراقية لتجميع الكمبيوتر: بحث عن القطع ومقارنة سعرها بين المتاجر، سلة مشتريات تُقسَّم حسب المتجر وتنتهي بزر إحالة لموقع كل متجر، PC Builder مع فحص توافق، ميزانية ذكية، وأدوات (PSU/UPS/Upgrade/Monitor/Storage).

- الثيم: أسود + أحمر نيون، قائمة سفلية على الموبايل وعلوية على الشاشة الكبيرة، عربي RTL أولاً.
- **كل الأسعار والمتاجر الحالية تجريبية** (معلّمة في الواجهة). أزرار الشراء معطّلة بوسم «قريباً» حتى يوافق متجر حقيقي: انظر `docs/STORES.md`.

## تشغيل
```
node scripts/build.js          # dist/riglab.html و dist/riglab.artifact.html
node scripts/serve.js          # معاينة محلية
node --test tests/engine.test.js tests/ui-smoke.test.js   # 37 اختباراً (الواجهة تحتاج Playwright + Chrome)
```
