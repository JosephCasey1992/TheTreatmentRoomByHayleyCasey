<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false]));
}

$d = json_decode(file_get_contents('php://input'), true);
if (!$d) { http_response_code(400); exit(json_encode(['ok' => false])); }

function h($v) { return htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8'); }

$to      = 'hello@hayleycasey.co.uk';
$from    = 'hello@hayleycasey.co.uk';
$replyTo = filter_var($d['email'] ?? '', FILTER_SANITIZE_EMAIL);
$name    = h(($d['firstName'] ?? '') . ' ' . ($d['lastName'] ?? ''));
$treat   = h($d['treatment'] ?? '');
$phone   = h($d['phone'] ?? '');
$pmu     = h($d['previousPmu'] ?? '');
$msg     = nl2br(h($d['message'] ?? ''));

$subjectRaw = "New enquiry from {$name} — {$treat}";
$subject = '=?UTF-8?B?' . base64_encode($subjectRaw) . '?=';

$html = "
<p><strong>Name:</strong> {$name}</p>
<p><strong>Email:</strong> <a href='mailto:{$replyTo}'>{$replyTo}</a></p>
<p><strong>Phone:</strong> {$phone}</p>
<p><strong>Treatment:</strong> {$treat}</p>
<p><strong>Previous PMU:</strong> {$pmu}</p>
<p><strong>Message:</strong><br>{$msg}</p>
";

$b = 'alt_' . md5(microtime());
$headers  = "From: The Treatment Room Website <{$from}>\r\n";
$headers .= "Reply-To: {$replyTo}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$b}\"\r\n";

$plain = "Name: {$name}\nEmail: {$replyTo}\nPhone: {$phone}\nTreatment: {$treat}\nPrevious PMU: {$pmu}\nMessage:\n" . ($d['message'] ?? '');

$body  = "--{$b}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n{$plain}\r\n";
$body .= "--{$b}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{$html}\r\n";
$body .= "--{$b}--";

$ok = mail($to, $subject, $body, $headers);
echo json_encode(['ok' => $ok]);
