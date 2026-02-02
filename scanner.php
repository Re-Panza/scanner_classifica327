<?php
// --- CONFIGURAZIONE ---
$serverID = "LKWorldServer-IT-15"; 
$fileDatabase = 'mondo337_temp.json'; // File temporaneo per il workflow
$fileInput = 'database_mondo_337.json'; // File unico da cui recuperare i quadranti noti
$backendURL = "http://backend1.lordsandknights.com"; 

$tempMap = [];
$puntiCaldi = []; 

// 1. Carichiamo i quadranti già noti dal database unificato
if (file_exists($fileInput)) {
    $content = file_get_contents($fileInput);
    $currentData = json_decode($content, true);
    if (is_array($currentData)) {
        foreach ($currentData as $entry) {
            $key = $entry['x'] . "_" . $entry['y'];
            $tempMap[$key] = $entry;
            $jtileX = floor($entry['x'] / 32); 
            $jtileY = floor($entry['y'] / 32);
            $puntiCaldi[$jtileX . "_" . $jtileY] = ['x' => $jtileX, 'y' => $jtileY];
        }
    }
}

echo "Dati caricati. Analisi di " . count($puntiCaldi) . " quadranti noti...\n";

// Fase 1: Scansione zone note
foreach ($puntiCaldi as $zona) {
    processTile($zona['x'], $zona['y'], $serverID, $tempMap, $backendURL);
}

// Fase 2: Espansione (Raggio 150 dal centro del mondo 337)
$centerX = 512; $centerY = 512; $raggio = 150;
for ($r = 1; $r <= $raggio; $r++) {
    $xMin = $centerX - $r; $xMax = $centerX + $r;
    $yMin = $centerY - $r; $yMax = $centerY + $r;
    for ($i = $xMin; $i <= $xMax; $i++) {
        processTile(floor($i), floor($yMin), $serverID, $tempMap, $backendURL);
        processTile(floor($i), floor($yMax), $serverID, $tempMap, $backendURL);
    }
    for ($j = $yMin + 1; $j < $yMax; $j++) {
        processTile(floor($xMin), floor($j), $serverID, $tempMap, $backendURL);
        processTile(floor($xMax), floor($j), $serverID, $tempMap, $backendURL);
    }
}

// Pulizia (72h) e salvataggio nel file temporaneo
$limite = time() - (72 * 3600);
$mappaPulita = array_filter($tempMap, function($e) use ($limite) { 
    return !isset($e['d']) || $e['d'] > $limite; 
});

file_put_contents($fileDatabase, json_encode(array_values($mappaPulita), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Scansione terminata. Dati salvati in $fileDatabase\n";

function processTile($x, $y, $sid, &$tmp, $bk) {
    $url = "$bk/maps/$sid/{$x}_{$y}.jtile";
    $content = @file_get_contents($url);
    if (!$content || $content === 'callback_politicalmap({})') return false;
    if (preg_match('/\((.*)\)/s', $content, $matches)) {
        $json = json_decode($matches[1], true);
        if (isset($json['habitatArray'])) {
            foreach ($json['habitatArray'] as $h) {
                $key = $h['mapx'] . "_" . $h['mapy'];
                $tmp[$key] = [
                    'p' => (int)$h['playerid'],
                    'a' => (int)$h['allianceid'],
                    'n' => $h['name'],
                    'x' => (int)$h['mapx'],
                    'y' => (int)$h['mapy'],
                    'pt'=> (int)$h['points'],
                    't' => (int)$h['type'],
                    'd' => time()
                ];
            }
            return true;
        }
    }
    return false;
}
