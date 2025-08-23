const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { AppError } = require('./errorHandler');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'), false);
    }
};

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Single file upload
    }
});

/**
 * Middleware to handle single image upload
 */
const uploadSingle = (fieldName) => {
    return upload.single(fieldName);
};

/**
 * Get storage folder based on image type and user role
 */
const getStorageFolder = (imageType, userRole) => {
    switch (imageType) {
        case 'product':
            return 'products-image';
        case 'user':
            switch (userRole) {
                case 'farmer':
                    return 'farmer-user-image';
                case 'customer':
                    return 'customer-image';
                case 'agent':
                    return 'agent-user-image';
                default:
                    return 'farmer-user-image'; // Default to farmer folder
            }
        default:
            return 'products-image'; // Default folder
    }
};

/**
 * Process and upload image to Supabase Storage
 */
const processAndUploadImage = (imageType = 'product') => {
    return async (req, res, next) => {
        try {
            if (!req.file) {
                return next();
            }

            // Process image with Sharp
            const processedImageBuffer = await sharp(req.file.buffer)
                .resize(800, 600, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 80,
                    progressive: true
                })
                .toBuffer();

            // Generate unique filename
            const fileExtension = 'jpg';
            const fileName = `${uuidv4()}.${fileExtension}`;
            
            // Get appropriate folder based on image type and user role
            const folder = getStorageFolder(imageType, req.user?.role);
            const filePath = `${folder}/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(process.env.SUPABASE_STORAGE_BUCKET || 'krishoker_ponno_image')
                .upload(filePath, processedImageBuffer, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600'
                });

            if (error) {
                console.error('Supabase storage error:', error);
                throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(process.env.SUPABASE_STORAGE_BUCKET || 'krishoker_ponno_image')
                .getPublicUrl(filePath);

            // Attach image URL to request
            req.imageUrl = publicUrl;
            req.uploadedFile = {
                path: filePath,
                url: publicUrl,
                size: processedImageBuffer.length,
                folder: folder
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Delete image from Supabase Storage
 */
const deleteImage = async (imagePath) => {
    try {
        if (!imagePath) return;

        // Extract file path from URL
        const urlParts = imagePath.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Try to determine the folder from the URL structure
        // Look for known folder patterns in the URL
        let folder = 'products-image'; // Default
        
        if (imagePath.includes('farmer-user-image')) {
            folder = 'farmer-user-image';
        } else if (imagePath.includes('customer-image')) {
            folder = 'customer-image';
        } else if (imagePath.includes('agent-user-image')) {
            folder = 'agent-user-image';
        } else if (imagePath.includes('products-image')) {
            folder = 'products-image';
        }

        const filePath = `${folder}/${fileName}`;

        const { error } = await supabase.storage
            .from(process.env.SUPABASE_STORAGE_BUCKET || 'krishoker_ponno_image')
            .remove([filePath]);

        if (error) {
            console.error('Failed to delete image:', error);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    }
};

/**
 * Middleware for product image upload
 */
const uploadProductImage = (fieldName = 'image') => {
    return [
        uploadSingle(fieldName),
        processAndUploadImage('product')
    ];
};

/**
 * Middleware for user profile image upload
 */
const uploadUserImage = (fieldName = 'image') => {
    return [
        uploadSingle(fieldName),
        processAndUploadImage('user')
    ];
};

module.exports = {
    uploadSingle,
    processAndUploadImage,
    deleteImage,
    uploadProductImage,
    uploadUserImage,
    getStorageFolder
};
