# Backblaze B2 Storage Setup Guide

This document explains how the UploadMe application uses Backblaze B2 for cloud storage and how to set it up.

## Overview

UploadMe uses **Backblaze B2** as the cloud storage provider for file uploads in production (Vercel). Files are stored in a **private bucket** and accessed via **signed URLs** for security.

## Architecture

- **Development**: Files stored locally in `./uploads` directory
- **Production (Vercel)**: Files stored in Backblaze B2 private bucket
- **Access Method**: Signed URLs (1-hour expiration) + API proxy for downloads
- **Security**: Private bucket with authentication required for all access

## Backblaze B2 Configuration

### 1. Create a Backblaze Account

1. Go to [backblaze.com](https://www.backblaze.com/b2/sign-up.html)
2. Sign up for a free account (10 GB free storage, no credit card required)

### 2. Create a Bucket

1. Navigate to **B2 Cloud Storage** → **Buckets**
2. Click **Create a Bucket**
3. Configure:
   - **Bucket Name**: `UploadMe` (or your preferred name)
   - **Files in Bucket are**: **Private** (important for security)
   - **Default Encryption**: Disable (optional)
   - **Object Lock**: Disable
4. Click **Create a Bucket**

### 3. Create Application Key

1. Go to **Application Keys** in the left sidebar
2. Click **Add a New Application Key**
3. Configure:
   - **Name of Key**: `UploadMe-API` (or your preferred name)
   - **Allow access to Bucket(s)**: Select your bucket (`UploadMe`)
   - **Type of Access**: Read and Write
   - **Allow List All Bucket Names**: Yes (optional)
   - **File name prefix**: Leave empty
   - **Duration**: Leave empty (no expiration)
4. Click **Create New Key**
5. **IMPORTANT**: Copy both values immediately (they're only shown once):
   - **keyID**: e.g., `00548c00289ca2c0000000001`
   - **applicationKey**: e.g., `K005bcjV35GKKQAswSam14hsHA4Egug`

### 4. Get Bucket Information

1. Go to **Buckets** → Click on your bucket (`UploadMe`)
2. Note down:
   - **Bucket Name**: `UploadMe`
   - **Bucket ID**: e.g., ``
   - **Endpoint**: e.g., ``
   - **Region**: e.g., `us-east-005`

## Environment Variables

### API (Vercel)

Add these environment variables in **Vercel Dashboard** → **upload-app-api** → **Settings** → **Environment Variables**:

```bash
# Backblaze B2 Configuration
B2_KEY_ID=''
B2_APPLICATION_KEY=''
B2_BUCKET_NAME=''
B2_BUCKET_ID=''
B2_ENDPOINT=''
B2_REGION=us-east-005
```

### Local Development (Optional)

If you want to test B2 locally, add to `apps/api/.env`:

```bash
# Backblaze B2 Configuration
B2_KEY_ID=''
B2_APPLICATION_KEY=''
B2_BUCKET_NAME=UploadMe
B2_BUCKET_ID=''
B2_ENDPOINT=
B2_REGION=us-east-005
NODE_ENV=production  # Force B2 usage even in development
```

**Note**: By default, local development uses the local filesystem (`./uploads`). B2 is only used when `NODE_ENV=production` or `VERCEL=1`.

## How It Works

### Storage Provider Selection

The application automatically selects the storage provider based on the environment:

```typescript
// apps/api/src/services/storage.service.ts
const getStorageProvider = (): StorageProvider => {
  // Use B2 in production/Vercel if configured
  if ((config.isProduction || process.env.VERCEL === '1') && config.b2.keyId && config.b2.bucketName) {
    return new B2StorageProvider();
  }
  
  // Use local storage for development
  return new LocalStorageProvider();
};
```

### File Upload Flow

1. **Client** requests upload token: `POST /api/v1/direct-upload/prepare`
2. **Client** uploads file: `PUT /api/v1/direct-upload/:token`
3. **API** saves file to B2 using S3-compatible SDK
4. **API** stores file metadata in database with B2 path
5. **API** returns file record with URL

### File Access Flow

#### For Display (Images in Dashboard)

1. **Client** requests signed URL: `GET /api/v1/files/:fileId/url`
2. **API** generates temporary signed URL (1-hour expiration)
3. **Client** uses signed URL to display image via `<SecureImage>` component
4. **B2** serves file directly to client (Next.js Image optimization disabled)

#### For Download/Processing (Background Removal)

1. **Client** requests file via proxy: `GET /api/v1/files/:fileId/download`
2. **API** fetches file from B2
3. **API** returns file with CORS headers
4. **Client** processes file (e.g., background removal)

**Why proxy?** Avoids CORS issues when JavaScript needs to fetch files directly.

## Code Structure

### Backend (API)

- **`apps/api/src/services/b2Storage.service.ts`**: B2 storage provider implementation
- **`apps/api/src/services/storage.service.ts`**: Storage abstraction layer
- **`apps/api/src/routes/files.routes.ts`**: File access endpoints (signed URLs, proxy)
- **`apps/api/src/routes/directUpload.routes.ts`**: File upload endpoints
- **`apps/api/src/config/index.ts`**: B2 configuration

### Frontend (Web)

- **`apps/web/src/components/SecureImage.tsx`**: Component for displaying images with signed URLs
- **`apps/web/src/app/dashboard/files/page.tsx`**: Files dashboard (uses SecureImage and proxy)

## Key Features

### Private Bucket Security

- ✅ All files stored in private bucket
- ✅ No public access to files
- ✅ Authentication required for all file access
- ✅ Signed URLs expire after 1 hour
- ✅ User ownership verified before access

### CORS Handling

- ✅ No CORS configuration needed on B2
- ✅ API acts as proxy for file downloads
- ✅ Signed URLs used for direct image display
- ✅ Works seamlessly with Next.js Image component

### Cost Optimization

- ✅ Free tier: 10 GB storage, 1 GB daily download
- ✅ Signed URLs cached in frontend to reduce API calls
- ✅ 1-hour expiration balances security and performance

## Troubleshooting

### Files Not Uploading to B2

**Check:**
1. Environment variables are set in Vercel
2. `B2_KEY_ID` and `B2_APPLICATION_KEY` are correct
3. Application Key has Read/Write access to the bucket
4. Vercel logs show "✅ Using B2 Storage Provider"

**Fix:**
- Verify credentials in Backblaze Dashboard → Application Keys
- Redeploy after updating environment variables

### Images Not Displaying

**Check:**
1. Bucket is set to **Private** (not Public)
2. Signed URLs are being generated correctly
3. API endpoint `/api/v1/files/:fileId/url` is working

**Fix:**
- Check Vercel logs for errors
- Verify file exists in B2 bucket
- Test signed URL endpoint directly

### Background Removal Not Working

**Check:**
1. API proxy endpoint `/api/v1/files/:fileId/download` is working
2. CORS headers are set correctly in proxy response

**Fix:**
- Check browser console for CORS errors
- Verify proxy endpoint returns file with correct headers

### "Malformed Access Key Id" Error

**Cause:** Wrong keyID format or incorrect credentials

**Fix:**
1. Delete old Application Key in Backblaze
2. Create new Application Key
3. Copy **keyID** (starts with `005...`) and **applicationKey** (starts with `K005...`)
4. Update Vercel environment variables
5. Redeploy

## Migration Guide

### From Local Storage to B2

1. Create Backblaze account and bucket (see above)
2. Create Application Key (see above)
3. Add environment variables to Vercel
4. Deploy application
5. Test file upload and display

**Note:** Existing files in local storage won't be migrated automatically. You'll need to manually upload them to B2 or implement a migration script.

### From B2 to Another Provider

1. Implement new `StorageProvider` (e.g., `S3StorageProvider`, `CloudflareR2Provider`)
2. Update `getStorageProvider()` in `storage.service.ts`
3. Add new environment variables
4. Deploy and test

## Security Best Practices

1. ✅ **Never commit credentials** to Git
2. ✅ **Use Application Keys** (not Master Key) with minimal permissions
3. ✅ **Keep bucket private** - never set to Public
4. ✅ **Rotate keys periodically** for security
5. ✅ **Use signed URLs** with short expiration times
6. ✅ **Verify user ownership** before granting file access
7. ✅ **Revoke old keys** when creating new ones

## Costs

### Backblaze B2 Pricing (as of 2024)

- **Storage**: $0.005/GB/month (first 10 GB free)
- **Download**: $0.01/GB (first 1 GB/day free)
- **API Calls**: Free (Class B: downloads, Class C: uploads)

### Estimated Monthly Cost

For a small app with 100 users:
- **Storage**: 50 GB × $0.005 = $0.25/month
- **Download**: 20 GB × $0.01 = $0.20/month
- **Total**: ~$0.45/month

**Free tier covers**: 10 GB storage + 30 GB downloads/month

## Support

- **Backblaze Docs**: https://www.backblaze.com/b2/docs/
- **S3 Compatible API**: https://www.backblaze.com/b2/docs/s3_compatible_api.html
- **AWS SDK for JavaScript**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/

## Changelog

- **2024-11-14**: Initial B2 integration with private bucket and signed URLs
- **2024-11-14**: Added API proxy endpoint for CORS-free downloads
- **2024-11-14**: Implemented SecureImage component for signed URL caching
