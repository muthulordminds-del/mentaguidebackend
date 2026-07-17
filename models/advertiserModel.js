import mongoose from 'mongoose';

const advertiserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    email: { type: String, required: true },
    whatsapp: { type: String, required: true },
    companyName: { type: String, required: true },
    website: { type: String, default: '' },
    industry: { type: [String], required: true },
    location: { type: String, required: true },

    businessDescription: { type: String, required: true },
    businessStage: { type: String, required: true },
    topicsOfInterest: { type: [String], required: true },
    primaryReason: { type: String, required: true },
    additionalComments: { type: String, default: '' },

    // ---- Payment fields ----
    paymentType: { type: String, enum: ['full', 'partial'], default: null },
    totalAmount: { type: Number, default: 3500 },
    amountPaid: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 3500 },
    paymentStatus: { type: String, enum: ['pending', 'partial_paid', 'paid'], default: 'pending' },

    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },

    // Second (balance) payment, when partial was chosen first
    balanceRazorpayOrderId: { type: String, default: '' },
    balanceRazorpayPaymentId: { type: String, default: '' },
    balanceRazorpaySignature: { type: String, default: '' },
    balancePaidAt: { type: Date, default: null }
}, {
    timestamps: true
});

const advertiserModel = mongoose.models.advertiser || mongoose.model('advertiser', advertiserSchema);

export default advertiserModel;