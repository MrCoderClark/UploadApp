# API Key Management

Complete API key management system with scopes, rate limiting, and usage tracking.

## Features

✅ Generate API keys with custom scopes  
✅ Key rotation (generate new, revoke old)  
✅ Key revocation  
✅ Usage tracking per key  
✅ Rate limiting per key  
✅ Key expiration policies  
✅ Secure key hashing (bcrypt)  
✅ Audit logging  
✅ Organization-scoped keys  

## API Key Format

API keys follow this format:
```
sk_test_abc12345def67890...  (Development)
sk_live_abc12345def67890...  (Production)
```

- `sk_` - Secret key prefix
- `test/live` - Environment indicator
- First 8 chars shown in UI for identification
- Full key is 64 characters (hashed in database)

## Scopes

Define what actions an API key can perform:

### Common Scopes
- `upload:read` - Read upload data
- `upload:write` - Create uploads
- `upload:delete` - Delete uploads
- `organization:read` - Read organization data
- `organization:write` - Modify organization
- `user:read` - Read user data
- `user:write` - Modify user data
- `admin:*` - Full admin access

## API Endpoints

### Create API Key

**POST** `/api/v1/api-keys`

Generate a new API key.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Production API Key",
  "scopes": ["upload:read", "upload:write"],
  "rateLimit": 5000,
  "expiresAt": "2026-01-01T00:00:00Z",
  "organizationId": "uuid-optional"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "Production API Key",
      "keyPrefix": "sk_test_abc12345",
      "scopes": ["upload:read", "upload:write"],
      "rateLimit": 5000,
      "isActive": true,
      "expiresAt": "2026-01-01T00:00:00.000Z",
      "createdAt": "2025-11-08T...",
      "usageCount": 0
    },
    "plainKey": "sk_test_abc12345def67890ghij12345klmno67890pqrst12345uvwxy67890z"
  },
  "message": "API key created successfully. Save the plain key securely - it will not be shown again."
}
```

**⚠️ IMPORTANT:** The `plainKey` is only shown once! Save it securely.

---

### Get API Keys

**GET** `/api/v1/api-keys`

Get all API keys for the authenticated user.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `organizationId` (optional) - Filter by organization

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "uuid",
        "name": "Production API Key",
        "keyPrefix": "sk_test_abc12345",
        "scopes": ["upload:read", "upload:write"],
        "rateLimit": 5000,
        "isActive": true,
        "lastUsedAt": "2025-11-08T...",
        "usageCount": 42,
        "createdAt": "2025-11-08T..."
      }
    ]
  }
}
```

**Note:** The full key is never returned after creation.

---

### Get API Key by ID

**GET** `/api/v1/api-keys/:id`

Get details of a specific API key.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "Production API Key",
      "keyPrefix": "sk_test_abc12345",
      "scopes": ["upload:read", "upload:write"],
      "rateLimit": 5000,
      "isActive": true,
      "expiresAt": "2026-01-01T00:00:00.000Z",
      "lastUsedAt": "2025-11-08T...",
      "usageCount": 42
    }
  }
}
```

---

### Update API Key

**PATCH** `/api/v1/api-keys/:id`

Update API key properties (not the key itself).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Updated API Key Name",
  "scopes": ["upload:read", "upload:write", "upload:delete"],
  "rateLimit": 10000,
  "isActive": true
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "Updated API Key Name",
      ...
    }
  }
}
```

---

### Revoke API Key

**POST** `/api/v1/api-keys/:id/revoke`

Revoke an API key (cannot be undone).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

### Rotate API Key

**POST** `/api/v1/api-keys/:id/rotate`

Generate a new key and revoke the old one.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "new-uuid",
      "name": "Production API Key (Rotated)",
      "keyPrefix": "sk_test_xyz98765",
      ...
    },
    "plainKey": "sk_test_xyz98765new_key_here..."
  },
  "message": "API key rotated successfully. Save the new key securely - it will not be shown again."
}
```

---

### Delete API Key

**DELETE** `/api/v1/api-keys/:id`

Permanently delete an API key.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

---

## Using API Keys

### Authentication Header

Include the API key in the `X-API-Key` header:

```bash
curl -X GET https://api.uploadme.com/api/v1/uploads \
  -H "X-API-Key: sk_live_abc12345def67890..."
```

### With Middleware

```typescript
import { authenticateApiKey, requireScopes } from './middleware/apiKeyAuth';

// Require API key authentication
app.get('/api/v1/uploads',
  authenticateApiKey,
  requireScopes(['upload:read']),
  uploadController.list
);

// Require multiple scopes
app.post('/api/v1/uploads',
  authenticateApiKey,
  requireScopes(['upload:write', 'organization:read']),
  uploadController.create
);
```

---

## Rate Limiting

Each API key has a rate limit (requests per hour).

**Default:** 1000 requests/hour

**When limit is exceeded:**
```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "statusCode": 429
  }
}
```

**Headers in response:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1699564800
```

---

## Testing with Postman

### 1. Create API Key

```
POST http://localhost:4000/api/v1/api-keys
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Test Key",
  "scopes": ["upload:read", "upload:write"],
  "rateLimit": 1000
}
```

**Save the `plainKey` from the response!**

### 2. Use API Key

```
GET http://localhost:4000/api/v1/uploads
X-API-Key: sk_test_abc12345def67890...
```

### 3. Check Usage

```
GET http://localhost:4000/api/v1/api-keys/KEY_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 4. Rotate Key

```
POST http://localhost:4000/api/v1/api-keys/KEY_ID/rotate
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Security Best Practices

### 1. Store Keys Securely
- Never commit API keys to version control
- Use environment variables
- Encrypt keys at rest
- Use secret management services (AWS Secrets Manager, Vault)

### 2. Scope Principle of Least Privilege
- Only grant necessary scopes
- Use separate keys for different services
- Regularly audit key permissions

### 3. Rotate Keys Regularly
- Rotate keys every 90 days
- Rotate immediately if compromised
- Use key rotation for zero-downtime updates

### 4. Monitor Usage
- Track API key usage
- Set up alerts for unusual activity
- Review audit logs regularly

### 5. Expiration
- Set expiration dates for temporary keys
- Remove unused keys
- Revoke keys when no longer needed

---

## Error Handling

### Invalid API Key
```json
{
  "success": false,
  "error": {
    "message": "Invalid API key",
    "statusCode": 401
  }
}
```

### Expired API Key
```json
{
  "success": false,
  "error": {
    "message": "API key has expired",
    "statusCode": 401
  }
}
```

### Revoked API Key
```json
{
  "success": false,
  "error": {
    "message": "API key has been revoked",
    "statusCode": 401
  }
}
```

### Missing Scopes
```json
{
  "success": false,
  "error": {
    "message": "Missing required scopes: upload:write",
    "statusCode": 403
  }
}
```

---

## Use Cases

### 1. Server-to-Server Authentication

```javascript
// Backend service calling UploadMe API
const axios = require('axios');

const uploadFile = async (file) => {
  const response = await axios.post('https://api.uploadme.com/api/v1/uploads', file, {
    headers: {
      'X-API-Key': process.env.UPLOADME_API_KEY,
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};
```

### 2. CI/CD Pipeline

```yaml
# GitHub Actions
- name: Upload Build Artifacts
  env:
    UPLOADME_API_KEY: ${{ secrets.UPLOADME_API_KEY }}
  run: |
    curl -X POST https://api.uploadme.com/api/v1/uploads \
      -H "X-API-Key: $UPLOADME_API_KEY" \
      -F "file=@dist/app.zip"
```

### 3. Third-Party Integration

```javascript
// Give limited access to third-party service
const apiKey = await createApiKey({
  name: "Analytics Service",
  scopes: ["upload:read"],  // Read-only
  rateLimit: 500,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});
```

---

## Database Schema

```prisma
model ApiKey {
  id             String   @id @default(uuid())
  name           String
  key            String   @unique // Hashed with bcrypt
  keyPrefix      String   // First 8 chars for display
  
  userId         String?
  organizationId String?
  
  scopes         String[] // Permissions
  rateLimit      Int?     @default(1000)
  
  isActive       Boolean  @default(true)
  expiresAt      DateTime?
  lastUsedAt     DateTime?
  usageCount     Int      @default(0)
  
  createdAt      DateTime @default(now())
  revokedAt      DateTime?
  
  user           User?         @relation(...)
  organization   Organization? @relation(...)
}
```

---

## Testing Checklist

- [ ] Create API key with scopes
- [ ] Use API key to authenticate request
- [ ] Verify scope checking works
- [ ] Test rate limiting
- [ ] Update API key properties
- [ ] Rotate API key
- [ ] Revoke API key
- [ ] Try using revoked key (should fail)
- [ ] Test expired key (should fail)
- [ ] Check usage tracking
- [ ] Verify audit logs
- [ ] Test organization-scoped keys
