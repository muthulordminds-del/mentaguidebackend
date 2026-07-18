import advertiserModel from "../models/advertiserModel.js";

// ---------------------------------------------------------------
// STEP 0: Save the event-registration form.
// No email is sent here and the Google Sheet is NOT written here.
// Both happen exactly once, after payment is verified successfully
// (see paymentController.js -> verifyPayment), so the registrant
// only ever gets ONE email — with event + payment details combined —
// and the sheet only contains rows for advertisers who actually
// completed payment.
// ---------------------------------------------------------------
export const createAdvertiser = async (req, res) => {
    try {
        const advertiserData = req.body;

        const newAdvertiser = new advertiserModel(advertiserData);
        await newAdvertiser.save();

        return res.json({
            success: true,
            message: "Advertiser signup form submitted successfully!",
            advertiserId: newAdvertiser._id
        });
    } catch (error) {
        console.error("Error creating advertiser:", error);
        return res.json({
            success: false,
            message: error.message || "Error submitting form"
        });
    }
};