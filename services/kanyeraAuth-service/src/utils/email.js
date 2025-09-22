const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "set" : "not set");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Base email sending function
const sendEmail = async ({
  to,
  subject,
  html,
  from = `"Nicee" <${process.env.EMAIL_USER}>`,
}) => {
  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

// Verification email
const sendVerificationEmail = async (email, token) => {
  const verificationUrlApp = `dunkinapp://verify-email/${token}`;
  const verificationUrlWeb = `http://localhost:8080/api/verify-email?token=${token}`;
  const html = `
    <p><b>On your phone?</b> <a href="${verificationUrlApp}">Tap here to verify in the app</a>.</p>
    <p><b>On desktop or if the above doesn't work?</b> <a href="${verificationUrlWeb}">Click here to verify in your browser</a>.</p>
  `;
  await sendEmail({
    to: email,
    subject: "Verify Your Email",
    html,
  });
};

// Account recovery email
const sendAccountRecoveryEmail = async (email, recoveryUrl) => {
  const html = `
    <h2>Account Recovery</h2>
    <p>You requested to recover your account. Click the link below to proceed:</p>
    <a href="${recoveryUrl}">Recover Account</a>
    <p>This link expires in 1 hour.</p>
  `;
  await sendEmail({
    to: email,
    subject: "Account Recovery Request",
    html,
  });
};

// Recovery code email
const sendRecoveryCodeEmail = async (email, recoveryCode) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); padding: 20px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Account Recovery</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Your Recovery Code</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          You requested to recover your account. Use the code below to verify your identity:
        </p>
        
        <div style="background: white; border: 2px dashed #FF6B35; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #FF6B35; margin: 0; font-size: 32px; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${recoveryCode}
          </h1>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          <strong>Important:</strong> This code will expire in 1 hour for security reasons.
        </p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Security Notice:</strong> If you didn't request this recovery code, please ignore this email and ensure your account is secure.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>This is an automated message from Nicee. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Your Account Recovery Code - Nicee",
    html,
  });
};

// Recovery code SMS (placeholder for SMS service integration)
const sendRecoveryCodeSMS = async (phone, recoveryCode) => {
  // This would integrate with an SMS service like Twilio
  // For now, we'll log it and return success
  console.log(`SMS Recovery Code for ${phone}: ${recoveryCode}`);

  // TODO: Integrate with SMS service
  // Example with Twilio:
  // const twilioClient = require('twilio')(accountSid, authToken);
  // await twilioClient.messages.create({
  //   body: `Your Nicee recovery code is: ${recoveryCode}. Expires in 15 minutes.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone
  // });

  return true;
};

// Enhanced password changed notification
const sendPasswordChangedEmail = async (email) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Password Updated Successfully</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Security Alert</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Your account password has been successfully updated. This change was made as part of the account recovery process.
        </p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #155724; margin: 0 0 10px 0;">What happened:</h3>
          <ul style="color: #155724; margin: 0; padding-left: 20px;">
            <li>Your password was changed during account recovery</li>
            <li>All existing sessions were terminated for security</li>
            <li>Your account is now locked until you sign in again</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>If you didn't make this change:</strong> Please contact our support team immediately at support@nicee.com
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="mailto:support@nicee.com" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Contact Support
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>This is an automated security notification from Nicee. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Password Updated - Security Alert - Nicee",
    html,
  });
};

// OTP email
const sendOTPEmail = async (email, otp) => {
  const html = `
    <h2>Email Verification</h2>
    <p>Your verification code is:</p>
    <h1 style="letter-spacing: 4px;">${otp}</h1>
    <p>This code will expire in 10 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  await sendEmail({
    to: email,
    subject: "Your Verification Code",
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendAccountRecoveryEmail,
  sendPasswordChangedEmail,
  sendOTPEmail,
  sendRecoveryCodeEmail,
  sendRecoveryCodeSMS,
};
