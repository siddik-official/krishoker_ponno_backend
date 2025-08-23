# 🚀 Complete Setup Guide for Krishoker Ponno Backend

## Step 1: Install Node.js and npm

### Method 1: Manual Installation (Recommended)
1. **Download Node.js**:
   - Go to https://nodejs.org/
   - Download the **LTS version** (currently v20.x.x)
   - Choose the "Windows Installer (.msi)" for your system (64-bit)

2. **Install Node.js**:
   - Run the downloaded .msi file
   - Follow the installation wizard
   - ✅ Make sure "Add to PATH" is checked
   - ✅ Install npm package manager
   - ✅ Install necessary tools for native modules

3. **Restart your computer** or at least restart PowerShell

4. **Verify installation**:
   ```powershell
   node --version
   npm --version
   ```

### Method 2: Using winget (Alternative)
```powershell
# If winget didn't work, try this specific command:
winget install OpenJS.NodeJS.LTS

# Then restart PowerShell and check:
node --version
npm --version
```

## Step 2: Install Project Dependencies

Once Node.js is installed, navigate to your project directory and install dependencies:

```powershell
cd "C:\Users\Md Abu Bakar Siddik\Desktop\krishoker_ponno_backend"
npm install
```

## Step 3: Environment Configuration

1. **Your `.env` file is already created** with your Supabase credentials
2. **Verify your `.env` file contains**:
   ```env
   SUPABASE_URL=https://lwynjcbigtjflgdqwbqt.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=krishoker_ponno_image
   ```

## Step 4: Database Setup

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Open SQL Editor**
3. **Run the schema file**:
   - Copy content from `database/schema.sql`
   - Paste and execute in SQL Editor
4. **Run the functions file**:
   - Copy content from `database/functions.sql`
   - Paste and execute in SQL Editor

## Step 5: Storage Policies Setup

1. **Go to Storage > Policies** in Supabase Dashboard
2. **Select your `krishoker_ponno_image` bucket**
3. **Create the following policies**:

### Upload Policy
```sql
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'krishoker_ponno_image');
```

### Read Policy (Public Access)
```sql
CREATE POLICY "Images are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'krishoker_ponno_image');
```

### Update Policy
```sql
CREATE POLICY "Users can update images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'krishoker_ponno_image');
```

### Delete Policy
```sql
CREATE POLICY "Users can delete images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'krishoker_ponno_image');
```

## Step 6: Start the Development Server

```powershell
cd "C:\Users\Md Abu Bakar Siddik\Desktop\krishoker_ponno_backend"
npm run dev
```

The server should start on http://localhost:3000

## Step 7: Test the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Test OTP Send (using Bangladesh phone number)
```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"01712345678\"}"
```

## 🔧 Troubleshooting

### Node.js Installation Issues

1. **"node is not recognized"**:
   - Restart PowerShell completely
   - Restart your computer
   - Check if Node.js is in PATH: `$env:PATH -split ';' | Select-String node`

2. **Permission Issues**:
   - Run PowerShell as Administrator
   - Try: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

3. **Alternative Installation**:
   - Download directly from https://nodejs.org/
   - Use the Windows Installer (.msi)
   - Make sure to check "Add to PATH" during installation

### npm Installation Issues

1. **npm install fails**:
   ```powershell
   # Clear npm cache
   npm cache clean --force
   
   # Try installing with verbose output
   npm install --verbose
   
   # If still fails, try
   npm install --legacy-peer-deps
   ```

2. **Network Issues**:
   ```powershell
   # Set npm registry
   npm config set registry https://registry.npmjs.org/
   
   # Check npm configuration
   npm config list
   ```

### Supabase Connection Issues

1. **Check your credentials** in `.env` file
2. **Verify Supabase project is active**
3. **Test connection**:
   ```javascript
   // You can create a test file to verify connection
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient('your_url', 'your_anon_key');
   console.log('Supabase client created successfully');
   ```

## 📱 API Endpoints Quick Reference

Once running, your API will have these main endpoints:

### Authentication
- `POST /api/v1/auth/send-otp` - Send OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP & Login/Register

### Products
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product (with image upload)

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders

### Districts
- `GET /api/v1/districts` - List districts

### Admin (requires admin role)
- `GET /api/v1/admin/*` - Admin endpoints

## 🎯 Next Steps After Setup

1. **Test user registration flow**
2. **Test product creation with image upload**
3. **Test order creation**
4. **Set up your mobile app to consume these APIs**

## 📞 Need Help?

If you encounter any issues:
1. Check the console output for error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase database schema is properly created
4. Test individual components step by step

The backend is designed to be production-ready for the Bangladesh market with proper phone number validation, district-based features, and role-based access control.
