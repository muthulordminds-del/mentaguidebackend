import twilioClient from "./twilio.js";

// advertiser.whatsapp format: expects country code, e.g. "+919876543210"
const formatWhatsappNumber = (number) => {
    let cleaned = number.trim();
    if (!cleaned.startsWith('+')) {
        // assume Indian number if no country code given
        cleaned = `+91${cleaned.replace(/^0+/, '')}`;
    }
    return `whatsapp:${cleaned}`;
};

export const sendWhatsappMessage = async (toNumber, message) => {
    console.log("WHATSAPP FUNCTION CALLED", toNumber);
    try {
        const result = await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: formatWhatsappNumber(toNumber),
            body: message,
        });
        console.log("WhatsApp message sent:", result.sid);
        return result;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error.message);
        throw error;
    }
};