# UploadMe API

Backend API server for UploadMe file upload platform.

## Setup

### 1. Install Dependencies

```bash
cd apps/api
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

**Important:** Update these values in your `.env`:
- `JWT_ACCESS_SECRET` - Generate a secure random string (32+ characters)
- `JWT_REFRESH_SECRET` - Generate a different secure random string
- `DATABASE_URL` - Your PostgreSQL connection string
- `REDIS_URL` - Your Redis connection string

### 3. Run Database Migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:4000`

## API Endpoints

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      ...
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## Testing with cURL

### Register a new user
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Get current user (replace TOKEN with your access token)
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Database Schema

The API uses Prisma ORM with PostgreSQL. Key models:

- **User** - User accounts with authentication
- **Session** - Active user sessions
- **RefreshToken** - JWT refresh tokens
- **Organization** - Team/workspace management
- **OrganizationMember** - Team membership with roles
- **ApiKey** - API key management
- **Upload** - File upload records
- **AuditLog** - Security and activity logs
- **Webhook** - Webhook configurations

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT access & refresh tokens
- ✅ Account lockout after failed login attempts
- ✅ Session management
- ✅ Request validation with Zod
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers

## Development

### View Database
```bash
npx prisma studio
```

### Create Migration
```bash
npx prisma migrate dev --name migration_name
```

### Reset Database
```bash
npx prisma migrate reset
```

## Tech Stack

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis
- **Authentication:** JWT
- **Validation:** Zod
- **Logging:** Winston + Morgan
