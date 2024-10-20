const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const Investment = require('../model/Investment');
const User = require('../model/User');
const WithdrawalRequest = require('../model/WithdrawalRequest');
const auth = require('../middleware/auth');
const router = express.Router();

// const admin = require('firebase-admin');
const serviceAccount = require('../investme-faf8d-firebase-adminsdk-wcyq4-5d9ef2b134.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://investme-faf8d.appspot.com' // Replace with your Firebase bucket name
});

// Get reference to Firebase Storage bucket
const bucket = admin.storage().bucket();



// Configure Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to create a new investment with an image upload
router.post('/invest', auth, upload.single('screenshot'), async (req, res) => {
    const { amount } = req.body;

    try {
        // Ensure amount is valid
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ msg: 'Invalid amount provided' });
        }

        // Find the user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        let screenshotUrl = null;

        // If a file is uploaded, upload it to Firebase
        if (req.file) {
            const blob = admin.storage().bucket().file(`investments/${Date.now()}-${req.file.originalname}`);
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype,
                },
            });

            blobStream.on('error', (err) => {
                console.error('Firebase Storage error:', err);
                return res.status(500).json({ msg: 'Error uploading file' });
            });

            blobStream.on('finish', async () => {
                // Get the public URL of the uploaded file
                await blob.makePublic();
                screenshotUrl = `https://storage.googleapis.com/${blob.bucket.name}/${blob.name}`;

                // Proceed to create the investment after uploading the screenshot
                const investmentData = {
                    userId: req.user.id,
                    amount: Number(amount),
                    screenshot: screenshotUrl, // Store the Firebase URL in MongoDB
                };
                const investment = new Investment(investmentData);
                // Save the investment and update user
                await investment.save();

                await user.save();

                res.status(201).json({ investment, user });
            });

            // Upload the file buffer to Firebase Storage
            blobStream.end(req.file.buffer);
        } else {
            // If no file is uploaded, create the investment without a screenshot
            const investmentData = {
                userId: req.user.id,
                amount: Number(amount),
                screenshot: null, // No screenshot uploaded
            };

            const investment = new Investment(investmentData);

            await investment.save();
            await user.save();

            res.status(201).json({ investment, user });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all investments for the logged-in user
router.get('/my-investments', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const investments = await Investment.find({ userId: req.user.id , status : "Accepted" });

        res.json({
            investments,
            totalInvestment: user.totalInvestment,
            totalReturns: user.totalReturns
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get user's returns (daily and total)
router.get('/user/me/returns', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('dailyReturns totalReturns');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ dailyReturns: user.dailyReturns, totalReturns: user.totalReturns });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Analytics route for total investments, returns, and withdrawals
router.get('/analytics', auth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalInvestments = await Investment.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    totalReturns: { $sum: "$generatedReturns" }
                }
            }
        ]);
        const totalWithdrawals = await WithdrawalRequest.countDocuments();

        const analyticsData = {
            totalUsers,
            totalInvestments: totalInvestments[0]?.totalAmount || 0,
            totalReturns: totalInvestments[0]?.totalReturns || 0,
            totalWithdrawals
        };

        res.json(analyticsData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Route to get all transactions for the logged-in user (Investments + Withdrawals)
router.get('/my-transactions', auth, async (req, res) => {
    try {
        const investments = await Investment.find({ userId: req.user.id });
        const withdrawals = await WithdrawalRequest.find({ userId: req.user.id });
        const user = await User.findById(req.user.id);

        const totalInvestment = user.totalInvestment || 0;
        const totalReturns = user.totalReturns || 0;

        let percentageGainLoss = 0;
        if (totalInvestment > 0 && totalReturns > 0) {
            percentageGainLoss = ((totalReturns) / totalInvestment) * 100;
        } else if (totalInvestment > 0 && totalReturns === 0) {
            percentageGainLoss = 0; // If there are investments but no returns yet
        }

        res.json({
            investments,
            withdrawals,
            user: {
                name: user.name,
                email: user.email,
                totalInvestment,
                totalReturns,
                percentageGainLoss: percentageGainLoss.toFixed(2) // Rounded to 2 decimal places
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
