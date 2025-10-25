import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'localhost';
const port = Number(process.env.SMTP_PORT || 1025);
const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
const user = process.env.SMTP_USER || undefined;
const pass = process.env.SMTP_PASS || undefined;
const fromDefault = process.env.SMTP_FROM || 'Matcha <no-reply@matcha.local>';

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) {
  const info = await transport.sendMail({
    from: opts.from || fromDefault,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  // eslint-disable-next-line no-console
  console.log('[mail] sent', info.messageId);
  return info;
}
