# Krishoker Ponno Backend

A robust Node.js + Express.js backend API for an agricultural marketplace mobile app serving farmers, agents, customers, and admins in Bangladesh.

## 🚀 Features

### User Roles & Authentication
- **Phone + OTP Authentication** via Supabase Auth
- **4 User Roles**: Farmer, Agent, Customer, Admin
- **Role-based Authorization** with middleware protection
- **JWT Token Management** with refresh tokens

### Core Functionality
- **Product Management**: CRUD operations with image upload
- **Order Management**: Complete order lifecycle with status tracking
- **Agent Assignment**: District-based agent assignment system
- **District Management**: Administrative control over service areas
- **File Upload**: Image processing and storage via Supabase Storage

### Security & Performance
- **Rate Limiting**: Configurable API rate limits
- **Input Validation**: Comprehensive validation with Joi
- **Error Handling**: Centralized error management
- **Image Processing**: Automatic image optimization with Sharp
- **Row Level Security**: Database-level access control

## 🏗️ Architecture

```
src/
├── app.js                 # Express app configuration
├── config/
│   └── supabase.js       # Supabase client setup
├── controllers/          # Route handlers
│   ├── authController.js
│   ├── userController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── districtController.js
│   └── adminController.js
├── middlewares/          # Custom middleware
│   ├── auth.js          # Authentication & authorization
│   ├── errorHandler.js  # Error handling
│   ├── validation.js    # Input validation schemas
│   └── upload.js        # File upload handling
├── routes/              # API route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   ├── districtRoutes.js
│   └── adminRoutes.js
└── utils/               # Utility functions
```

## 🗄️ Database Schema

### Tables
- **users**: User profiles with role-based access
- **districts**: Service area management
- **products**: Farmer product listings
- **orders**: Customer orders with agent assignment
- **order_items**: Multi-product order support

### Key Features
- **UUID Primary Keys** for all tables
- **Row Level Security** policies
- **Automatic Timestamps** with triggers
- **Comprehensive Indexing** for performance
- **Database Functions** for analytics

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v16+)
- Supabase account
- Bangladesh phone number for testing

### 1. Clone and Install
```bash
git clone <repository-url>
cd krishoker_ponno_backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Setup
1. Run `database/schema.sql` in Supabase SQL Editor
2. Run `database/functions.sql` for analytics functions
3. Create storage bucket named `product-images`
4. Configure storage policies for public access

### 4. Start Development Server
```bash
npm run dev
```

## 📱 API Endpoints

### Authentication
```
POST /api/v1/auth/send-otp      # Send OTP to phone
POST /api/v1/auth/verify-otp    # Verify OTP & login/register
POST /api/v1/auth/refresh       # Refresh access token
POST /api/v1/auth/logout        # User logout
GET  /api/v1/auth/profile       # Get user profile
```

### Products
```
GET    /api/v1/products              # List products (public)
GET    /api/v1/products/:id          # Get product details
POST   /api/v1/products              # Create product (farmer)
PUT    /api/v1/products/:id          # Update product (farmer)
DELETE /api/v1/products/:id          # Delete product (farmer)
GET    /api/v1/products/farmer/my-products  # Farmer's products
```

### Orders
```
POST /api/v1/orders                    # Create order (customer)
GET  /api/v1/orders                    # Get user's orders
GET  /api/v1/orders/:id                # Get order details
PUT  /api/v1/orders/:id/status         # Update order status (agent)
PUT  /api/v1/orders/:id/assign-agent   # Assign agent to order
GET  /api/v1/orders/agents/available   # Get available agents
```

### Districts
```
GET /api/v1/districts           # List all districts
GET /api/v1/districts/:id       # Get district details
GET /api/v1/districts/:id/agents    # Get district agents
GET /api/v1/districts/:id/products  # Get district products
```

### Admin (Admin Role Required)
```
GET    /api/v1/admin/users           # Manage users
GET    /api/v1/admin/products        # Manage products
GET    /api/v1/admin/orders          # Manage orders
GET    /api/v1/admin/districts       # Manage districts
GET    /api/v1/admin/stats/*         # Analytics endpoints
```

## 🔐 Authentication Flow

### Registration/Login Process
1. **Send OTP**: `POST /auth/send-otp` with phone number
2. **Verify OTP**: `POST /auth/verify-otp` with phone + OTP + user_data
3. **Use Access Token**: Include `Bearer {access_token}` in headers
4. **Refresh Token**: Use refresh endpoint when token expires

### Example Registration
```javascript
// 1. Send OTP
const otpResponse = await fetch('/api/v1/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '01712345678' })
});

// 2. Verify OTP with user data (for new users)
const verifyResponse = await fetch('/api/v1/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '01712345678',
    token: '123456',
    user_data: {
      name: 'John Doe',
      role: 'farmer',
      district_id: 'uuid-here',
      language: 'bn'
    }
  })
});
```

## 🖼️ File Upload

### Product Image Upload
```javascript
const formData = new FormData();
formData.append('name', 'Product Name');
formData.append('price', '100.50');
formData.append('image', fileBlob);

const response = await fetch('/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

### Image Processing Features
- **Automatic Resize**: 800x600px maximum
- **Format Conversion**: All images converted to JPEG
- **Compression**: 80% quality for optimal file size
- **Unique Naming**: UUID-based file names
- **Storage**: Supabase Storage with public URLs

## 🛡️ Security Features

### Authentication Security
- **OTP-based Authentication**: No passwords required
- **JWT Tokens**: Secure session management
- **Token Refresh**: Automatic token renewal
- **Role-based Access**: Fine-grained permissions

### API Security
- **Rate Limiting**: Configurable request limits
- **CORS Protection**: Origin-based access control
- **Helmet.js**: Security headers
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries

### Database Security
- **Row Level Security**: User-based data access
- **Foreign Key Constraints**: Data integrity
- **Check Constraints**: Business rule enforcement
- **Indexed Queries**: Optimized performance

## 📊 Analytics & Statistics

### User Statistics
- Product counts and revenue (farmers)
- Order history and spending (customers)
- Commission tracking (agents)
- Platform overview (admins)

### Available Analytics
- User registrations by role/district
- Product listings by category/district
- Order trends and revenue
- Monthly performance metrics

## 🌍 Bangladesh Context

### Localization Features
- **Phone Validation**: Bangladeshi number formats
- **Language Support**: Bengali (bn) and English (en)
- **District Data**: Pre-populated with BD districts
- **Time Zone**: Asia/Dhaka configuration
- **Currency**: Decimal precision for Bangladeshi Taka

### Sample Districts Included
- Dhaka, Chittagong, Rajshahi, Khulna
- Barisal, Sylhet, Rangpur, Mymensingh
- 20+ major districts pre-configured

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
```

### Production Considerations
- Set appropriate CORS origins
- Configure rate limiting
- Set up monitoring and logging
- Enable Supabase database backups
- Configure CDN for image delivery

## 🔧 API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Example API Calls
```bash
# Send OTP
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"01712345678"}'

# Get Districts
curl http://localhost:3000/api/v1/districts

# Get Products
curl "http://localhost:3000/api/v1/products?district_id=uuid&page=1&limit=10"
```

## 📝 Best Practices

### Code Organization
- **Modular Structure**: Separation of concerns
- **Error Handling**: Centralized error management
- **Validation**: Input validation at API level
- **Logging**: Comprehensive request/error logging

### Database Best Practices
- **Indexing**: Optimized query performance
- **Constraints**: Data integrity enforcement
- **Functions**: Reusable database logic
- **Security**: Row-level access control

### API Best Practices
- **RESTful Design**: Standard HTTP methods
- **Pagination**: Efficient data fetching
- **Filtering**: Flexible query parameters
- **Documentation**: Clear endpoint descriptions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the database schema
- Test with the provided examples

---

**Built for Bangladesh's Agricultural Marketplace** 🇧🇩
