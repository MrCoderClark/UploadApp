/**
 * Basic Upload Example
 * Upload a single file with progress tracking
 */

const { UploadMeClient } = require('../dist/index');
const path = require('path');

// Initialize client
const client = new UploadMeClient({
  apiKey: 'your-api-key-here',
  apiUrl: 'http://localhost:4000/api/v1',
});

async function main() {
  try {
    console.log('📤 Uploading file...\n');

    // Upload file with progress
    const file = await client.uploadFile(path.join(__dirname, 'test-file.txt'), {
      onProgress: (progress) => {
        process.stdout.write(`\rProgress: ${progress.percentage}%`);
      },
    });

    console.log('\n\n✅ Upload successful!');
    console.log('File ID:', file.id);
    console.log('Filename:', file.filename);
    console.log('URL:', file.url);
    console.log('Size:', file.size, 'bytes');
  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
  }
}

main();
