# Render Deployment Configuration for ClassQuiz

Follow these settings exactly in the Render Dashboard:

1. **Service Type**: Web Service
2. **Name**: `class-quiz` (أو أي اسم تفضله)
3. **Region**: `Oregon (US West)` (أو الأقرب لك)
4. **Branch**: `main`
5. **Root Directory**: `(اتركه فارغاً)`
6. **Runtime**: `Node`
7. **Build Command**: `npm install && npm run build`
8. **Start Command**: `node dist/index.js`
9. **Instance Type**: `Free`
10. **Environment Variables**:
    - `NODE_ENV`: `production`
11. **Health Check Path**: `/api/health`
12. **Port**: `10000` (سيقوم Render بتمرير هذا عبر `process.env.PORT` تلقائياً)

---

### ملفات تم تعديلها/إضافتها:
- **render.yaml**: تم إنشاؤه في المجلد الرئيسي لتسهيل الربط التلقائي.
- **server/routes.ts**: تم إضافة مسار `/api/health` للتأكد من عمل السيرفر بنجاح أثناء النشر.

### هيكل المجلدات النهائي (المهم للنشر):
```
/
├── dist/
│   ├── index.js      # ملف السيرفر المجمع
│   └── public/       # ملفات الواجهة الأمامية (React)
├── package.json
├── render.yaml
└── ...
```

### أوامر للنسخ في Render:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
