# RigLab (نسخة Claude)

أداة عراقية لتجميع الكمبيوتر: بحث عن القطع ومقارنة سعرها بين المتاجر، سلة مشتريات تُقسَّم حسب المتجر وتنتهي بزر إحالة لموقع كل متجر، PC Builder مع فحص توافق، ميزانية ذكية، وأدوات (PSU/UPS/Upgrade/Monitor/Storage).

- الثيم: أسود + أحمر نيون، قائمة سفلية على الموبايل وعلوية على الشاشة الكبيرة، عربي RTL أولاً.
- **كل الأسعار والمتاجر الحالية تجريبية** (معلّمة في الواجهة). أزرار الشراء معطّلة بوسم «قريباً» حتى يوافق متجر حقيقي: انظر `docs/STORES.md`.

## تشغيل
```
npm install          # esbuild, react, tsx, typescript, playwright (devDependencies)
npm run build        # dist/riglab.html و dist/riglab.artifact.html
npm run typecheck    # tsc strict على src/core و src/data
npm run serve        # معاينة محلية عبر HTTP (الموديلات ملفات خارجية؛ file:// لا يحمّل الـ GLB) — انظر docs/3D-ASSETS.md
npm run test:unit    # اختبارات المنطق (Node فقط، بدون متصفح)
npm run test:ui      # يبني ثم يشغل اختبارات الواجهة (تحتاج Playwright + Chrome)
```
الهيكل والقرارات: `docs/ARCHITECTURE.md`.
