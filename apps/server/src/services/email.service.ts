import nodemailer from 'nodemailer';
import { env } from '../config/env';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: env.SMTP_FROM,
                to,
                subject,
                html,
            });
            console.log(`Email sent to ${to}: ${subject}`);
        } catch (error) {
            console.error(`Failed to send email to ${to}:`, error);
        }
    }

    async sendStageUpdateEmail(
        studentEmail: string,
        studentName: string,
        driveName: string,
        companyName: string,
        newStage: string
    ): Promise<void> {
        const subject = `Application Update: ${driveName} at ${companyName}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">CareerNest – Application Update</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>Your application status for <strong>${driveName}</strong> at <strong>${companyName}</strong> has been updated:</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; color: #16213e;">
            New Status: <strong style="color: #0f3460;">${newStage.replace(/_/g, ' ').toUpperCase()}</strong>
          </p>
        </div>
        <p>Log in to your CareerNest portal for more details.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email from CareerNest. Do not reply.</p>
      </div>
    `;

        await this.sendEmail(studentEmail, subject, html);
    }

    async sendCredentialEmail(
        email: string,
        name: string,
        role: string,
        tempPassword: string
    ): Promise<void> {
        const subject = `Welcome to CareerNest – Your Login Credentials`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Welcome to CareerNest!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your <strong>${role}</strong> account has been created. Here are your login credentials:</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p>Please change your password after your first login.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email from CareerNest. Do not reply.</p>
      </div>
    `;

        await this.sendEmail(email, subject, html);
    }
}

export const emailService = new EmailService();
