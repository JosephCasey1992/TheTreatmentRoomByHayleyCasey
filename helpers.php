<?php
function h($v) { return htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8'); }
function yn($v) { return $v === 'Yes' ? '✅ Yes' : '❌ No'; }
function ck($v) { return $v === 'on' ? '✅' : '—'; }
