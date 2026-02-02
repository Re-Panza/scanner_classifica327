
<?php
$serverID = "LKWorldServer-RE-IT-6";
$fileDatabase = 'database_mondo_327.json';
$backendURL = "http://backend3.lordsandknights.com";

$tempMap = [];
$puntiCaldi = []; 

if (file_exists($fileDatabase)) {
    $content = file_get_contents($fileDatabase);
    $currentData = json_decode($content, true);
    
    // Protezione contro file non validi
    if (is_array($currentData)) {
        foreach ($currentData as $entry) {
            if (is_array($entry) && isset($entry['x'], $entry['y'])) {
                $key = $entry['x'] . "_" . $entry['y'];
                $tempMap[$key] = $entry;
                $jtileX = floor($entry['x'] / 32); 
                $jtileY = floor($entry['y'] / 32);
                $puntiCaldi[$jtileX . "_" . $jtileY] = ['x' => $jtileX, 'y' => $jtileY];
            }
        }
    }
}

echo "Dati caricati. Analisi di " . count($puntiCaldi) . " quadranti conosciuti...\n";

// Fase 1: Zone note
foreach ($puntiCaldi as $zona) {
    processTile($zona['x'], $zona['y'], $serverID, $tempMap, $backendURL);
}

// Fase 2: Espansione (Raggio 150)
$centerX = 503; $centerY = 503;
if (count($tempMap) > 0) {
    $sumX = 0; $sumY = 0;
    foreach ($tempMap as $h) { $sumX += floor($h['x']/32); $sumY += floor($h['y']/32); }
    $centerX = round($sumX / count($tempMap));
    $centerY = round($sumY / count($tempMap));
}

$raggioMax = 150; $limiteVuoti = 10; $contatoreVuoti = 0;
for ($r = 0; $r <= $raggioMax; $r++) {
    $trovatoNuovo = false;
    $xMin = $centerX - $r; $xMax = $centerX + $r;
    $yMin = $centerY - $r; $yMax = $centerY + $r;
    $punti = [];
    for ($i = $xMin; $i <= $xMax; $i++) { $punti[] = [$i, $yMin]; $punti[] = [$i, $yMax]; }
    for ($j = $yMin + 1; $j < $yMax; $j++) { $punti[] = [$xMin, $j]; $punti[] = [$xMax, $j]; }
    foreach ($punti as $p) {
        if (isset($puntiCaldi[$p[0] . "_" . $p[1]])) continue;
        if (processTile($p[0], $p[1], $serverID, $tempMap, $backendURL)) $trovatoNuovo = true;
    }
    if ($trovatoNuovo) $contatoreVuoti = 0; else $contatoreVuoti++;
    if ($contatoreVuoti >= $limiteVuoti) break;
}

// Pulizia (72h) e salvataggio locale
$limite = time() - (72 * 3600);
$mappaPulita = array_filter($tempMap, function($e) use ($limite) { return !isset($e['d']) || $e['d'] > $limite; });
file_put_contents($fileDatabase, json_encode(array_values($mappaPulita), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Fine. Database locale aggiornato.\n";

function processTile($x, $y, $sid, &$tmp, $bk) {
    $url = "$bk/maps/$sid/{$x}_{$y}.jtile";
    $c = @file_get_contents($url);
    if (!$c || $c === 'callback_politicalmap({})') return false; 
    if (preg_match('/\((.*)\)/s', $c, $m)) {
        $j = json_decode($m[1], true);
        if (isset($j['habitatArray'])) {
            foreach ($j['habitatArray'] as $h) {
                $tmp[$h['mapx']."_".$h['mapy']] = ['p'=>(int)$h['playerid'],'a'=>(int)$h['allianceid'],'n'=>$h['name']??'','x'=>(int)$h['mapx'],'y'=>(int)$h['mapy'],'pt'=>(int)$h['points'],'t'=>(int)$h['habitattype'],'d'=>time()];
            }
            return true;
        }
    }
    return false;
}
