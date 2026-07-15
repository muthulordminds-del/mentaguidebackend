import { google } from 'googleapis';

const SPREADSHEET_ID = '1xV5ucUy1E03KBtooLn9p3Ouvpf2qCL5IUsc3qC9G0Ow';
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

// Appends a row of advertiser registration data to the Google Sheet

export const appendToSheet = async (advertiserData) => {
  try {
    console.log("appendToSheet function called");

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
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
      advertiserData.additionalComments || ''
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'USER_ENTERED',
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