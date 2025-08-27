const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const districtRoutes = require('./routes/districtRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const { errorHandler } = require('./middlewares/errorHandler');
const { authenticateUser } = require('./middlewares/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Krishoker Ponno API is running',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0'
    });
});

// Supabase connection test endpoint
app.get('/test-supabase', async (req, res) => {
    try {
        const { supabase, supabaseAdmin } = require('./config/supabase');
        
        // Test 1: Simple connection test using districts (no RLS issues)
        const { data: districts, error: districtsError } = await supabaseAdmin
            .from('districts')
            .select('id, name')
            .limit(3);

        if (districtsError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to connect to Supabase',
                error: districtsError.message,
                hint: 'Make sure you have run the database schema.sql in Supabase SQL Editor'
            });
        }

        // Test 2: Check if tables exist
        const { data: tables, error: tablesError } = await supabaseAdmin
            .rpc('get_admin_overview_stats')
            .single();

        // Test 3: Simple count queries
        const { count: districtCount, error: countError } = await supabaseAdmin
            .from('districts')
            .select('*', { count: 'exact', head: true });

        res.status(200).json({
            success: true,
            message: 'Supabase connection successful!',
            tests: {
                basic_query: {
                    success: !districtsError,
                    data: districts,
                    count: districts?.length || 0,
                    message: 'Retrieved districts from database'
                },
                table_count: {
                    success: !countError,
                    district_count: districtCount || 0,
                    message: 'Table counting works'
                },
                custom_functions: {
                    success: !tablesError,
                    data: tables,
                    message: tablesError ? `Function error: ${tablesError.message}` : 'Custom functions working'
                }
            },
            environment: {
                supabase_url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
                supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing',
                supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Supabase connection test failed',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authenticateUser, userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', authenticateUser, orderRoutes);
app.use('/api/v1/districts', districtRoutes);
app.use('/api/v1/admin', authenticateUser, adminRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND'
    });
});

// Error handling middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Krishoker Ponno API server running on port ${PORT}`);
    console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
