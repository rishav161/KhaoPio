import dotenv from 'dotenv';

dotenv.config();

const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.yourdomain.com';
const MAILGUN_API_URL = process.env.MAILGUN_API_URL || 'https://api.mailgun.net';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class EmailService {
  /**
   * Sends an invitation email to a newly invited staff member using Mailgun.
   */
  async sendInvitationEmail(email: string, token: string, roleName: string): Promise<boolean> {
    if (!EMAIL_API_KEY) {
      console.warn('WARNING: EMAIL_API_KEY is not defined. Skipping invitation email dispatch.');
      return false;
    }

    const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;
    const mailgunEndpoint = `${MAILGUN_API_URL}/v3/${MAILGUN_DOMAIN}/messages`;

    // Construct Basic Authentication header (api:EMAIL_API_KEY)
    const authHeader = 'Basic ' + Buffer.from(`api:${EMAIL_API_KEY}`).toString('base64');

    // Mailgun expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('from', `Restaurant POS <no-reply@${MAILGUN_DOMAIN}>`);
    formData.append('to', email);
    formData.append('subject', 'Invitation to join Restaurant POS');
    formData.append('html', `
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
    `);

    try {
      const response = await fetch(mailgunEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailgun Error (${response.status}): ${errorText}`);
      }

      console.log(`Invitation email successfully dispatched to ${email} via Mailgun.`);
      return true;
    } catch (error: any) {
      console.warn(`[Email Service Warning] Failed to send invitation email to ${email} (Mailgun returned: ${error.message || error}). Proceeding with manual invite URL.`);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
