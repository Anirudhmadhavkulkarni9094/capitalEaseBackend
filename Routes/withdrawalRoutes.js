const express = require('express');
const WithdrawalRequest = require('../model/WithdrawalRequest');
const auth = require('../middleware/auth');
const router = express.Router();

// Create a withdrawal request
router.post('/withdraw', auth, async (req, res) => {
    const { amount } = req.body;
    try {
        const withdrawalRequest = new WithdrawalRequest({
            userId: req.user.id,
            amount,
        });

        await withdrawalRequest.save();
        res.status(201).json(withdrawalRequest);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get all withdrawal requests for the logged-in user
router.get('/my-withdrawals', auth, async (req, res) => {
    try {
        const withdrawals = await WithdrawalRequest.find({ userId: req.user.id });
        res.json(withdrawals);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
