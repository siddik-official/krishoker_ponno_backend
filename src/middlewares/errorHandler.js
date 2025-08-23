/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);

    // Supabase errors
    if (error.code) {
        // PostgreSQL error codes
        switch (error.code) {
            case '23505': // Unique violation
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate entry found',
                    code: 'DUPLICATE_ENTRY',
                    details: error.detail
                });
            case '23503': // Foreign key violation
                return res.status(400).json({
                    success: false,
                    message: 'Referenced record not found',
                    code: 'INVALID_REFERENCE',
                    details: error.detail
                });
            case '23514': // Check constraint violation
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data provided',
                    code: 'CONSTRAINT_VIOLATION',
                    details: error.detail
                });
        }
    }

    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: error.details?.map(detail => ({
                field: detail.path?.[0],
                message: detail.message
            })) || []
        });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large',
            code: 'FILE_TOO_LARGE',
            limit: '10MB'
        });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field',
            code: 'UNEXPECTED_FILE'
        });
    }

    // Custom application errors
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code || 'APPLICATION_ERROR'
        });
    }

    // Default server error
    const statusCode = process.env.NODE_ENV === 'production' ? 500 : 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;

    res.status(statusCode).json({
        success: false,
        message,
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
};

/**
 * Create custom application error
 */
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async error wrapper to catch async errors
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorHandler,
    AppError,
    catchAsync
};
