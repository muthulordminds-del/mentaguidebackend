import advertiserModel from "../models/advertiserModel.js";
import { appendToSheet } from "../config/googleSheets.js";
import transporter from "../config/nodemailer.js";
import { REGISTRATION_PENDING_TEMPLATE } from "../config/emailTemplates.js";

// ---------------------------------------------------------------
// STEP 0: Save the event-registration form.
// Saved to MongoDB AND to the Google Sheet immediately (status:
// "pending"), before payment is even attempted.
//
// A "Registration Received" email is also sent right here — it
// contains a payment link so the advertiser can pay whenever they
// want. This is the ONLY email sent at this stage. Once they
// actually complete (or fail) the payment, paymentController.js
// sends a separate success/failure email and updates the SAME
// Google Sheet row (not a duplicate).
// ---------------------------------------------------------------
export const getAdvertiserById = async (req, res) => {
    try {
        const { id } = req.params;
        const advertiser = await advertiserModel.findById(id);
        if (!advertiser) {
            return res.json({ success: false, message: "Registration not found." });
        }
        return res.json({
            success: true,
            advertiser: {
                advertiserId: advertiser._id,
                fullName: advertiser.fullName,
                email: advertiser.email,
                whatsapp: advertiser.whatsapp,
                paymentStatus: advertiser.paymentStatus,
                balanceAmount: advertiser.balanceAmount,
                amountPaid: advertiser.amountPaid,
            },
        });
    } catch (error) {
        console.error("Error fetching advertiser:", error);
        return res.json({ success: false, message: error.message || "Error fetching registration" });
    }
};