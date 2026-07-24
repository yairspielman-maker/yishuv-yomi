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
    locality-coordinates.prototype.json
    localities.mock.js
    localities.official.json
    region-mapping.json
    subscribers.example.json
  docs/
    CURRENT_ISSUES.md
  lib/
    constants.js
    coordinates.js
    env.js
    localities.js
    messages.js
    mini-express.js
    phone.js
    settings.js
  scripts/
    build-map-prototype-data.js
    import-localities.js
    validate-data.js
  test/
    api.test.js
    coordinates.test.js
    data-validation.test.js
    env.test.js
    frontend-bootstrap.test.js
    localities.test.js
    messages.test.js
    phone.test.js
    settings.test.js
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

## בדיקות ואימות נתונים

להרצת בדיקות היחידה ובדיקת זרימות ה-API:

```powershell
npm test
```

להפקת דו"ח תקינות של מאגר היישובים הרשמי:

```powershell
npm run validate:data
```

הדו"ח כולל ספירת רשומות, כפילויות, שדות חסרים, ספירה לפי אזור והתאמה בין `count` לאורך מערך היישובים.

ה-backend הוא מקור האמת לבחירת המקבץ, ל-`shownLocalityIds` ולנוסח הודעות WhatsApp. ה-frontend שומר מקומית רק הגדרות ממשק ורצף ביקורים.

## אב-טיפוס מפת התמצאות

כרטיס יישוב יכול להציג מפת Leaflet קטנה עם שכבת OpenStreetMap, סמן במרכז היישוב ומעגל ברדיוס 5 ק"מ. המפה נועדה להקשר מרחבי בלבד, אינה כלי ניווט ואינה משנה את בחירת המקבץ או את ההתקדמות.

המשאב הרשמי שנבדק מכיל את השדות `city_code`, `city_name_he`, `city_name_en`, `region_name`, `PIBA_bureau_name` ופרטי מועצה אזורית. אין בו קווי אורך ורוחב, קואורדינטות רשת או centroid. לכן אב-הטיפוס משתמש במטמון קטן ונפרד:

```text
data/locality-coordinates.prototype.json
```

המטמון כולל 16 יישובים מאומתים לפי `officialCode`: מטולה, קצרין, ראש פינה, טבריה, עפולה, חיפה, נתניה, תל אביב - יפו, בית שמש, אשדוד, באר שבע, מצפה רמון, חצבה, אילת, אבו גוש ומבשרת ציון. ירושלים אינה כלולה כרגע משום ששירות המקור החזיר שני גבולות מנהליים תואמים ללא נקודת יישוב יחידה, ולכן לא נבחרה קואורדינטה באופן שרירותי.

לבנייה מחדש של מטמון האב-טיפוס:

```powershell
npm run build:map-prototype
```

הסקריפט משתמש ב-Nominatim של OpenStreetMap באופן חד-פעמי, טורי ומוגבל לבקשה אחת בכל 1.2 שניות. הוא שומר תוצאות מאומתות במטמון, מדווח על כישלונות או התאמות עמומות ואינו מבצע geocoding בזמן הרצת האתר. יש לעיין ב-[מדיניות השימוש של Nominatim](https://operations.osmfoundation.org/policies/nominatim/) לפני הרחבת המדגם.

בזמן צפייה אנושית בדף, Leaflet טוען רק את אריחי המפה הנחוצים לתצוגה הנוכחית מ-OpenStreetMap ומציג ייחוס גלוי. אין הורדה מוקדמת או שמירת מפות לשימוש לא מקוון. פרטי המדיניות נמצאים ב-[OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

אפשר לכבות את האב-טיפוס בלי לפגוע בכרטיסים באמצעות:

```js
const ENABLE_CONTEXT_MAP_PROTOTYPE = false;
```

בראש `app.js`. כאשר אין ליישוב קואורדינטה, הכרטיס מציג הודעת חסר קצרה ואינו יוצר מפה ריקה.

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
- `POST /api/progress/mark-shown` - סימון יישוב כמוצג במקור ההתקדמות של השרת.
- `POST /api/reset-progress` - איפוס התקדמות למנוי.

`GET /api/status` מחזיר לדוגמה:

```json
{
  "backendRunning": true,
  "whatsappMode": "mock",
  "hasToken": false,
  "hasPhoneNumberId": false,
  "localitiesCount": 1306,
  "dataSource": "official",
  "mapPrototypeCount": 16
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

לשימוש מקומי מעתיקים את `.env.example` לקובץ `.env` וממלאים את הערכים. `server.js` טוען את הקובץ לפני קריאת `PORT` והגדרות WhatsApp. משתנים שכבר הוגדרו בסביבת התהליך מקבלים עדיפות על הקובץ.

לא להכניס טוקנים או סודות לקוד. `.env` לא אמור להיכנס ל-GitHub.

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
