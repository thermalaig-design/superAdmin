import jwt from 'jsonwebtoken';

import { verifyAdmin } from './auth.service.js';

const FAILURES = {
    MEMBER_NOT_FOUND: { status: 404, message: 'No member found with this mobile number' },
    NOT_SUPER_ADMIN: { status: 403, message: 'This member is not a super admin' },
    INVALID_SECRET_CODE: { status: 401, message: 'Invalid secret code' },
};

async function loginSuperAdmin(req, res) {
    try {
        const { phoneNo, secretCode } = req.body ?? {};

        if (!phoneNo || !secretCode) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and secret code are required',
            });
        }

        const result = await verifyAdmin(phoneNo, secretCode);

        if (!result.ok) {
            const { status, message } = FAILURES[result.reason];
            return res.status(status).json({ success: false, message });
        }

        const admin = { memberId: result.memberId, superAdminId: result.superAdminId };
        const token = jwt.sign(admin, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { token, ...admin },
        });
    } catch (error) {
        console.error('loginSuperAdmin failed:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

function getCurrentAdmin(req, res) {
    const { memberId, superAdminId } = req.admin;
    res.json({ success: true, data: { memberId, superAdminId } });
}

export { getCurrentAdmin, loginSuperAdmin };
