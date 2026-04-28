<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false]));
}

$d = json_decode(file_get_contents('php://input'), true);
if (!$d) { http_response_code(400); exit(json_encode(['ok' => false])); }

function h($v) { return htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8'); }
function yn($v) { return $v === 'Yes' ? '✅ Yes' : '❌ No'; }
function ck($v) { return $v === 'on' ? '✅' : '—'; }

$to      = 'consultations@hayleycasey.co.uk';
$from    = 'hello@hayleycasey.co.uk';
$replyTo = filter_var($d['email'] ?? '', FILTER_SANITIZE_EMAIL);

$subjectRaw = 'Consultation Form — ' . ($d['fullName'] ?? '');
$subject = '=?UTF-8?B?' . base64_encode($subjectRaw) . '?=';

$html = "
<h2 style='font-family:serif;'>Consultation Form — " . h($d['fullName']) . "</h2>

<h3>Personal Details</h3>
<table cellpadding='6' style='border-collapse:collapse;width:100%;font-size:14px;'>
  <tr><td><strong>Full Name</strong></td><td>" . h($d['fullName']) . "</td></tr>
  <tr><td><strong>Date of Birth</strong></td><td>" . h($d['dob']) . "</td></tr>
  <tr><td><strong>Address</strong></td><td>" . h($d['address']) . "</td></tr>
  <tr><td><strong>Mobile</strong></td><td>" . h($d['mobile']) . "</td></tr>
  <tr><td><strong>Email</strong></td><td>" . h($d['email']) . "</td></tr>
  <tr><td><strong>Medications</strong></td><td>" . h($d['medication'] ?: 'None') . "</td></tr>
  <tr><td><strong>Referral</strong></td><td>" . h($d['referral'] ?: '—') . "</td></tr>
</table>

<h3>Allergies</h3>
<table cellpadding='6' style='border-collapse:collapse;width:100%;font-size:14px;'>
  <tr><td>Metals</td><td>" . yn($d['al_metals']) . "</td><td>Foods</td><td>" . yn($d['al_foods']) . "</td></tr>
  <tr><td>Glycerine</td><td>" . yn($d['al_glycerine']) . "</td><td>Pigments</td><td>" . yn($d['al_pigments']) . "</td></tr>
  <tr><td>Lidocaine</td><td>" . yn($d['al_lidocaine']) . "</td><td>Antiseptics</td><td>" . yn($d['al_antiseptics']) . "</td></tr>
  <tr><td colspan='2'><strong>Other</strong></td><td colspan='2'>" . h($d['otherAllergies'] ?: 'None') . "</td></tr>
</table>

<h3>Medical Questions</h3>
<table cellpadding='6' style='border-collapse:collapse;width:100%;font-size:14px;'>
  <tr><td>Dental injection to numb gums?</td><td>" . yn($d['mq_dental']) . "</td></tr>
  <tr><td>Ongoing antibiotic medication?</td><td>" . yn($d['mq_antibiotics']) . "</td></tr>
  <tr><td>Difficulty breathing / rapid heartbeat?</td><td>" . yn($d['mq_breathing']) . "</td></tr>
  <tr><td>Chemotherapy / radiation (last year)?</td><td>" . yn($d['mq_chemo']) . "</td></tr>
  <tr><td>Pregnant or possibly pregnant?</td><td>" . yn($d['mq_pregnant']) . "</td></tr>
  <tr><td>Breastfeeding?</td><td>" . yn($d['mq_breastfeeding']) . "</td></tr>
  <tr><td>MRI scan in next 3 months?</td><td>" . yn($d['mq_mri']) . "</td></tr>
  <tr><td>Laser / IPL scheduled?</td><td>" . yn($d['mq_laser']) . "</td></tr>
  <tr><td>Give blood?</td><td>" . yn($d['mq_blood']) . "</td></tr>
  <tr><td>Sensitised reaction to tattoos / PMU?</td><td>" . yn($d['mq_tatreaction']) . "</td></tr>
</table>

<h3>Medical Conditions</h3>
<p style='font-size:14px;'>" . h($d['medicalConditions'] ?: 'None') . "</p>

<h3>Additional Information</h3>
<p style='font-size:14px;'>" . h($d['extraInfo'] ?: 'None') . "</p>

<h3>Consent</h3>
<table cellpadding='6' style='border-collapse:collapse;width:100%;font-size:14px;'>
  <tr><td>General consent</td><td>" . ck($d['consent_general']) . " Agreed</td></tr>
  <tr><td>GDPR &amp; Photography</td><td>" . ($d['gdprConsent'] === 'agree' ? '✅ Agreed' : '❌ Did not agree') . "</td></tr>
  <tr><td>Booking policy</td><td>" . ck($d['consent_policy']) . " Agreed</td></tr>
</table>

<h3>Signature</h3>
<img src='cid:signature' alt='Client signature' style='border:1px solid #ccc;max-width:500px;'>
";

$sigBase64 = '';
if (!empty($d['signature'])) {
    $sigBase64 = preg_replace('/^data:image\/png;base64,/', '', $d['signature']);
}

if ($sigBase64) {
    $rb = 'related_' . md5(microtime());
    $headers  = "From: The Treatment Room Website <{$from}>\r\n";
    $headers .= "Reply-To: {$replyTo}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/related; boundary=\"{$rb}\"\r\n";

    $body  = "--{$rb}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $body .= $html . "\r\n";
    $body .= "--{$rb}\r\n";
    $body .= "Content-Type: image/png\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-ID: <signature>\r\n";
    $body .= "Content-Disposition: inline; filename=\"signature.png\"\r\n\r\n";
    $body .= chunk_split($sigBase64) . "\r\n";
    $body .= "--{$rb}--";
} else {
    $headers  = "From: The Treatment Room Website <{$from}>\r\n";
    $headers .= "Reply-To: {$replyTo}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body = $html;
}

$ok = mail($to, $subject, $body, $headers);
echo json_encode(['ok' => $ok]);
