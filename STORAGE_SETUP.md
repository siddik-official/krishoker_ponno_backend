# Supabase Storage Setup Guide

## Storage Bucket Configuration

Your Supabase storage bucket `krishoker_ponno_image` is already set up with the following folder structure:

### Folder Structure
```
krishoker_ponno_image/
├── agent-user-image/     # Agent profile pictures
├── customer-image/       # Customer profile pictures  
├── farmer-user-image/    # Farmer profile pictures
└── products-image/       # Product images
```

## Storage Policies Setup

To make your storage bucket work properly with the API, you need to set up the following storage policies in your Supabase dashboard:

### 1. Navigate to Storage Policies
1. Go to Supabase Dashboard → Storage → Policies
2. Select your `krishoker_ponno_image` bucket

### 2. Create Upload Policy
Create a policy with these settings:
```sql
-- Policy name: "Users can upload images"
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'krishoker_ponno_image' AND 
  (
    -- Users can upload to their role-specific folder
    (auth.jwt() ->> 'role' = 'farmer' AND (storage.foldername(name))[1] = 'farmer-user-image') OR
    (auth.jwt() ->> 'role' = 'customer' AND (storage.foldername(name))[1] = 'customer-image') OR
    (auth.jwt() ->> 'role' = 'agent' AND (storage.foldername(name))[1] = 'agent-user-image') OR
    -- All authenticated users can upload product images
    (storage.foldername(name))[1] = 'products-image'
  )
);
```

### 3. Create Read Policy (Public Access)
```sql
-- Policy name: "Images are publicly accessible"
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Images are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'krishoker_ponno_image');
```

### 4. Create Update Policy
```sql
-- Policy name: "Users can update their own images"
-- Operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'krishoker_ponno_image')
WITH CHECK (bucket_id = 'krishoker_ponno_image');
```

### 5. Create Delete Policy
```sql
-- Policy name: "Users can delete their own images"
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'krishoker_ponno_image');
```

## Image Upload Examples

### Product Image Upload
```javascript
// Frontend example
const formData = new FormData();
formData.append('name', 'Fresh Tomatoes');
formData.append('price', '50.00');
formData.append('district_id', 'district-uuid');
formData.append('image', imageFile); // This will go to products-image folder

const response = await fetch('/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

### User Profile Image Upload
```javascript
// Frontend example
const formData = new FormData();
formData.append('name', 'Updated Name');
formData.append('image', profileImageFile); // Goes to appropriate user folder based on role

const response = await fetch('/api/v1/users/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

## Image Processing Features

The backend automatically:
- ✅ Resizes images to 800x600px maximum
- ✅ Converts all images to JPEG format
- ✅ Compresses to 80% quality
- ✅ Generates unique filenames with UUID
- ✅ Routes to correct folder based on image type and user role
- ✅ Provides public URLs for uploaded images
- ✅ Handles image deletion when records are removed

## Folder Usage by API Endpoints

| Endpoint | Folder | Description |
|----------|--------|-------------|
| `POST /api/v1/products` | `products-image/` | Product images uploaded by farmers |
| `PUT /api/v1/products/:id` | `products-image/` | Updated product images |
| `PUT /api/v1/users/profile` (farmer) | `farmer-user-image/` | Farmer profile pictures |
| `PUT /api/v1/users/profile` (customer) | `customer-image/` | Customer profile pictures |
| `PUT /api/v1/users/profile` (agent) | `agent-user-image/` | Agent profile pictures |

## Testing Storage

You can test your storage setup by:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test image upload with curl:**
   ```bash
   # First, get an access token by authenticating
   curl -X POST http://localhost:3000/api/v1/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"01712345678"}'
   
   # Then verify OTP and get token
   curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"01712345678","token":"123456","user_data":{...}}'
   
   # Upload product image
   curl -X POST http://localhost:3000/api/v1/products \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -F "name=Test Product" \
     -F "price=100.50" \
     -F "district_id=DISTRICT_UUID" \
     -F "image=@/path/to/image.jpg"
   ```

3. **Check uploaded files:**
   - Go to Supabase Dashboard → Storage → krishoker_ponno_image
   - Verify files appear in correct folders
   - Test public URL access

## Troubleshooting

### Common Issues:

1. **403 Forbidden on upload:**
   - Check storage policies are correctly set
   - Verify bucket name in environment variables
   - Ensure user is authenticated

2. **Images not appearing:**
   - Check public access policy
   - Verify bucket is public or has proper RLS policies

3. **Wrong folder:**
   - Check user role in JWT token
   - Verify folder routing logic in uploadEnhanced.js

4. **File too large:**
   - Current limit is 10MB
   - Adjust in middlewares/uploadEnhanced.js if needed

### Environment Variables Check:
Make sure your `.env` file has:
```env
SUPABASE_URL=https://your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=your_supabase_storage_bucket
```
