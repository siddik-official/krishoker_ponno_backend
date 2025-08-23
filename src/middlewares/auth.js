const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Authenticate user using Supabase JWT token
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                code: 'MISSING_TOKEN'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        // Get user details from our users table
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!userData.is_active) {
            return res.status(403).json({
                success: false,
                message: 'User account is inactive',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Attach user data to request object
        req.user = userData;
        req.authUser = user;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Check if user has required role(s)
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const userRole = req.user.role;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required_roles: roles,
                user_role: userRole
            });
        }

        next();
    };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is farmer
 */
const requireFarmer = requireRole('farmer');

/**
 * Check if user is customer
 */
const requireCustomer = requireRole('customer');

/**
 * Check if user is agent
 */
const requireAgent = requireRole('agent');

/**
 * Check if user can access farmer features (farmer or admin)
 */
const requireFarmerAccess = requireRole(['farmer', 'admin']);

/**
 * Check if user can access agent features (agent or admin)
 */
const requireAgentAccess = requireRole(['agent', 'admin']);

/**
 * Check if user can access customer features (customer or admin)
 */
const requireCustomerAccess = requireRole(['customer', 'admin']);

module.exports = {
    authenticateUser,
    requireRole,
    requireAdmin,
    requireFarmer,
    requireCustomer,
    requireAgent,
    requireFarmerAccess,
    requireAgentAccess,
    requireCustomerAccess
};
