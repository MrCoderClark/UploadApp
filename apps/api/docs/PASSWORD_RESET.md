# Password Reset Flow

Complete password reset functionality with email notifications and security features.

## Features

✅ Secure token-based password reset  
✅ Email notifications with HTML templates  
✅ Token expiration (1 hour)  
✅ One-time use tokens  
✅ Automatic session invalidation after reset  
✅ Audit logging  
✅ Protection against email enumeration  
✅ Development mode console logging  

## API Endpoints

### 1. Request Password Reset

**POST** `/api/v1/auth/password-reset/request`

Sends a password reset email to the user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Note:** Always returns success to prevent email enumeration attacks.

---

### 2. Reset Password

**POST** `/api/v1/auth/password-reset/reset`

Resets the password using the token from the email.

**Request Body:**
```json
{
  "token": "uuid-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

### 3. Verify Reset Token

**GET** `/api/v1/auth/password-reset/verify/:token`

Checks if a reset token is valid (useful for frontend validation).

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

---

## Testing with Postman

### Step 1: Request Password Reset

1. **Method**: POST
2. **URL**: `http://localhost:4000/api/v1/auth/password-reset/request`
3. **Headers**: `Content-Type: application/json`
4. **Body**:
```json
{
  "email": "test@example.com"
}
```

### Step 2: Check Console for Reset Link

In **development mode**, the reset link will be printed to the console:

```
===========================================
🔐 PASSWORD RESET LINK (DEV MODE)
===========================================
User: Test User (test@example.com)
Link: http://localhost:3000/reset-password?token=abc-123-xyz
===========================================
```

Copy the token from the URL.

### Step 3: Reset Password

1. **Method**: POST
2. **URL**: `http://localhost:4000/api/v1/auth/password-reset/reset`
3. **Headers**: `Content-Type: application/json`
4. **Body**:
```json
{
  "token": "abc-123-xyz",
  "newPassword": "NewPassword123!"
}
```

### Step 4: Login with New Password

Use the login endpoint with your new password to verify it works.

---

## Email Configuration

### Development Mode

If email is not configured, reset links are printed to the console. This is perfect for local development.

### Production Mode

Configure SMTP settings in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@uploadme.com
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an "App Password"
3. Use the app password in `SMTP_PASSWORD`

---

## Security Features

### 1. Token Expiration
- Tokens expire after 1 hour
- Expired tokens cannot be used

### 2. One-Time Use
- Each token can only be used once
- After successful reset, token is marked as used

### 3. Session Invalidation
- All refresh tokens are revoked
- All active sessions are deleted
- User must login again after password reset

### 4. Email Enumeration Protection
- Always returns success, even if email doesn't exist
- Prevents attackers from discovering valid email addresses

### 5. Account Lockout Reset
- Login attempts counter is reset
- Account is unlocked if it was locked

### 6. Audit Logging
- All password reset requests are logged
- All successful resets are logged
- Includes metadata for security monitoring

---

## Error Handling

### Invalid Token
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired reset token"
  }
}
```

### Expired Token
```json
{
  "success": false,
  "error": {
    "message": "Reset token has expired"
  }
}
```

### Already Used Token
```json
{
  "success": false,
  "error": {
    "message": "Reset token has already been used"
  }
}
```

### Weak Password
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "newPassword",
        "message": "Password must contain at least one uppercase letter"
      }
    ]
  }
}
```

---

## Database Schema

The password reset flow uses the `PasswordReset` model:

```prisma
model PasswordReset {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Frontend Integration Example

```typescript
// Request password reset
async function requestPasswordReset(email: string) {
  const response = await fetch('/api/v1/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  // Show success message to user
  alert(data.message);
}

// Verify token (on reset password page load)
async function verifyToken(token: string) {
  const response = await fetch(`/api/v1/auth/password-reset/verify/${token}`);
  const data = await response.json();
  
  if (!data.data.valid) {
    // Show error: token is invalid or expired
    return false;
  }
  return true;
}

// Reset password
async function resetPassword(token: string, newPassword: string) {
  const response = await fetch('/api/v1/auth/password-reset/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect to login page
    window.location.href = '/login';
  }
}
```

---

## Testing Checklist

- [ ] Request reset for existing user
- [ ] Request reset for non-existing user (should still return success)
- [ ] Verify token is valid
- [ ] Reset password with valid token
- [ ] Try to use same token twice (should fail)
- [ ] Wait for token to expire and try to use it (should fail)
- [ ] Login with new password
- [ ] Verify old sessions are invalidated
- [ ] Check audit logs in database
