const axios = require("axios");

/**
 * Sends an OTP SMS via Fast2SMS Bulk V2 API (OTP route).
 *
 * @param {string} mobile  - 10-digit Indian mobile number (with or without +91 prefix)
 * @param {string|number} otp - The OTP value to send
 * @returns {Promise<void>}
 * @throws  Will throw an error if the SMS delivery fails
 */
const sendOtpSMS = async (mobile, otp) => {
  // Normalise mobile: strip leading +91 or 91 to get a clean 10-digit number
  const mobileNumber = String(mobile).replace(/^\+?91/, "").trim();

  if (!/^\d{10}$/.test(mobileNumber)) {
    throw new Error(`Invalid mobile number format: ${mobile}. Expected a 10-digit Indian number.`);
  }

  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY is not set in environment variables.");
  }

  // Dev-mode logging — never logs in production
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📱 [DEV] OTP for ${mobileNumber}: ${otp}\n`);
  }

  try {
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: apiKey,
        route: "q",
        message: `Your Chirala Allround Services OTP is ${otp}. It is valid for 5 minutes.`,
        numbers: mobileNumber,
      },
      timeout: 10000, // 10 s timeout
    });

    // Fast2SMS returns { return: true, ... } on success
    if (!response.data?.return) {
      console.error("❌ Fast2SMS responded with failure:", response.data);
      throw new Error("Fast2SMS API returned a failure response.");
    }

    console.log(`✅ OTP SMS dispatched to ${mobileNumber} via Fast2SMS.`);
  } catch (err) {
    // Axios wraps HTTP errors; unwrap the Fast2SMS message when available
    const apiMessage =
      err.response?.data?.message ||
      err.response?.data ||
      err.message;

    console.error("❌ Fast2SMS error:", apiMessage);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

module.exports = { sendOtpSMS };
