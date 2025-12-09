const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AdminSettings = require('../models/AdminSettings');
const auth = require('../middleware/auth');

// Initialize admin on first run
async function initializeAdmin() {
    const adminCount = await AdminSettings.count();
    if (adminCount === 0) {
        await AdminSettings.create({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123'
        });
        console.log('Admin account initialized');
    }
}
initializeAdmin();

// @route   POST api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await AdminSettings.findOne({ where: { username } });
        if (!admin) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Check if security question is set
        const needsSecuritySetup = !admin.securityQuestion;

        const payload = {
            user: {
                id: admin.id,
                username: admin.username
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, needsSecuritySetup });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/change-password
// @desc    Change admin password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const admin = await AdminSettings.findByPk(req.user.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ msg: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/set-security
// @desc    Set security question and answer
// @access  Private
router.post('/set-security', auth, async (req, res) => {
    const { securityQuestion, securityAnswer } = req.body;

    try {
        const admin = await AdminSettings.findByPk(req.user.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        admin.securityQuestion = securityQuestion;
        admin.securityAnswer = securityAnswer;
        await admin.save();

        res.json({ msg: 'Security question set successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/security-question
// @desc    Get security question
// @access  Public
router.get('/security-question', async (req, res) => {
    try {
        const admin = await AdminSettings.findOne({ where: { username: 'admin' } });
        if (!admin || !admin.securityQuestion) {
            return res.status(404).json({ msg: 'Security question not set' });
        }

        res.json({ securityQuestion: admin.securityQuestion });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/verify-security
// @desc    Verify security answer and reset password
// @access  Public
router.post('/verify-security', async (req, res) => {
    const { securityAnswer, newPassword } = req.body;

    try {
        const admin = await AdminSettings.findOne({ where: { username: 'admin' } });
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        const isMatch = await admin.compareSecurityAnswer(securityAnswer);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect answer' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ msg: 'Password reset successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/emergency-reset
// @desc    Emergency password reset with recovery key
// @access  Public
router.post('/emergency-reset', async (req, res) => {
    const { recoveryKey, newPassword } = req.body;

    try {
        if (recoveryKey !== process.env.RECOVERY_KEY) {
            return res.status(400).json({ msg: 'Invalid recovery key' });
        }

        const admin = await AdminSettings.findOne({ where: { username: 'admin' } });
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ msg: 'Password reset successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
