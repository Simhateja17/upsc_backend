# Backend Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in the values

3. **Test services**
   ```bash
   npx tsx src/test-services.ts
   ```

4. **Push database schema**
   ```bash
   npx prisma db push
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

---

## Service Configuration Details

### 1. Resend (Email Service) ✉️

**What you need:** Just an API key

1. Sign up at [resend.com](https://resend.com)
2. Go to [API Keys](https://resend.com/api-keys)
3. Create a new API key
4. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

**Note:** For `RESEND_FROM_EMAIL`, you need to verify your domain in Resend dashboard first.

---

### 2. AWS Bedrock (AI Service) 🤖

**What you need:** AWS IAM credentials (not a simple API key)

#### Step-by-step setup:

1. **Create an AWS account** at [aws.amazon.com](https://aws.amazon.com)

2. **Enable Bedrock in your region**
   - Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
   - Choose your region (e.g., `us-east-1`)
   - Go to "Model access" → Request access to Claude models
   - Wait for approval (usually instant for Claude Instant, may take time for Claude 3)

3. **Create IAM credentials**
   - Go to [IAM Console](https://console.aws.amazon.com/iam)
   - Click "Users" → "Create user"
   - User name: `upsc-backend`
   - Select "Programmatic access"
   - Attach policy: `AmazonBedrockFullAccess`
   - Create user and copy credentials

4. **Add to `.env`:**
   ```
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxx
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
   ```

#### Available Models (as of 2024):
- `anthropic.claude-3-sonnet-20240229-v1:0` (Recommended - Good balance)
- `anthropic.claude-3-haiku-20240307-v1:0` (Faster, cheaper)
- `anthropic.claude-3-opus-20240229-v1:0` (Most capable, expensive)
- `anthropic.claude-instant-v1` (Fastest, cheapest)

**Pricing:** Pay per token. Roughly:
- Haiku: $0.25 per million input tokens
- Sonnet: $3 per million input tokens
- Opus: $15 per million input tokens

---

### 3. Supabase (Database + Storage) 🗄️

**What you need:** Already configured if you have the database running

Your existing `.env` should have:
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

**Storage Buckets:** Will be auto-created when server starts
- `pyq-pdfs` - PYQ PDF uploads
- `answer-uploads` - Student answer files
- `study-materials` - Library PDFs

---

## Testing Your Setup

Run the test script to verify everything works:

```bash
npx tsx src/test-services.ts
```

You should see:
```
✅ Resend connected successfully!
✅ Bedrock connected successfully!
✅ Supabase Storage connected!
```

---

## Common Issues

### Bedrock Access Denied
- Make sure you've requested model access in Bedrock console
- Check your IAM user has `AmazonBedrockFullAccess` policy
- Verify you're using the correct region

### Resend Email Not Sending
- Verify your domain in Resend dashboard
- Check the FROM email matches your verified domain

### Supabase Storage Not Working
- Ensure your Supabase project is not paused
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)

---

## Making an Admin User

After setting up, make yourself an admin:

1. Create an account through the normal signup flow
2. Run this SQL in Supabase SQL editor:
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = 'your@email.com';
   ```

---

## Estimated Costs

For a platform with ~1000 active users:

- **Resend:** Free tier (100 emails/day) or $20/month for 10,000 emails
- **AWS Bedrock:** ~$50-200/month depending on usage
- **Supabase:** Free tier sufficient for development, $25/month for production

Total: **$0-250/month** depending on scale

---

## Next Steps

1. ✅ Services connected
2. ✅ Database schema pushed
3. ✅ Admin user created
4. 📤 Upload PYQ PDFs via admin panel
5. 🔄 Test the cron jobs manually
6. 🚀 Deploy to production