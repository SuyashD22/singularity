/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'noreply@eventpass.com';
let transporter = null;
if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for others
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
    console.log(`Nodemailer transport configured using Brevo SMTP at ${smtpHost}:${smtpPort}`);
}
else {
    console.warn('WARNING: SMTP_USER or SMTP_PASS environment variables are not set. Nodemailer will run in MOCK mode (printing passes to console).');
}
/**
 * Sends the signed access pass token to the participant's email.
 */
export async function sendEmailPass(email, name, token) {
    const subject = `Singularity '26 Access Pass - ${name}`;
    const textBody = `Hi ${name},\n\nYour on-site check-in was successful!\n\nHere is your secure cryptographic QR access token:\n\n${token}\n\nPresent this code at food counters to claim items.\n\nEnjoy the event!`;
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Event Access Pass</title>
    </head>
    <body style="margin: 0; padding: 0;">
      
      <!-- Outer Wrapper -->
      <div style="padding: 40px 20px;">
        
        <!-- Glassmorphism Card -->
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 30px; background-color: rgba(10, 10, 10, 0.92); border: 1px solid rgba(200, 241, 53, 0.2); border-radius: 24px; color: #F0EDE8; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(200,241,53,0.1);">
          
          <!-- Centered Logo / Header -->
          <div style="text-align: center; margin-bottom: 30px;">
             <img src="cid:logo" alt="Singularity" style="width: 50px; height: 50px; margin-bottom: 12px; display: inline-block;" />
             <div style="color: #c8f135; font-weight: 900; font-size: 26px; letter-spacing: 0.1em; text-transform: uppercase;">
                SINGULARITY
             </div>
             <div style="color: #FFFFFF; font-size: 11px; font-family: monospace; letter-spacing: 0.2em; margin-top: 6px; opacity: 0.7;">
                // ACCESS PASS VERIFIED //
             </div>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">Hi <strong style="color: #FFFFFF;">${name}</strong>,</p>
          <p style="font-size: 15px; color: #A09E9A; line-height: 1.6;">Your check-in is complete. Present the cryptographic QR code below at the fulfillment counters to claim your items.</p>
          
          <!-- QR Code Container with Centered Logo trick -->
          <div style="text-align: center; margin: 40px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
              <tr>
                <td style="border: 2px solid #c8f135; border-radius: 20px; background: #FFFFFF; padding: 16px; box-shadow: 0 0 30px rgba(200,241,53,0.2);">
                  <!-- The QR code is the background of this cell, and the logo sits in the exact middle -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="220" height="220" background="cid:qrcode" style="background-image: url('cid:qrcode'); background-size: cover; width: 220px; height: 220px;">
                    <tr>
                      <td align="center" valign="middle">
                        <img src="cid:logo" alt="Logo" width="48" height="48" style="display: block; border-radius: 50%; background: #FFFFFF; padding: 4px; border: 2px solid #000000;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
     
          <div style="background-color: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; font-family: monospace; word-break: break-all; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: #c8f135; text-align: center;">
            <span style="color: #888580; font-size: 11px; display: block; margin-bottom: 6px;">SECURE TOKEN ID</span>
            ${token.substring(0, 24)}...
          </div>
          
          <div style="margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; font-size: 10px; color: #555555; text-align: center; line-height: 1.6; font-family: monospace;">
            <p style="margin: 0;">AUTOMATED SYSTEM MESSAGE // DO NOT REPLY</p>
            <p style="margin: 4px 0 0 0; color: rgba(200,241,53,0.4);">
              REF: ${token.substring(token.length - 8).toUpperCase()} | ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
    if (transporter) {
        try {
            const attachments = [];
            // Fetch and build binary inline attachment for the QR code image
            try {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
                const qrRes = await fetch(qrUrl);
                if (qrRes.ok) {
                    const qrBuffer = Buffer.from(await qrRes.arrayBuffer());
                    attachments.push({
                        filename: 'qrcode.png',
                        content: qrBuffer,
                        cid: 'qrcode'
                    });
                }
                // Attach the logo for the center of the QR and the header
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const logoPath = path.resolve(process.cwd(), '../frontend/public/logo.webp');
                    if (fs.existsSync(logoPath)) {
                        attachments.push({
                            filename: 'logo.webp',
                            content: fs.readFileSync(logoPath),
                            cid: 'logo'
                        });
                    }
                }
                catch (e) {
                    console.error("Could not load local logo:", e);
                }
            }
            catch (qrErr) {
                console.error('Failed to fetch/generate QR pass inline attachment:', qrErr);
            }
            await transporter.sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'Singularity'}" <${smtpFrom}>`,
                to: email,
                subject: subject,
                text: textBody,
                html: htmlBody,
                attachments: attachments,
            });
            console.log(`Cryptographic QR code email pass successfully sent to ${email}`);
            return true;
        }
        catch (err) {
            console.error(`SMTP transmission failed for ${email}:`, err);
            return false;
        }
    }
    else {
        console.log('\n--- [MOCK EMAIL DISPATCH] ---');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Token: ${token}`);
        console.log('------------------------------\n');
        return true;
    }
}
