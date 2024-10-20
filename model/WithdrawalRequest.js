const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    requestDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    processedDate: {
        type: Date,
    },
});

module.exports = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);
