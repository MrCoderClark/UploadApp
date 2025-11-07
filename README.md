# UploadMe 🚀

A security-first, production-ready file upload platform with resumable uploads, virus scanning, and AI-powered utilities.

## 🌟 Features

### Core Features
- **Resumable Uploads**: Built on tus protocol for reliable large file uploads
- **Security First**: Virus scanning, signed URLs, file validation, JWT auth
- **AI-Powered**: Automatic OCR, EXIF extraction, thumbnail generation
- **Developer Experience**: Simple setup, excellent TypeScript support
- **Real-time Feedback**: WebSocket-based progress tracking
- **Modular Storage**: Local storage with easy extensibility for S3, GCS, etc.

### Client SDK
- `<UploadButton />` - One-click upload with drag & drop
- `<UploadDropzone />` - Drop area with previews
- `useUpload()` - Programmatic upload hook with resumable support
- Client-side compression and chunking
- Custom metadata with Zod validation

### Server SDK
- Upload router with middleware support
- Signed URL generation with expiration
- Upload lifecycle hooks and webhooks
- File validation with magic number detection
- Retention policies and archival

### Platform
- Admin dashboard with analytics
- API key management with RBAC
- Upload logs and bandwidth tracking
- Interactive API playground
- CLI tool for quick setup

## 🏗️ Architecture

```
uploadme/
├── apps/
│   ├── web/          # Next.js frontend + dashboard
│   ├── api/          # Express backend
│   └── docs/         # Documentation site
├── packages/
│   ├── client/       # React SDK
│   ├── server/       # Node.js SDK
│   ├── shared/       # Shared types & utilities
│   └── cli/          # CLI tool
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL
- Redis
- (Optional) ClamAV for virus scanning

### Installation

```bash
# Clone and install
git clone <repo>
cd uploadme
npm install

# Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Configure your database and Redis in .env files

# Run migrations
cd apps/api
npx prisma migrate dev

# Start development
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- Docs: http://localhost:3001

## 📦 Usage

### Client-Side

```tsx
import { UploadButton, UploadDropzone, useUpload } from '@uploadme/client';

// Simple button
<UploadButton
  endpoint="imageUpload"
  onUploadComplete={(file) => console.log('Uploaded:', file)}
/>

// Dropzone with preview
<UploadDropzone
  endpoint="videoUpload"
  maxSize="100MB"
  accept={{ 'video/*': ['.mp4', '.mov'] }}
  onUploadProgress={(progress) => console.log(progress)}
/>

// Programmatic hook
const { upload, progress, cancel, resume } = useUpload({
  endpoint: 'documentUpload',
  resumable: true
});
```

### Server-Side

```typescript
import { createUploadRouter } from '@uploadme/server';

export const uploadRouter = createUploadRouter({
  imageUpload: {
    maxSize: '5MB',
    accept: ['image/jpeg', 'image/png'],
    middleware: async (req) => {
      // Auth check
      const user = await authenticate(req);
      return { userId: user.id };
    },
    onUploadComplete: async (file, metadata) => {
      // Process file
      await generateThumbnail(file);
      await extractEXIF(file);
    }
  }
});
```

## 🔒 Security Features

- **File Validation**: MIME type, size, extension, magic number verification
- **Virus Scanning**: ClamAV integration for malware detection
- **Signed URLs**: Time-limited, permission-scoped upload URLs
- **JWT Authentication**: Secure API access
- **Rate Limiting**: Prevent abuse
- **CORS Configuration**: Controlled cross-origin access

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express, Prisma, PostgreSQL, Redis
- **File Processing**: BullMQ, Sharp, FFmpeg, Tesseract
- **Storage**: Modular (Local, S3-ready)
- **Security**: JWT, ClamAV, Helmet
- **Protocols**: tus (resumable uploads)

## 📚 Documentation

Full documentation available at `/apps/docs` or visit the docs site when running.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details
