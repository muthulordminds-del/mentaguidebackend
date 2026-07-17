import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import advertiserModel from "../models/advertiserModel.js";
import transporter from "../config/nodemailer.js";
import { appendToSheet } from "../config/googleSheets.js";

const TOTAL_FEE = 2;
const PARTIAL_FEE = 1;
const BALANCE_FEE = TOTAL_FEE - PARTIAL_FEE; // 1

// ---------------------------------------------------------------
// STEP 1: Create Razorpay order (called right after the advertiser
// registration form is saved, before showing the Razorpay checkout)
// ---------------------------------------------------------------
export const createOrder = async (req, res) => {
    try {
        const { advertiserId, paymentType } = req.body; // paymentType: 'full' | 'partial'

        if (!advertiserId || !['full', 'partial'].includes(paymentType)) {
            return res.json({ success: false, message: "Invalid request. advertiserId and paymentType are required." });
        }

        const advertiser = await advertiserModel.findById(advertiserId);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }

        const amount = paymentType === 'full' ? TOTAL_FEE : PARTIAL_FEE;

        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // paise
            currency: "INR",
            receipt: `adv_${advertiser._id}`.slice(0, 40),
            notes: {
                advertiserId: advertiser._id.toString(),
                paymentType,
                fullName: advertiser.fullName,
                email: advertiser.email,
            },
        });

        advertiser.paymentType = paymentType;
        advertiser.razorpayOrderId = order.id;
        await advertiser.save();

        return res.json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID,
            advertiser: {
                name: advertiser.fullName,
                email: advertiser.email,
                contact: advertiser.whatsapp,
            },
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return res.json({ success: false, message: error.message || "Error creating payment order" });
    }
};

// ---------------------------------------------------------------
// STEP 1b: Record a payment failure reported directly by Razorpay
// checkout (card declined, insufficient funds, user closed etc.)
// This only updates the DB record — no email is sent for failures.
// ---------------------------------------------------------------
export const recordPaymentFailure = async (req, res) => {
    try {
        const { advertiserId, razorpay_order_id, reason } = req.body;

        if (!advertiserId) {
            return res.json({ success: false, message: "advertiserId is required." });
        }

        const advertiser = await advertiserModel.findById(advertiserId);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }

        advertiser.paymentStatus = 'failed';
        advertiser.paymentFailureReason = reason || 'Payment failed at gateway';
        if (razorpay_order_id) {
            advertiser.razorpayOrderId = razorpay_order_id;
        }
        await advertiser.save();

        return res.json({ success: true, message: "Payment failure recorded." });
    } catch (error) {
        console.error("Error recording payment failure:", error);
        return res.json({ success: false, message: error.message || "Error recording payment failure" });
    }
};

// ---------------------------------------------------------------
// STEP 2: Verify payment signature after Razorpay checkout success,
// mark advertiser as paid/partial_paid, save to sheet, send mail
// ---------------------------------------------------------------
export const verifyPayment = async (req, res) => {
    try {
        const {
            advertiserId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            // Record the failed attempt against the advertiser's record too
            try {
                const failedAdvertiser = await advertiserModel.findById(advertiserId);
                if (failedAdvertiser) {
                    failedAdvertiser.paymentStatus = 'failed';
                    failedAdvertiser.paymentFailureReason = 'Signature mismatch during verification';
                    failedAdvertiser.razorpayPaymentId = razorpay_payment_id || '';
                    await failedAdvertiser.save();
                }
            } catch (saveErr) {
                console.error("Error saving failed payment record:", saveErr);
            }
            return res.json({ success: false, message: "Payment verification failed. Signature mismatch." });
        }

        const advertiser = await advertiserModel.findById(advertiserId);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }

        const isFull = advertiser.paymentType === 'full';
        const paidAmount = isFull ? TOTAL_FEE : PARTIAL_FEE;

        advertiser.razorpayPaymentId = razorpay_payment_id;
        advertiser.razorpaySignature = razorpay_signature;
        advertiser.amountPaid = paidAmount;
        advertiser.balanceAmount = isFull ? 0 : BALANCE_FEE;
        advertiser.paymentStatus = isFull ? 'paid' : 'partial_paid';
        await advertiser.save();

        // Save to Google Sheet (payment info appended)
        try {
            await appendToSheet(advertiser.toObject());
        } catch (sheetError) {
            console.error("Error appending payment to Google Sheet:", sheetError);
        }

        // Send confirmation email
        try {
            const balanceLine = isFull
                ? `<p style="font-size:15px;color:#222;margin:4px 0;">✅ Full payment of <strong>₹${TOTAL_FEE}</strong> received. You're all set!</p>`
                : `<p style="font-size:15px;color:#222;margin:4px 0;">✅ Advance payment of <strong>₹${PARTIAL_FEE}</strong> received.</p>
                   <p style="font-size:15px;color:#b00;margin:4px 0;">⚠️ Balance of <strong>₹${BALANCE_FEE}</strong> to be paid at the venue on the event day.</p>`;

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: advertiser.email,
                subject: "Payment Confirmed - Mentaguide Expand 360²",
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                    <div style="background-color: #000000; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h2 style="color: #a4d64f; margin: 0; font-size: 24px;">Payment Confirmed!</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333;">Dear <strong>${advertiser.fullName}</strong>,</p>
                        <p style="font-size: 16px; color: #333;">Thank you! Your registration payment has been received.</p>
                        <div style="background-color: #f4f9ec; border: 1px solid #a4d64f; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            ${balanceLine}
                            <p style="font-size:14px;color:#555;margin:10px 0 0 0;">Payment ID: ${razorpay_payment_id}</p>
                        </div>
                        <div style="background-color: #f4f9ec; border: 1px solid #a4d64f; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="font-size: 16px; color: #202523; font-weight: bold; margin: 0 0 10px 0;">Event Details</p>
                            <p style="font-size: 15px; color: #333; margin: 4px 0;">📅 11TH AUGUST 2026 &nbsp;|&nbsp; 🕚 11:11 AM &nbsp;|&nbsp; 📍 MERLIS HOTEL, COIMBATORE</p>
                            <p style="margin: 15px 0 0 0;">
                                <a href="https://mentaguide.com/event" style="display: inline-block; background-color: #a4d64f; color: #202523; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 25px; text-transform: uppercase; letter-spacing: 0.5px;">View Event Page</a>
                            </p>
                        </div>
                        <p style="font-size: 16px; color: #333; margin-top: 30px;">Best Regards,<br/><span style="color: #a4d64f; font-weight: bold;">The Mentaguide Team</span></p>
                    </div>
                </div>
                `,
            });

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: 'info@mentaguide.com',
                subject: `Payment Received: ${advertiser.fullName} (${advertiser.paymentType})`,
                html: `<p>${advertiser.fullName} (${advertiser.email}) paid ₹${paidAmount} [${advertiser.paymentType}]. Balance due: ₹${advertiser.balanceAmount}. Payment ID: ${razorpay_payment_id}</p>`,
            });
        } catch (mailError) {
            console.error("Error sending payment confirmation email:", mailError);
        }

        return res.json({
            success: true,
            message: "Payment verified successfully",
            paymentStatus: advertiser.paymentStatus,
            balanceAmount: advertiser.balanceAmount,
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.json({ success: false, message: error.message || "Error verifying payment" });
    }
};

// ---------------------------------------------------------------
// STEP 3 (optional/future): Create order for the balance ₹2500
// in case you later want an online "pay balance" link too.
// Currently balance is meant to be collected at the venue.
// ---------------------------------------------------------------
export const createBalanceOrder = async (req, res) => {
    try {
        const { advertiserId } = req.body;
        const advertiser = await advertiserModel.findById(advertiserId);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }
        if (advertiser.paymentStatus !== 'partial_paid') {
            return res.json({ success: false, message: "No pending balance for this registration." });
        }

        const order = await razorpayInstance.orders.create({
            amount: BALANCE_FEE * 100,
            currency: "INR",
            receipt: `bal_${advertiser._id}`.slice(0, 40),
            notes: { advertiserId: advertiser._id.toString(), paymentType: 'balance' },
        });

        advertiser.balanceRazorpayOrderId = order.id;
        await advertiser.save();

        return res.json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID,
            advertiser: { name: advertiser.fullName, email: advertiser.email, contact: advertiser.whatsapp },
        });
    } catch (error) {
        console.error("Error creating balance order:", error);
        return res.json({ success: false, message: error.message || "Error creating balance payment order" });
    }
};

export const verifyBalancePayment = async (req, res) => {
    try {
        const { advertiserId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.json({ success: false, message: "Payment verification failed. Signature mismatch." });
        }

        const advertiser = await advertiserModel.findById(advertiserId);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }

        advertiser.balanceRazorpayPaymentId = razorpay_payment_id;
        advertiser.balanceRazorpaySignature = razorpay_signature;
        advertiser.amountPaid = TOTAL_FEE;
        advertiser.balanceAmount = 0;
        advertiser.paymentStatus = 'paid';
        advertiser.balancePaidAt = new Date();
        await advertiser.save();

        return res.json({ success: true, message: "Balance payment verified successfully" });
    } catch (error) {
        console.error("Error verifying balance payment:", error);
        return res.json({ success: false, message: error.message || "Error verifying balance payment" });
    }
};