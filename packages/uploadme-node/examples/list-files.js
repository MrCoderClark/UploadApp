/**
 * List Files Example
 * Fetch and display all uploaded files
 */

const { UploadMeClient } = require('../dist/index');

const client = new UploadMeClient({
  apiKey: 'your-api-key-here',
  apiUrl: 'http://localhost:4000/api/v1',
});

async function main() {
  try {
    console.log('📋 Fetching files...\n');

    const result = await client.listFiles({
      page: 1,
      limit: 10,
    });

    console.log(`Total files: ${result.total}`);
    console.log(`Page: ${result.page} of ${result.totalPages}\n`);

    if (result.files.length === 0) {
      console.log('No files found.');
      return;
    }

    result.files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.originalName}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`   Type: ${file.mimeType}`);
      console.log(`   URL: ${file.url}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
