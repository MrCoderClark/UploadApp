# UploadMe Node SDK – Installation & Configuration

SDK package: **`@weirdlookingjay/uploadme-node`**  
Use this from any Node.js backend, worker, script, or CLI.

---

## 1. Install the SDK

```bash
npm install @weirdlookingjay/uploadme-node
# or
yarn add @weirdlookingjay/uploadme-node
# or
pnpm add @weirdlookingjay/uploadme-node
```

**Requirements:**

- Node.js **≥ 16**
- A valid **UploadMe API key**

---

## 2. Get an API Key from UploadMe

### Local development

1. Run your UploadMe stack (API + web).
2. Open: `http://localhost:3000/dashboard/api-keys`.
3. Click **“Create API Key”**.
4. Copy the generated key (this is your `UPLOADME_API_KEY`).

### Production

1. Go to your deployed web app:  
   `https://upload-app-web.vercel.app/dashboard/api-keys`
2. Generate a new API key.
3. Copy and store it securely.

---

## 3. Configure Environment Variables

In your **other app**, create a `.env` (or similar) and add:

```bash
UPLOADME_API_KEY=your-api-key-here

# Local UploadMe backend
UPLOADME_API_URL=http://localhost:4000/api/v1

# Production UploadMe backend (Vercel API)
# UPLOADME_API_URL=https://upload-app-api.vercel.app/api/v1
```

Then load env vars (if you’re not already), e.g.:

```js
require('dotenv').config();
```

---

## 4. Initialize the Client

### CommonJS (require)

```js
const { UploadMeClient } = require('@weirdlookingjay/uploadme-node');

const client = new UploadMeClient({
  apiKey: process.env.UPLOADME_API_KEY,
  apiUrl: process.env.UPLOADME_API_URL, // optional, defaults to production
});
```

### TypeScript / ESM

```ts
import { UploadMeClient } from '@weirdlookingjay/uploadme-node';

const client = new UploadMeClient({
  apiKey: process.env.UPLOADME_API_KEY!,
  apiUrl: process.env.UPLOADME_API_URL, // optional
});
```

---

## 5. Core Usage Examples

### 5.1 Upload a File from Disk

```js
async function upload() {
  const file = await client.uploadFile('./image.jpg', {
    onProgress: (progress) => {
      console.log(`Upload: ${progress.percentage}%`);
    },
  });

  console.log('Uploaded file ID:', file.id);
  console.log('Uploaded file URL:', file.url);
}

upload();
```

### 5.2 Upload from Buffer

```js
const fs = require('fs');

async function uploadFromBuffer() {
  const buffer = fs.readFileSync('./photo.png');

  const file = await client.uploadBuffer(buffer, 'photo.png', {
    onProgress: (p) => console.log(p),
  });

  console.log('Uploaded:', file.url);
}
```

### 5.3 Upload from Stream

```js
const fs = require('fs');

async function uploadFromStream() {
  const stream = fs.createReadStream('./video.mp4');
  const stats = fs.statSync('./video.mp4');

  const file = await client.uploadStream(stream, 'video.mp4', stats.size, {
    onProgress: (p) => console.log(p),
  });

  console.log('Uploaded video ID:', file.id);
}
```

---

### 5.4 List Files

```js
const result = await client.listFiles({
  page: 1,
  limit: 20,
  search: 'invoice',
});

console.log(`Total files: ${result.total}`);
for (const f of result.files) {
  console.log(`${f.originalName} (${f.size} bytes)`);
}
```

### 5.5 Get File Details

```js
const file = await client.getFile('file-id-here');
console.log(file);
```

### 5.6 Delete a File

```js
await client.deleteFile('file-id-here');
console.log('File deleted');
```

### 5.7 Download a File to Disk

```js
await client.downloadFile('file-id-here', './downloaded.jpg');
console.log('File downloaded');
```

---

## 6. Error Handling Pattern

```js
try {
  const file = await client.uploadFile('./image.jpg');
  console.log('Uploaded:', file.url);
} catch (error) {
  if (error.response) {
    // API returned an error
    console.error('API Error:', error.response.data);
  } else if (error.request) {
    // No response from server
    console.error('Network Error:', error.message);
  } else {
    // Something else (config, code, etc.)
    console.error('Error:', error.message);
  }
}
```

---

## 7. Production vs Local Summary

- **Local dev**  
  `UPLOADME_API_URL=http://localhost:4000/api/v1`

- **Production**  
  `UPLOADME_API_URL=https://upload-app-api.vercel.app/api/v1`

The SDK talks to your **UploadMe API**, which now uses Backblaze B2 internally. Other apps only need **API key + API URL** – no Backblaze configuration.

---

## 8. Where This SDK Is Defined (Repo Layout)

- Package: `packages/uploadme-node`
- Entry point: `packages/uploadme-node/src/index.ts`
- NPM name: `@weirdlookingjay/uploadme-node`

This file (`SDK_NODE_USAGE.md`) is meant to be a quick, copy-pasteable guide when integrating UploadMe into other Node.js services.
