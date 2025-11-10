# @uploadme/node

Node.js SDK for UploadMe file upload service. Perfect for server-side file uploads, backend integrations, and automation scripts.

## Installation

```bash
npm install @weirdlookingjay/uploadme-node
# or
yarn add @weirdlookingjay/uploadme-node
# or
pnpm add @weirdlookingjay/uploadme-node
```

## Quick Start

```javascript
const { UploadMeClient } = require('@weirdlookingjay/uploadme-node');

// Initialize client
const client = new UploadMeClient({
  apiKey: 'your-api-key-here',
  apiUrl: 'http://localhost:4000/api/v1', // Optional, defaults to production
});

// Upload a file
async function uploadFile() {
  const file = await client.uploadFile('./image.jpg', {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
    },
  });

  console.log('Uploaded:', file.url);
}

uploadFile();
```

## Features

- ✅ **File Upload** - From file path, buffer, or stream
- ✅ **Progress Tracking** - Real-time upload progress
- ✅ **File Management** - List, get, delete files
- ✅ **File Download** - Download files to local disk
- ✅ **TypeScript Support** - Full type definitions
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **Async/Await** - Modern promise-based API

## API Reference

### Initialize Client

```javascript
const client = new UploadMeClient({
  apiKey: 'your-api-key-here',
  apiUrl: 'http://localhost:4000/api/v1', // Optional
});
```

### Upload Methods

#### Upload from File Path

```javascript
const file = await client.uploadFile('./document.pdf', {
  onProgress: (progress) => {
    console.log(`${progress.percentage}% complete`);
  },
});
```

#### Upload from Buffer

```javascript
const buffer = fs.readFileSync('./image.png');
const file = await client.uploadBuffer(buffer, 'image.png', {
  onProgress: (progress) => console.log(progress),
});
```

#### Upload from Stream

```javascript
const stream = fs.createReadStream('./video.mp4');
const stats = fs.statSync('./video.mp4');

const file = await client.uploadStream(stream, 'video.mp4', stats.size, {
  onProgress: (progress) => console.log(progress),
});
```

### File Management

#### List Files

```javascript
const result = await client.listFiles({
  page: 1,
  limit: 20,
  search: 'image',
});

console.log(`Total files: ${result.total}`);
result.files.forEach((file) => {
  console.log(`- ${file.originalName} (${file.size} bytes)`);
});
```

#### Get File Details

```javascript
const file = await client.getFile('file-id-here');
console.log(file);
```

#### Delete File

```javascript
await client.deleteFile('file-id-here');
console.log('File deleted');
```

#### Download File

```javascript
await client.downloadFile('file-id-here', './downloaded-file.jpg');
console.log('File downloaded');
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import { UploadMeClient, UploadedFile, UploadProgress } from '@weirdlookingjay/uploadme-node';

const client = new UploadMeClient({
  apiKey: process.env.UPLOADME_API_KEY!,
});

const file: UploadedFile = await client.uploadFile('./image.jpg');
```

## Examples

### Upload Multiple Files

```javascript
const files = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

for (const filePath of files) {
  const file = await client.uploadFile(filePath);
  console.log(`Uploaded: ${file.originalName}`);
}
```

### Upload with Progress Bar

```javascript
const cliProgress = require('cli-progress');

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
progressBar.start(100, 0);

const file = await client.uploadFile('./large-file.zip', {
  onProgress: (progress) => {
    progressBar.update(progress.percentage);
  },
});

progressBar.stop();
console.log('Upload complete!');
```

### Batch Upload with Error Handling

```javascript
async function batchUpload(filePaths) {
  const results = [];

  for (const filePath of filePaths) {
    try {
      const file = await client.uploadFile(filePath);
      results.push({ success: true, file });
    } catch (error) {
      results.push({ success: false, error: error.message, filePath });
    }
  }

  return results;
}

const results = await batchUpload(['file1.jpg', 'file2.pdf', 'file3.png']);
console.log(results);
```

### Download All Files

```javascript
async function downloadAllFiles(outputDir) {
  const { files } = await client.listFiles({ limit: 100 });

  for (const file of files) {
    const outputPath = path.join(outputDir, file.originalName);
    await client.downloadFile(file.id, outputPath);
    console.log(`Downloaded: ${file.originalName}`);
  }
}

await downloadAllFiles('./downloads');
```

## Error Handling

```javascript
try {
  const file = await client.uploadFile('./image.jpg');
} catch (error) {
  if (error.response) {
    // API error
    console.error('API Error:', error.response.data.error.message);
  } else if (error.request) {
    // Network error
    console.error('Network Error:', error.message);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

## Environment Variables

```bash
# .env
UPLOADME_API_KEY=your-api-key-here
UPLOADME_API_URL=http://localhost:4000/api/v1
```

```javascript
require('dotenv').config();

const client = new UploadMeClient({
  apiKey: process.env.UPLOADME_API_KEY,
  apiUrl: process.env.UPLOADME_API_URL,
});
```

## Getting Your API Key

### Local Development

1. Start the UploadMe backend and dashboard
2. Visit `http://localhost:3000/dashboard/api-keys`
3. Click "Create API Key"
4. Copy the generated key

### Production

1. Sign up at your deployed UploadMe instance
2. Navigate to API Keys in the dashboard
3. Generate a new API key
4. Use it in your application

## Requirements

- Node.js >= 16.0.0
- Valid UploadMe API key

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/MrCoderClark/UploadApp
- Issues: https://github.com/MrCoderClark/UploadApp/issues
