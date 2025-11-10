/**
 * Batch Upload Example
 * Upload multiple files with error handling
 */

const { UploadMeClient } = require('../dist/index');
const path = require('path');
const fs = require('fs');

const client = new UploadMeClient({
  apiKey: 'your-api-key-here',
  apiUrl: 'http://localhost:4000/api/v1',
});

async function batchUpload(filePaths) {
  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = path.basename(filePath);

    try {
      console.log(`\n[${i + 1}/${filePaths.length}] Uploading ${fileName}...`);

      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const file = await client.uploadFile(filePath, {
        onProgress: (progress) => {
          process.stdout.write(`\rProgress: ${progress.percentage}%`);
        },
      });

      console.log(`\n✅ Success: ${file.url}`);
      results.push({ success: true, file, filePath });
    } catch (error) {
      console.log(`\n❌ Failed: ${error.message}`);
      results.push({ success: false, error: error.message, filePath });
    }
  }

  return results;
}

async function main() {
  const filesToUpload = [
    path.join(__dirname, 'file1.txt'),
    path.join(__dirname, 'file2.txt'),
    path.join(__dirname, 'file3.txt'),
  ];

  console.log('📤 Starting batch upload...');
  console.log(`Files to upload: ${filesToUpload.length}\n`);

  const results = await batchUpload(filesToUpload);

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${results.length}`);
}

main();
