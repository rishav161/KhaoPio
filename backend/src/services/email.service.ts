import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_FROM = process.env.SMTP_FROM || 'Restaurant POS <no-reply@yourdomain.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class EmailService {
  /**
   * Creates a Nodemailer transporter if configuration is present.
   */
  private getTransporter() {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return null;
    }
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  /**
   * Sends an invitation email to a newly invited staff member using SMTP.
   */
  async sendInvitationEmail(email: string, token: string, roleName: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('WARNING: SMTP configuration is incomplete. Skipping invitation email dispatch.');
      return false;
    }

    const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;

    const mailOptions = {
      from: SMTP_FROM,
      to: email,
      subject: 'Invitation to join Restaurant POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333333; text-align: center;">Welcome to the POS System</h2>
          <p style="font-size: 16px; color: #555555; line-height: 1.5;">
            You have been invited to join the restaurant staff as a <strong>${roleName}</strong>.
          </p>
          <p style="font-size: 16px; color: #555555; line-height: 1.5;">
            To accept this invitation, set up your profile name, and create your 4-digit security PIN, please click the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
              Set Up Your Account
            </a>
          </div>
          <p style="font-size: 14px; color: #777777; line-height: 1.5;">
            This link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999999; text-align: center;">
            Restaurant POS System &copy; ${new Date().getFullYear()}
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Invitation email successfully dispatched to ${email} via SMTP.`);
      return true;
    } catch (error: any) {
      console.warn(`[Email Service Warning] Failed to send invitation email to ${email} (SMTP returned: ${error.message || error}). Proceeding with manual invite URL.`);
      return false;
    }
  }

  /**
   * Sends an OTP verification email using SMTP.
   */
  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('WARNING: SMTP configuration is incomplete. Skipping OTP email dispatch.');
      return false;
    }

    const mailOptions = {
      from: SMTP_FROM,
      to: email,
      subject: 'Verification Code for Restaurant POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333333; text-align: center;">Verify Your Email Address</h2>
          <p style="font-size: 16px; color: #555555; line-height: 1.5;">
            Thank you for signing up as a Super Admin on KhaoPio. Please verify your email address by entering the following 6-digit verification code:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background-color: #ff542d; color: white; padding: 12px 30px; border-radius: 8px; font-weight: 900; font-size: 28px; letter-spacing: 0.15em;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #777777; line-height: 1.5; text-align: center;">
            This verification code is valid for 10 minutes. If you did not sign up for an account, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999999; text-align: center;">
            KhaoPio POS System &copy; ${new Date().getFullYear()}
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`OTP verification email successfully dispatched to ${email} via SMTP.`);
      return true;
    } catch (error: any) {
      console.warn(`[Email Service Warning] Failed to send OTP verification email to ${email} (SMTP returned: ${error.message || error}).`);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
