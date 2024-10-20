const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    generatedReturns: {
        type: Number,
        default: 0, // This can be manually updated by the admin
    },
    investmentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted' , 'Rejected'],
        default: 'Pending',
    },
    screenshot : {
        type : String,
        required : true
    }
});

module.exports = mongoose.model('Investment', InvestmentSchema);
