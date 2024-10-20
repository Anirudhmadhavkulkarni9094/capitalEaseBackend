const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./Routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cors = require('cors');
const User = require('./model/User');
const Investment = require('./model/Investment');
const WithdrawalRequest = require('./model/WithdrawalRequest');
const app = express();
app.use(cors());
const env = require('dotenv').config();
// Middleware
app.use(express.json());

// MongoDB Connection URI
const mongoURI =  process.env.DB_PASSWORD;

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);

app.get('/analytics', async (req, res) => {
    try {
        // Fetch total number of users
        const totalUsers = await User.countDocuments();

        // Fetch active users (users who have made at least one investment)
        const activeUsers = await Investment.distinct('userId').then(users => users.length);

        // Get today's date and set to start of the day for filtering daily data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch daily investments (made today)
        const dailyInvestments = await Investment.countDocuments({ createdAt: { $gte: today } });

        // Fetch daily withdrawals (made today)
        const dailyWithdrawals = await WithdrawalRequest.countDocuments({ createdAt: { $gte: today } });

        // Fetch total investments and returns (aggregate total amount and returns across the platform)
        const totalInvestments = await Investment.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    totalReturns: { $sum: "$generatedReturns" }
                }
            }
        ]);

        // Handle case when there are no investments in the database
        console.log(totalInvestments)
        const totalAmount = totalInvestments.length > 0 ? totalInvestments[0].totalAmount : 0;
        const totalReturns = totalInvestments.length > 0 ? totalInvestments[0].totalReturns : 0;

        // Prepare response with analytics data
        const analyticsData = {
            totalUsers,
            activeUsers,
            dailyInvestments,
            dailyWithdrawals,
            totalInvestedMoney: totalAmount,
            totalReturnsGenerated: totalReturns
        };

        res.json(analyticsData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
