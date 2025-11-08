// Generate secure random secrets for JWT tokens
const crypto = require('crypto');

const generateSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

console.log('\n=== JWT Secrets ===\n');
console.log('Add these to your .env file:\n');
console.log(`JWT_ACCESS_SECRET=${generateSecret()}`);
console.log(`JWT_REFRESH_SECRET=${generateSecret()}`);
console.log('\n');
