import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter && config.email.host && config.email.user && config.email.password) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }
  return transporter;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetUrl: string,
  userName: string
): Promise<void> => {
  const transport = getTransporter();

  if (!transport) {
    logger.warn('Email not configured. Password reset link:', resetUrl);
    // In development, just log the URL
    if (config.isDevelopment) {
      console.log('\n===========================================');
      console.log('🔐 PASSWORD RESET LINK (DEV MODE)');
      console.log('===========================================');
      console.log(`User: ${userName} (${to})`);
      console.log(`Link: ${resetUrl}`);
      console.log('===========================================\n');
    }
    return;
  }

  const mailOptions = {
    from: config.email.from || 'noreply@uploadme.com',
    to,
    subject: 'Reset Your Password - UploadMe',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password for your UploadMe account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            
            <p>For security reasons, all your active sessions will be logged out after password reset.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UploadMe. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${userName},

We received a request to reset your password for your UploadMe account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email. Your password won't change until you create a new one.

For security reasons, all your active sessions will be logged out after password reset.

© ${new Date().getFullYear()} UploadMe. All rights reserved.
    `,
  };

  try {
    await transport.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send email verification email (for future use)
 */
export const sendVerificationEmail = async (
  to: string,
  verificationUrl: string,
  userName: string
): Promise<void> => {
  const transport = getTransporter();

  if (!transport) {
    logger.warn('Email not configured. Verification link:', verificationUrl);
    if (config.isDevelopment) {
      console.log('\n===========================================');
      console.log('✉️ EMAIL VERIFICATION LINK (DEV MODE)');
      console.log('===========================================');
      console.log(`User: ${userName} (${to})`);
      console.log(`Link: ${verificationUrl}`);
      console.log('===========================================\n');
    }
    return;
  }

  // TODO: Implement email verification template
  logger.info(`Email verification would be sent to ${to}`);
};
