const express = require('express');
const User = require('../model/User');
const Investment = require('../model/Investment');
const WithdrawalRequest = require('../model/WithdrawalRequest');
const auth = require('../middleware/auth');
const router = express.Router();
// Middleware to check if the user is admin
const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ msg: 'Access denied' });
    }
    next();
};

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get all withdrawal requests
router.get('/withdrawal-requests', auth, isAdmin, async (req, res) => {
    try {
        const withdrawals = await WithdrawalRequest.find().populate('userId', 'name email');
        res.json(withdrawals);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/investment/:id/returns', auth, isAdmin, async (req, res) => {
    const { generatedReturns } = req.body; // New returns to be added
    try {
        // Find the user by ID (assuming the investment ID is the same as the user ID)
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        // Update the user's total returns
        user.totalReturns = parseInt(user.totalReturns) + parseInt(generatedReturns);
        // Add the new return entry to dailyReturns
        
        // Save the updated user document
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// Assuming Express.js
router.put('/user/:id/status', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.joinRequestStatus = req.body.joinRequestStatus || user.joinRequestStatus;
        await user.save();

        res.json({ msg: 'User status updated', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.put('/withdrawal-requests/:id/:action', auth, isAdmin, async (req, res) => {
    const { id, action } = req.params;

    try {
        // Find the withdrawal request by its ID
        const withdrawal = await WithdrawalRequest.findById(id);

        if (!withdrawal) {
            return res.status(404).json({ msg: 'Withdrawal request not found' });
        }
        
        

        // Check if the action is valid (either 'approve' or 'reject')
        if (action === 'approve') {
            withdrawal.status = 'Approved';
        } else if (action === 'reject') {
            withdrawal.status = 'Rejected';
        } else {
            return res.status(400).json({ msg: 'Invalid action. Use "approve" or "reject".' });
        }

        // Save the updated status
        await withdrawal.save();
        const user = await User.findById(withdrawal.userId);
        user.totalInvestment = user.totalInvestment - withdrawal.amount;
        await user.save();
        res.json({ msg: `Withdrawal request has been ${withdrawal.status}` });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


// Admin route to fetch all investments
router.get('/investments', auth, isAdmin, async (req, res) => {
    try {
        // Fetch all investments and populate user details (name and email)
        const investments = await Investment.find();

        if (!investments || investments.length === 0) {
            return res.status(404).json({ msg: 'No investments found' });
        }

        // Return all investments
        res.json(investments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/investment/:id/:action', auth, isAdmin, async (req, res) => {
    const { id, action } = req.params;

    try {
        // Find the investment by its ID
        const investment = await Investment.findById(id);

        if (!investment) {
            return res.status(404).json({ msg: 'Investment not found' });
        }

        // Check if the action is valid (either 'approve' or 'reject')
        if (action.toLocaleLowerCase() === 'approve') {
            investment.status = 'Accepted';

            // Find the user who made the investment
            const user = await User.findById(investment.userId);

            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            // Add the investment amount to the user's total investment
            user.totalInvestment = (user.totalInvestment || 0) + investment.amount;

            // Save the updated user details
            await user.save();
        } else if (action.toLocaleLowerCase() === 'reject') {
            investment.status = 'Rejected';
        } else {
            return res.status(400).json({ msg: 'Invalid action. Use "approve" or "reject".' });
        }

        // Save the updated investment
        await investment.save();

        res.json({ msg: `Investment has been ${investment.status}` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;