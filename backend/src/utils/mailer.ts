import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[mailer] EMAIL_HOST/USER/PASS not set — emails will be logged only');
    return null;
  }
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT ?? 587,
    secure: env.EMAIL_SECURE ?? false,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const from = env.EMAIL_FROM || env.EMAIL_USER || 'noreply@brainarena.local';
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer:mock] To: ${to}\nSubject: ${subject}\n${html}`);
    return;
  }
  try {
    await t.sendMail({ from, to, subject, html });
    console.log(`[mailer] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[mailer] Failed to send to ${to}:`, err);
    // Don't throw — approval should succeed even if email fails
  }
}

export function approvedMail(name: string): { subject: string; html: string } {
  return {
    subject: 'BrainArena — Registration Approved',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a12;color:#e2e8f0;border-radius:16px">
        <h2 style="color:#a78bfa;margin:0 0 12px">Registration Approved ✓</h2>
        <p>Hi ${name},</p>
        <p>Your <strong>teacher</strong> account on <strong>BrainArena</strong> has been <span style="color:#4ade80">approved</span> by the admin.</p>
        <p>Registration completed — you can now log in and create/host quizzes (up to 50 participants per quiz).</p>
        <a href="${env.FRONTEND_URL}/login" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:12px;font-weight:600">Log in to BrainArena</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">If you didn't request this, ignore this email.</p>
      </div>`,
  };
}

export function rejectedMail(name: string): { subject: string; html: string } {
  return {
    subject: 'BrainArena — Registration Update',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a12;color:#e2e8f0;border-radius:16px">
        <h2 style="color:#f87171;margin:0 0 12px">Registration Not Approved</h2>
        <p>Hi ${name},</p>
        <p>Your teacher registration on <strong>BrainArena</strong> was <span style="color:#f87171">not approved</span> by the admin.</p>
        <p>You may contact the admin for details or re-apply with correct information.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">This is an automated message.</p>
      </div>`,
  };
}
