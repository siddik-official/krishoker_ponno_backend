const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors
            });
        }

        next();
    };
};

/**
 * Validation schemas
 */
const schemas = {
    // User registration
    userRegistration: Joi.object({
        name: Joi.string().min(2).max(255).required().messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 255 characters',
            'any.required': 'Name is required'
        }),
        phone: Joi.string().pattern(/^(\+88)?01[3-9]\d{8}$/).required().messages({
            'string.pattern.base': 'Please provide a valid Bangladeshi phone number',
            'any.required': 'Phone number is required'
        }),
        role: Joi.string().valid('farmer', 'agent', 'customer').required().messages({
            'any.only': 'Role must be farmer, agent, or customer',
            'any.required': 'Role is required'
        }),
        language: Joi.string().valid('bn', 'en').default('bn'),
        nid: Joi.string().pattern(/^\d{10}$|^\d{13}$|^\d{17}$/).optional().messages({
            'string.pattern.base': 'NID must be 10, 13, or 17 digits'
        }),
        district_id: Joi.string().uuid().required().messages({
            'string.guid': 'Invalid district ID format',
            'any.required': 'District is required'
        })
    }),

    // User profile update
    userUpdate: Joi.object({
        name: Joi.string().min(2).max(255).optional(),
        language: Joi.string().valid('bn', 'en').optional(),
        nid: Joi.string().pattern(/^\d{10}$|^\d{13}$|^\d{17}$/).optional().allow(null),
        district_id: Joi.string().uuid().optional()
    }),

    // Product creation
    productCreate: Joi.object({
        name: Joi.string().min(2).max(255).required().messages({
            'string.min': 'Product name must be at least 2 characters long',
            'any.required': 'Product name is required'
        }),
        description: Joi.string().max(1000).optional(),
        price: Joi.number().positive().precision(2).required().messages({
            'number.positive': 'Price must be positive',
            'any.required': 'Price is required'
        }),
        category: Joi.string().max(100).optional(),
        unit: Joi.string().valid('kg', 'piece', 'liter', 'dozen', 'quintal').default('kg'),
        available_quantity: Joi.number().min(0).precision(2).default(0),
        district_id: Joi.string().uuid().required().messages({
            'any.required': 'District is required'
        })
    }),

    // Product update
    productUpdate: Joi.object({
        name: Joi.string().min(2).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        price: Joi.number().positive().precision(2).optional(),
        category: Joi.string().max(100).optional(),
        unit: Joi.string().valid('kg', 'piece', 'liter', 'dozen', 'quintal').optional(),
        available_quantity: Joi.number().min(0).precision(2).optional(),
        is_active: Joi.boolean().optional()
    }),

    // Order creation
    orderCreate: Joi.object({
        product_id: Joi.string().uuid().required().messages({
            'any.required': 'Product ID is required'
        }),
        quantity: Joi.number().positive().precision(2).required().messages({
            'number.positive': 'Quantity must be positive',
            'any.required': 'Quantity is required'
        }),
        agent_id: Joi.string().uuid().optional().allow(null),
        delivery_address: Joi.string().max(500).optional(),
        customer_notes: Joi.string().max(500).optional()
    }),

    // Order update (for agents/admins)
    orderUpdate: Joi.object({
        status: Joi.string().valid('booked', 'confirmed', 'picked', 'delivered', 'cancelled').optional(),
        agent_notes: Joi.string().max(500).optional()
    }),

    // District creation
    districtCreate: Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            'string.min': 'District name must be at least 2 characters long',
            'any.required': 'District name is required'
        })
    }),

    // Phone OTP request
    otpRequest: Joi.object({
        phone: Joi.string().pattern(/^(\+88)?01[3-9]\d{8}$/).required().messages({
            'string.pattern.base': 'Please provide a valid Bangladeshi phone number',
            'any.required': 'Phone number is required'
        })
    }),

    // OTP verification
    otpVerify: Joi.object({
        phone: Joi.string().pattern(/^(\+88)?01[3-9]\d{8}$/).required(),
        token: Joi.string().length(6).pattern(/^\d+$/).required().messages({
            'string.length': 'OTP must be 6 digits',
            'string.pattern.base': 'OTP must contain only numbers',
            'any.required': 'OTP is required'
        })
    })
};

module.exports = {
    validate,
    schemas
};
