import { google } from 'googleapis';

const SPREADSHEET_ID = '1PjV-Gr6ltdnNFrukUzDf8QwG3G1wTrUtWmKxs1OzW-c';
const SHEET_NAME = 'Mentaguide Event Registration'; // change this if your tab name is different

// Auth using service account credentials
const getAuth = () => {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getFormattedTimestamp = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
};

// Appends a row of advertiser registration data to the Google Sheet

export const appendToSheet = async (advertiserData) => {
  try {
    console.log("appendToSheet function called");

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      getFormattedTimestamp(),
      advertiserData.fullName || '',
      advertiserData.jobTitle || '',
      advertiserData.email || '',
      advertiserData.whatsapp || '',
      advertiserData.companyName || '',
      advertiserData.website || '',
      Array.isArray(advertiserData.industry) ? advertiserData.industry.join(', ') : (advertiserData.industry || ''),
      advertiserData.location || '',
      advertiserData.businessDescription || '',
      advertiserData.businessStage || '',
      Array.isArray(advertiserData.topicsOfInterest) ? advertiserData.topicsOfInterest.join(', ') : (advertiserData.topicsOfInterest || ''),
      advertiserData.primaryReason || '',
      advertiserData.additionalComments || '',
      // Payment columns (O-S)
      advertiserData.paymentType ? (advertiserData.paymentType === 'full' ? 'Full' : 'Partial') : '',
      advertiserData.amountPaid ? `Rs.${advertiserData.amountPaid}` : '',
      advertiserData.balanceAmount ? `Rs.${advertiserData.balanceAmount}` : 'Rs.0',
      advertiserData.paymentStatus || 'pending',
      advertiserData.razorpayPaymentId || ''
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:S`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    console.log("Google Sheet Updated Successfully");
    console.log(response.data);

  } catch (error) {
    console.error("Google Sheet Error");
    console.error(error.message);
    console.error(error.response?.data);
  }
};