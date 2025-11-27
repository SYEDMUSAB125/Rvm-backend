// services/otpService.js
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class OTPService {
  /**
   * GENERATE 4-DIGIT OTP
   */
  static generateOTP() {
    return crypto.randomInt(1000, 10000).toString(); 
  }

  /**
   * SET OTP EXPIRATION (10 minutes)
   */
  static getOTPExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

  /**
   * CREATE EMAIL TRANSPORTER WITH APP PASSWORD
   */
  static createTransporter() {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not found in environment variables');
    }

    console.log('📧 Creating Gmail transporter with App Password...');
    console.log('Email:', process.env.EMAIL_USER);
    console.log('App Password length:', process.env.EMAIL_PASS.length);

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your full Gmail address
        pass: process.env.EMAIL_PASS  // 16-character App Password (no spaces)
      },
      // Additional settings for better reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 5
    });
  }

  /**
   * VERIFY EMAIL CONFIGURATION
   */
  static async verifyEmailConfig() {
    try {
      console.log('🔐 Verifying Gmail configuration with App Password...');
      
      const transporter = this.createTransporter();
      await transporter.verify();
      
      console.log('✅ Gmail configuration verified successfully!');
      console.log('✅ App Password is working correctly!');
      return true;
      
    } catch (error) {
      console.error('❌ Gmail configuration failed:', error.message);
      this.handleEmailError(error);
      return false;
    }
  }

  /**
   * SEND PASSWORD RESET OTP
   */
  static async sendPasswordResetOTP(email, otpCode) {
    try {
      console.log(`📨 Sending OTP to: ${email}`);
      
      // Create transporter with App Password
      const transporter = this.createTransporter();

      // Verify connection before sending
      console.log('🔍 Verifying email connection...');
      await transporter.verify();
      console.log('✅ Email connection verified');

      const mailOptions = {
        from: {
          name: 'ISP Support', // Professional display name
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'ISP Password Reset Code - Action Required',
        html: this.generateOTPEmailTemplate(otpCode),
        // Text fallback for email clients that don't support HTML
        text: `Your ISP password reset code is: ${otpCode}. This code will expire in 10 minutes.`
      };

      console.log('🚀 Sending email...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`✅ OTP email sent successfully to ${email}`);
      console.log(`📫 Message ID: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending OTP email:');
      this.handleEmailError(error);
      return false;
    }
  }

  /**
   * GENERATE OTP EMAIL TEMPLATE
   */
  static generateOTPEmailTemplate(otpCode) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background-color: #f6f9fc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .otp-section { 
            padding: 40px 30px; 
            text-align: center; 
          }
          .otp-label {
            color: #666;
            font-size: 16px;
            margin-bottom: 15px;
          }
          .otp-code { 
            font-size: 52px; 
            font-weight: bold; 
            color: #2d3748;
            letter-spacing: 12px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 2px dashed #e2e8f0;
          }
          .expiry-notice {
            color: #718096;
            font-size: 14px;
            margin: 25px 0;
            padding: 12px;
            background: #fffaf0;
            border-radius: 6px;
            border-left: 4px solid #f6ad55;
          }
          .security-alert {
            background: #fed7d7;
            color: #742a2a;
            padding: 20px;
            margin: 20px;
            border-radius: 8px;
            border-left: 4px solid #e53e3e;
          }
          .footer {
            background: #f7fafc;
            padding: 25px;
            text-align: center;
            color: #718096;
            font-size: 13px;
            border-top: 1px solid #e2e8f0;
          }
          @media (max-width: 600px) {
            .otp-code { 
              font-size: 42px; 
              letter-spacing: 8px;
              padding: 15px;
            }
            .header, .otp-section {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>Enter the verification code below to reset your password</p>
          </div>
          
          <div class="otp-section">
            <div class="otp-label">Your verification code is:</div>
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-notice">
              ⏰ <strong>Expires in 10 minutes</strong> - Use this code quickly to reset your password
            </div>
          </div>
          
          <div class="security-alert">
            <strong>🔒 Security Alert:</strong><br>
            • Never share this code with anyone<br>
            • Our team will never ask for this code<br>
            • If you didn't request this, please ignore this email
          </div>
          
          <div class="footer">
            <p>This is an automated message from ISP Support System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * SEND PASSWORD RESET SUCCESS EMAIL
   */
  static async sendPasswordResetSuccess(email) {
    try {
      console.log(`📨 Sending reset success notification to: ${email}`);
      
      const transporter = this.createTransporter();
      await transporter.verify();

      const mailOptions = {
        from: {
          name: 'ISP Support',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Password Successfully Reset - ISP Account',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">✅ Password Reset Successful</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ISP account password has been updated</p>
            </div>
            
            <div style="padding: 40px 30px; text-align: center;">
              <div style="background: #c6f6d5; color: #22543d; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169;">
                <p style="margin: 0; font-size: 16px; font-weight: 500;">
                  Your password has been successfully reset. You can now log in to your ISP account with your new password.
                </p>
              </div>
              
              <div style="background: #feebc8; color: #744210; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #dd6b20;">
                <h4 style="margin: 0 0 10px 0;">Security Notice</h4>
                <p style="margin: 0; font-size: 14px;">
                  If you did not initiate this password reset, please contact our support team immediately.
                </p>
              </div>
            </div>
            
            <div style="background: #f7fafc; padding: 25px; text-align: center; color: #718096; font-size: 13px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">ISP Support Team • This is an automated message</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset success email sent to ${email}`);
      console.log(`📫 Message ID: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending success email:');
      this.handleEmailError(error);
      return false;
    }
  }

  /**
   * HANDLE EMAIL ERRORS
   */
  static handleEmailError(error) {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      command: error.command
    });

    if (error.code === 'EAUTH') {
      console.error('\n🔐 AUTHENTICATION FAILED - App Password Issues:');
      
    } else if (error.code === 'EENVELOPE') {
      console.error('Invalid email address format');
    } else if (error.code === 'ECONNECTION') {
      console.error('Network connection failed - check internet connection');
    } else {
      console.error('Unexpected email error:', error.message);
    }
  }

  /**
   * VALIDATE OTP FORMAT (4 digits)
   */
  static validateOTPFormat(otp) {
    const otpRegex = /^\d{4}$/;
    return otpRegex.test(otp);
  }

  /**
   * CHECK IF OTP IS EXPIRED
   */
  static isOTPExpired(expiryTime) {
    return new Date() > new Date(expiryTime);
  }

  /**
   * CALCULATE TIME REMAINING
   */
  static getTimeRemaining(expiryTime) {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diff = expiry - now;
    
    if (diff <= 0) return 0;
    return Math.floor(diff / 1000); // Returns seconds remaining
  }
}

module.exports = OTPService;