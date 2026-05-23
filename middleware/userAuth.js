import jwt from 'jsonwebtoken';

const userAuth = async (req, res, next) => {
    try {
        // Ensure cookies exist
        if (!req.cookies) {
            return res.status(401).json({
                success: false,
                message: "No cookies found"
            });
        }

        // Get token from cookies
        const { token } = req.cookies;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required: No token provided"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Initialize req.body if it doesn't exist
        if (!req.body) {
            req.body = {};
        }

        // Attach user ID to request
        req.body.userId = decoded.id;
        
        // Also attach to req.user for better practice
        req.user = { id: decoded.id };

        // Proceed to the next middleware/route handler
        next();

    } catch (error) {
        console.error('Authentication error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication"
        });
    }
};

export default userAuth;