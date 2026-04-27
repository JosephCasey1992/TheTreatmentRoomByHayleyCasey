import 'dotenv/config';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gzipSync } from 'zlib';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ionos.co.uk',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function handleSendConsultation(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const d = JSON.parse(Buffer.concat(chunks).toString());

  // Pull signature out as an attachment
  const sigBase64 = d.signature?.replace(/^data:image\/png;base64,/, '') ?? '';

  const yesNo = (v) => v === 'Yes' ? '✅ Yes' : '❌ No';
  const checked = (v) => v === 'on' ? '✅' : '—';

  const html = `
    <h2 style="font-family:serif;">Consultation Form — ${d.fullName}</h2>

    <h3>Personal Details</h3>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr><td><strong>Full Name</strong></td><td>${d.fullName}</td></tr>
      <tr><td><strong>Date of Birth</strong></td><td>${d.dob}</td></tr>
      <tr><td><strong>Address</strong></td><td>${d.address}</td></tr>
      <tr><td><strong>Mobile</strong></td><td>${d.mobile}</td></tr>
      <tr><td><strong>Email</strong></td><td>${d.email}</td></tr>
      <tr><td><strong>Medications</strong></td><td>${d.medication || 'None'}</td></tr>
      <tr><td><strong>Referral</strong></td><td>${d.referral || '—'}</td></tr>
    </table>

    <h3>Allergies</h3>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr><td>Metals</td><td>${yesNo(d.al_metals)}</td><td>Foods</td><td>${yesNo(d.al_foods)}</td></tr>
      <tr><td>Glycerine</td><td>${yesNo(d.al_glycerine)}</td><td>Pigments</td><td>${yesNo(d.al_pigments)}</td></tr>
      <tr><td>Lidocaine</td><td>${yesNo(d.al_lidocaine)}</td><td>Antiseptics</td><td>${yesNo(d.al_antiseptics)}</td></tr>
      <tr><td colspan="2"><strong>Other</strong></td><td colspan="2">${d.otherAllergies || 'None'}</td></tr>
    </table>

    <h3>Medical Questions</h3>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr><td>Dental injection to numb gums?</td><td>${yesNo(d.mq_dental)}</td></tr>
      <tr><td>Ongoing antibiotic medication?</td><td>${yesNo(d.mq_antibiotics)}</td></tr>
      <tr><td>Difficulty breathing / rapid heartbeat?</td><td>${yesNo(d.mq_breathing)}</td></tr>
      <tr><td>Chemotherapy / radiation (last year)?</td><td>${yesNo(d.mq_chemo)}</td></tr>
      <tr><td>Pregnant or possibly pregnant?</td><td>${yesNo(d.mq_pregnant)}</td></tr>
      <tr><td>Breastfeeding?</td><td>${yesNo(d.mq_breastfeeding)}</td></tr>
      <tr><td>MRI scan in next 3 months?</td><td>${yesNo(d.mq_mri)}</td></tr>
      <tr><td>Laser / IPL scheduled?</td><td>${yesNo(d.mq_laser)}</td></tr>
      <tr><td>Give blood?</td><td>${yesNo(d.mq_blood)}</td></tr>
      <tr><td>Sensitised reaction to tattoos / PMU?</td><td>${yesNo(d.mq_tatreaction)}</td></tr>
    </table>

    <h3>Medical Conditions</h3>
    <p style="font-size:14px;">${d.medicalConditions || 'None'}</p>

    <h3>Additional Information</h3>
    <p style="font-size:14px;">${d.extraInfo || 'None'}</p>

    <h3>Consent</h3>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tr><td>General consent</td><td>${checked(d.consent_general)} Agreed</td></tr>
      <tr><td>GDPR &amp; Photography</td><td>${d.gdprConsent === 'agree' ? '✅ Agreed' : '❌ Did not agree'}</td></tr>
      <tr><td>Booking policy</td><td>${checked(d.consent_policy)} Agreed</td></tr>
    </table>

    <h3>Signature</h3>
    <img src="cid:signature" alt="Client signature" style="border:1px solid #ccc;max-width:500px;">
  `;

  await transporter.sendMail({
    from: `"The Treatment Room Website" <${process.env.SMTP_USER}>`,
    to: 'consultations@hayleycasey.co.uk',
    replyTo: d.email,
    subject: `Consultation Form — ${d.fullName}`,
    html,
    attachments: sigBase64 ? [{
      filename: 'signature.png',
      content: sigBase64,
      encoding: 'base64',
      cid: 'signature',
    }] : [],
  });
}

async function handleSendMessage(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString());

  const { firstName, lastName, email, phone, treatment, previousPmu, message } = body;

  await transporter.sendMail({
    from: `"The Treatment Room Website" <${process.env.SMTP_USER}>`,
    to: 'hello@hayleycasey.co.uk',
    replyTo: email,
    subject: `New enquiry from ${firstName} ${lastName} — ${treatment}`,
    text: [
      `Name: ${firstName} ${lastName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Treatment: ${treatment}`,
      `Previous PMU: ${previousPmu}`,
      `Message:\n${message}`,
    ].join('\n'),
    html: `
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Treatment:</strong> ${treatment}</p>
      <p><strong>Previous PMU:</strong> ${previousPmu}</p>
      <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
    `,
  });
}

const server = createServer(async (req, res) => {
  // IONOS terminates TLS at the edge and sets X-Forwarded-Proto.
  // Redirect to HTTPS if the original request came in over HTTP.
  if (req.headers['x-forwarded-proto'] === 'http') {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/send-consultation') {
    try {
      await handleSendConsultation(req, res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('Consultation mail error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/send-message') {
    try {
      await handleSendMessage(req, res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('Mail error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  const url = decodeURIComponent(req.url === '/' ? '/index.html' : req.url);
  const filePath = join(__dirname, url);
  const ext = extname(filePath).toLowerCase();

  const imgExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico', '.woff2', '.svg']);
  const textExts = new Set(['.html', '.css', '.js', '.json', '.mjs']);
  const cacheControl = ext === '.html'
    ? 'no-cache'
    : imgExts.has(ext)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400';

  const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');

  try {
    const data = await readFile(filePath);
    const headers = {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl,
    };
    if (textExts.has(ext) && acceptsGzip) {
      const compressed = gzipSync(data);
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = compressed.length;
      res.writeHead(200, headers);
      res.end(compressed);
    } else {
      res.writeHead(200, headers);
      res.end(data);
    }
  } catch {
    try {
      const data = await readFile(join(__dirname, 'index.html'));
      const headers = { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' };
      if (acceptsGzip) {
        const compressed = gzipSync(data);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = compressed.length;
        res.writeHead(200, headers);
        res.end(compressed);
      } else {
        res.writeHead(200, headers);
        res.end(data);
      }
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, () => console.log(`✓ Running at http://localhost:${PORT}`));
