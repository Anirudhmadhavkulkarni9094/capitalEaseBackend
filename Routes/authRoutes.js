const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/User');
const router = express.Router();
const nodemailer = require("nodemailer")
const crypto = require("crypto");
// User registration
router.post('/register', async (req, res) => {
    let { name, email, password } = req.body;
    try {

        email = email.toLowerCase();
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        // Create new user

        user = new User({ name, email, password });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user
        await user.save();

        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// User login
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase();
    try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT
        const payload = { user: { id: user._id, isAdmin: user.isAdmin } };
        jwt.sign(payload, 'secretToken', { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            res.json({ token , user });
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email provider
    auth: {
        user: "InvestMeWeb@gmail.com",
        pass: "ahaf fnfh pacl juqc",
    },
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    let { email } = req.body;
    email = email.toLowerCase();

    try {
        const user = await User.findOne({ email });
        console.log(user)
        if (!user) return res.status(400).json({ msg: 'User not found' });

        // Create a reset token
        const token = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now

        await user.save();

        // Send reset link via email
        const resetUrl = `http://localhost:3000/reset-password/${token}`;
        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            text: `You are receiving this email because you (or someone else) requested a password reset for your account.\n\n
            Please click on the following link, or paste it into your browser to complete the process:\n\n
            ${resetUrl}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ msg: 'Password reset link sent to your email' });
    } catch (err) {
        console.error(err.message);
        console.log(err)
        res.status(500).send('Server Error');
    }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Token should not be expired
        });

        if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

        // Update the password and clear the reset token and expiry
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        res.json({ msg: 'Password has been updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
