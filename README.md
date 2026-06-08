# ׳™׳™׳©׳•׳‘ ׳™׳•׳׳™

׳׳×׳¨ Hebrew-first ׳׳—׳©׳™׳₪׳” ׳™׳•׳׳™׳× ׳₪׳¡׳™׳‘׳™׳× ׳׳™׳™׳©׳•׳‘׳™ ׳™׳©׳¨׳׳. ׳”׳׳©׳×׳׳© ׳‘׳•׳—׳¨ ׳׳¡׳₪׳¨ ׳™׳™׳©׳•׳‘׳™׳ ׳‘׳™׳•׳, ׳©׳¢׳” ׳•׳׳¡׳₪׳¨ WhatsApp, ׳•׳”׳׳¢׳¨׳›׳× ׳׳›׳™׳ ׳” ׳׳• ׳©׳•׳׳—׳× ׳”׳•׳“׳¢׳•׳× ׳§׳¦׳¨׳•׳× ׳¢׳ ׳¢׳•׳‘׳“׳•׳× ׳™׳‘׳©׳•׳× ׳¢׳ ׳™׳™׳©׳•׳‘׳™׳ ׳׳×׳•׳ ׳¨׳©׳™׳׳× ׳”׳™׳™׳©׳•׳‘׳™׳ ׳”׳¨׳©׳׳™׳× ׳©׳ data.gov.il.

׳”׳׳•׳¦׳¨ ׳׳™׳ ׳• ׳׳₪׳׳™׳§׳¦׳™׳™׳× ׳׳‘׳—׳ ׳™׳. ׳”׳•׳ ׳ ׳•׳¢׳“ ׳׳¢׳–׳•׳¨ ׳׳׳׳•׳“ ׳׳× ׳™׳™׳©׳•׳‘׳™ ׳™׳©׳¨׳׳ ׳‘׳”׳“׳¨׳’׳”, ׳‘׳׳™ ׳׳”׳₪׳•׳ ׳׳× ׳–׳” ׳׳©׳™׳¢׳•׳¨.

## ׳”׳¨׳¦׳” ׳׳§׳•׳׳™׳×

׳׳×׳•׳ ׳×׳™׳§׳™׳™׳× ׳”׳¨׳™׳₪׳• ׳©׳ ׳”׳׳₪׳׳™׳§׳¦׳™׳”:

```powershell
cd localities-learning-app
npm install
npm start
```

׳•׳׳– ׳׳₪׳×׳•׳—:

```text
http://localhost:3000
```

׳׳ ׳׳₪׳×׳•׳— ׳׳× `index.html` ׳™׳©׳™׳¨׳•׳× ׳›׳׳©׳¨ ׳‘׳•׳“׳§׳™׳ ׳”׳¨׳©׳׳” ׳׳• ׳©׳׳™׳—׳”, ׳›׳™ ׳”-frontend ׳¦׳¨׳™׳ ׳׳“׳‘׳¨ ׳¢׳ `/api`.

## ׳׳‘׳ ׳” ׳§׳‘׳¦׳™׳ ׳ ׳§׳™ ׳׳¨׳™׳₪׳•

׳׳׳” ׳”׳§׳‘׳¦׳™׳ ׳©׳׳׳•׳¨׳™׳ ׳׳”׳™׳•׳× ׳‘-GitHub:

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

׳׳ ׳׳”׳¢׳׳•׳×:

- `node_modules/`
- `.env`
- `data/subscribers.json`
- ׳§׳‘׳¦׳™ log/cache
- ׳§׳‘׳¦׳™ dependency ׳©׳ ׳•׳¦׳¨׳• ׳׳×׳•׳ npm

## ׳׳§׳•׳¨ ׳”׳ ׳×׳•׳ ׳™׳ ׳”׳¨׳©׳׳™

׳”׳ ׳×׳•׳ ׳™׳ ׳׳’׳™׳¢׳™׳ ׳׳׳׳’׳¨ data.gov.il:

- Dataset: ג€׳¨׳©׳™׳׳× ׳™׳©׳•׳‘׳™׳ ׳‘׳™׳©׳¨׳׳ - ׳׳×׳¢׳“׳›׳ג€
- CKAN package id: `citiesandsettelments`
- Resource ׳¢׳ ׳›׳•׳×׳¨׳•׳× ׳‘׳׳ ׳’׳׳™׳×: `8f714b6f-c35c-4b40-a0e7-547b675eee0e`
- Dataset: https://data.gov.il/dataset/citiesandsettelments
- API metadata: https://data.gov.il/api/3/action/package_show?id=citiesandsettelments

׳”׳§׳•׳‘׳¥ ׳”׳¨׳©׳׳™ ׳”׳׳ ׳•׳¨׳׳ ׳ ׳©׳׳¨ ׳›׳׳:

```text
data/localities.official.json
```

׳›׳¨׳’׳¢ ׳™׳© ׳‘׳• ׳׳¢׳ 1,000 ׳™׳™׳©׳•׳‘׳™׳, ׳•׳”׳•׳ ׳ ׳›׳׳ ׳‘׳¨׳™׳₪׳• ׳›׳“׳™ ׳©׳”׳׳₪׳׳™׳§׳¦׳™׳” ׳×׳¢׳‘׳•׳“ ׳׳™׳“ ׳׳—׳¨׳™ ׳”׳×׳§׳ ׳”.

## ׳¨׳¢׳ ׳•׳ ׳¨׳©׳™׳׳× ׳”׳™׳™׳©׳•׳‘׳™׳

׳׳×׳•׳ ׳×׳™׳§׳™׳™׳× `localities-learning-app`:

```powershell
npm run import:localities
```

׳׳•:

```powershell
node scripts/import-localities.js
```

׳”׳™׳™׳‘׳•׳ ׳™׳•׳¦׳¨ ׳׳—׳“׳© ׳׳×:

```text
data/localities.official.json
```

׳׳ ׳”׳§׳•׳‘׳¥ ׳”׳¨׳©׳׳™ ׳—׳¡׳¨, ׳”׳©׳¨׳× ׳ ׳•׳₪׳ ׳—׳–׳¨׳” ׳-`data/localities.mock.js` ׳›׳׳“׳’׳ ׳₪׳™׳×׳•׳— ׳‘׳׳‘׳“.

## ׳׳•׳“׳ ׳™׳™׳©׳•׳‘

׳›׳ ׳™׳™׳©׳•׳‘ ׳׳ ׳•׳¨׳׳ ׳׳׳‘׳ ׳”:

```js
{
  id: "official-7",
  hebrewName: "׳©׳—׳¨",
  englishName: "SHAHAR",
  officialCode: "7",
  district: "׳׳©׳§׳׳•׳",
  region: "׳׳©׳§׳׳•׳",
  localityType: "",
  facts: [
    "׳׳™׳ ׳׳™׳“׳¢ ׳§׳¦׳¨ ׳–׳׳™׳ ׳›׳¨׳’׳¢",
    "׳׳—׳•׳–: ׳׳©׳§׳׳•׳",
    "׳׳–׳•׳¨ ׳׳™׳׳•׳“׳™: ׳׳©׳§׳׳•׳"
  ]
}
```

׳”׳׳׳’׳¨ ׳”׳¨׳©׳׳™ ׳׳™׳ ׳• ׳׳׳’׳¨ ׳”׳™׳¡׳˜׳•׳¨׳™, ׳•׳׳›׳ ׳׳ ׳׳׳¦׳™׳׳™׳ ׳׳©׳׳¢׳•׳× ׳©׳׳•׳×, ׳”׳™׳¡׳˜׳•׳¨׳™׳” ׳׳• ׳¢׳•׳‘׳“׳•׳× ׳×׳¨׳‘׳•׳×׳™׳•׳×. ׳׳ ׳׳™׳ ׳׳™׳“׳¢ ׳§׳¦׳¨ ׳׳׳™׳, ׳׳¦׳™׳’׳™׳:

```text
׳׳™׳ ׳׳™׳“׳¢ ׳§׳¦׳¨ ׳–׳׳™׳ ׳›׳¨׳’׳¢
```

## API

- `GET /api/status` - ׳¡׳˜׳˜׳•׳¡ backend, ׳׳¦׳‘ WhatsApp ׳•׳׳§׳•׳¨ ׳ ׳×׳•׳ ׳™׳.
- `GET /api/localities/count` - ׳׳¡׳₪׳¨ ׳”׳™׳™׳©׳•׳‘׳™׳ ׳©׳ ׳˜׳¢׳ ׳•.
- `GET /api/localities/sample` - ׳׳“׳’׳ ׳§׳˜׳ ׳׳₪׳™׳×׳•׳—.
- `GET /api/localities/regions` - ׳¨׳©׳™׳׳× ׳׳–׳•׳¨׳™ ׳׳™׳׳•׳“.
- `GET /api/today-preview` - ׳”׳•׳“׳¢׳× ׳”׳™׳•׳ ׳׳₪׳™ ׳”׳’׳“׳¨׳•׳×.
- `POST /api/subscribe` - ׳”׳¨׳©׳׳” ׳׳• ׳¢׳“׳›׳•׳ ׳׳ ׳•׳™.
- `POST /api/unsubscribe` - ׳›׳™׳‘׳•׳™ ׳׳ ׳•׳™.
- `POST /api/send-test` - ׳©׳׳™׳—׳× ׳‘׳“׳™׳§׳” ׳׳• ׳”׳“׳₪׳¡׳” ׳‘-mock mode.
- `POST /api/reset-progress` - ׳׳™׳₪׳•׳¡ ׳”׳×׳§׳“׳׳•׳× ׳׳׳ ׳•׳™.

`GET /api/status` ׳׳—׳–׳™׳¨ ׳׳“׳•׳’׳׳”:

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

׳׳©׳×׳ ׳™ ׳”׳¡׳‘׳™׳‘׳” ׳ ׳׳¦׳׳™׳ ׳‘-`.env.example`:

```env
PORT=3000
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=
WHATSAPP_TEMPLATE_LANGUAGE=he
```

׳׳ ׳׳”׳›׳ ׳™׳¡ ׳˜׳•׳§׳ ׳™׳ ׳׳• ׳¡׳•׳“׳•׳× ׳׳§׳•׳“. ׳‘׳§׳•׳‘׳¥ `.env` ׳׳§׳•׳׳™ ׳‘׳׳‘׳“.

׳׳ ׳—׳¡׳¨׳™׳ ׳₪׳¨׳˜׳™ WhatsApp Cloud API, ׳”׳©׳¨׳× ׳ ׳©׳׳¨ ׳‘-mock mode:

- ׳”׳”׳¨׳©׳׳” ׳¢׳•׳‘׳“׳×.
- `send-test` ׳׳—׳–׳™׳¨ ׳”׳¦׳׳—׳”.
- ׳›׳ ׳”׳•׳“׳¢׳” ׳׳•׳“׳₪׳¡׳× ׳‘׳§׳•׳ ׳¡׳•׳ ׳”׳©׳¨׳×.
- ׳”-UI ׳׳•׳׳¨ ׳©׳”׳”׳•׳“׳¢׳” ׳”׳•׳“׳₪׳¡׳” ׳‘׳©׳¨׳× ׳•׳׳ ׳ ׳©׳׳—׳” ׳‘׳₪׳•׳¢׳.

׳׳©׳׳™׳—׳” ׳׳׳™׳×׳™׳× ׳¦׳¨׳™׳ WhatsApp Cloud API ׳•׳×׳‘׳ ׳™׳× ׳”׳•׳“׳¢׳” ׳׳׳•׳©׳¨׳×.

## ׳ ׳×׳•׳ ׳™ ׳׳ ׳•׳™׳™׳ ׳•׳₪׳¨׳˜׳™׳•׳×

׳”׳§׳•׳‘׳¥ ׳”׳׳§׳•׳׳™:

```text
data/subscribers.json
```

׳ ׳•׳¦׳¨ ׳‘׳–׳׳ ׳”׳¨׳¦׳” ׳•׳™׳›׳•׳ ׳׳”׳›׳™׳ ׳׳¡׳₪׳¨׳™ ׳˜׳׳₪׳•׳. ׳׳›׳ ׳”׳•׳ ׳ ׳׳¦׳ ׳‘-`.gitignore` ׳•׳׳ ׳׳׳•׳¨ ׳׳”׳™׳›׳ ׳¡ ׳-GitHub. ׳™׳© ׳‘׳׳§׳•׳ ׳–׳׳× ׳§׳•׳‘׳¥ ׳“׳•׳’׳׳” ׳¨׳™׳§:

```text
data/subscribers.example.json
```

׳׳₪׳ ׳™ commit, ׳׳‘׳“׳•׳§ ׳©׳׳™׳:

- ׳׳¡׳₪׳¨׳™ ׳˜׳׳₪׳•׳ ׳׳׳™׳×׳™׳™׳
- WhatsApp tokens
- `.env`
- ׳§׳‘׳¦׳™ `node_modules`

## ׳§׳™׳©׳•׳¨׳™ setup ׳׳׳₪׳×׳—׳™׳

- WhatsApp Cloud API setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- Meta App Dashboard: https://developers.facebook.com/apps/
- WhatsApp Message Templates: https://business.facebook.com/wa/manage/message-templates/
- WhatsApp Platform Pricing: https://whatsappbusiness.com/products/platform-pricing

