# יישוב יומי

אתר Hebrew-first לחשיפה יומית פסיבית ליישובי ישראל. המשתמש בוחר כמה יישובים לקבל בכל יום, באיזו שעה, ולאיזה מספר WhatsApp. המערכת מציגה באתר או מכינה לשליחה הודעות קצרות עם עובדות יבשות מתוך רשימת היישובים הרשמית של data.gov.il.

המוצר אינו אפליקציית מבחנים. המטרה היא ללמוד את יישובי ישראל בהדרגה, בלי להפוך את זה לשיעור.

## הרצה מקומית

מתוך תיקיית האפליקציה:

```powershell
cd localities-learning-app
npm install
npm start
```

ואז לפתוח בדפדפן:

```text
http://localhost:3000
```

לא לפתוח את `index.html` ישירות כאשר בודקים הרשמה או שליחה, כי ה-frontend צריך לדבר עם ה-API של השרת תחת `/api`.

## מבנה הריפו

אלה הקבצים שאמורים להיות ב-GitHub:

```text
localities-learning-app/
  .env.example
  .gitignore
  README.md
  package.json
  package-lock.json
  server.js
  index.html
  styles.css
  app.js
  data/
    localities.mock.js
    localities.official.json
    region-mapping.json
    subscribers.example.json
  lib/
    mini-express.js
  scripts/
    import-localities.js
```

לא להעלות ל-GitHub:

- `node_modules/`
- `.env`
- `data/subscribers.json`
- קבצי log/cache
- קבצי dependency שנוצרו על ידי npm

## מקור הנתונים

הנתונים מגיעים ממאגר data.gov.il:

- Dataset: “רשימת ישובים בישראל - מתעדכן”
- CKAN package id: `citiesandsettelments`
- Resource עם כותרות באנגלית: `8f714b6f-c35c-4b40-a0e7-547b675eee0e`
- Dataset: https://data.gov.il/dataset/citiesandsettelments
- API metadata: https://data.gov.il/api/3/action/package_show?id=citiesandsettelments

הקובץ הרשמי המנורמל נשמר כאן:

```text
data/localities.official.json
```

הקובץ נכלל בריפו כדי שהאפליקציה תעבוד מיד אחרי התקנה. אם הוא חסר, השרת נופל חזרה ל-`data/localities.mock.js` כמדגם פיתוח בלבד.

## רענון רשימת היישובים

מתוך תיקיית `localities-learning-app`:

```powershell
npm run import:localities
```

או:

```powershell
node scripts/import-localities.js
```

הייבוא יוצר מחדש את:

```text
data/localities.official.json
```

## מודל יישוב

כל יישוב מנורמל למבנה:

```js
{
  id: "official-7",
  hebrewName: "שחר",
  englishName: "SHAHAR",
  officialCode: "7",
  district: "אשקלון",
  region: "אשקלון",
  localityType: "",
  facts: [
    "אין מידע קצר זמין כרגע",
    "מחוז: אשקלון",
    "אזור לימודי: אשקלון"
  ]
}
```

המאגר הרשמי אינו מאגר היסטורי, ולכן לא ממציאים משמעות שמות, היסטוריה או עובדות תרבותיות. אם אין מידע קצר אמין, מציגים:

```text
אין מידע קצר זמין כרגע
```

## API

- `GET /api/status` - סטטוס backend, מצב WhatsApp ומקור נתונים.
- `GET /api/localities/count` - מספר היישובים שנטענו.
- `GET /api/localities/sample` - מדגם קטן לפיתוח.
- `GET /api/localities/regions` - רשימת אזורי לימוד.
- `GET /api/today-preview` - הודעת היום לפי הגדרות.
- `POST /api/subscribe` - הרשמה או עדכון מנוי.
- `POST /api/unsubscribe` - כיבוי מנוי.
- `POST /api/send-test` - שליחת בדיקה או הדפסה ב-mock mode.
- `POST /api/reset-progress` - איפוס התקדמות למנוי.

`GET /api/status` מחזיר לדוגמה:

```json
{
  "backendRunning": true,
  "whatsappMode": "mock",
  "hasToken": false,
  "hasPhoneNumberId": false,
  "localitiesCount": 1306,
  "dataSource": "official"
}
```

## WhatsApp

משתני הסביבה נמצאים ב-`.env.example`:

```env
PORT=3000
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=
WHATSAPP_TEMPLATE_LANGUAGE=he
```

לא להכניס טוקנים או סודות לקוד. לשימוש מקומי יוצרים קובץ `.env` בלבד, והוא לא אמור להיכנס ל-GitHub.

אם חסרים פרטי WhatsApp Cloud API, השרת נשאר ב-mock mode:

- ההרשמה עובדת.
- `send-test` מחזיר הצלחה.
- כל הודעה מודפסת בקונסול השרת.
- ה-UI מציג שההודעה הודפסה בשרת ולא נשלחה בפועל.

לשליחה אמיתית צריך WhatsApp Cloud API ותבנית הודעה מאושרת.

## נתוני מנויים ופרטיות

הקובץ המקומי:

```text
data/subscribers.json
```

נוצר בזמן הרצה ויכול להכיל מספרי טלפון. לכן הוא נמצא ב-`.gitignore` ולא אמור להיכנס ל-GitHub. יש במקום זאת קובץ דוגמה ריק:

```text
data/subscribers.example.json
```

לפני commit, לבדוק שאין:

- מספרי טלפון אמיתיים
- WhatsApp tokens
- `.env`
- קבצי `node_modules`

## קישורי setup למפתחים

- WhatsApp Cloud API setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- Meta App Dashboard: https://developers.facebook.com/apps/
- WhatsApp Message Templates: https://business.facebook.com/wa/manage/message-templates/
- WhatsApp Platform Pricing: https://whatsappbusiness.com/products/platform-pricing
