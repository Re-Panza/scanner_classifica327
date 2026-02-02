const fs = require('fs');

const inputFile = process.argv[2]; // mondo_327.json
const mondoMatch = inputFile ? inputFile.match(/\d+/) : null;
const mondoNum = mondoMatch ? mondoMatch[0] : 'unknown';

// Useremo un solo file per tutto [cite: 2026-02-02]
const FILE_UNICO = `database_mondo_${mondoNum}.json`;

try {
    const scanData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    let dbStorico = {};

    // Carichiamo lo storico se esiste (per il confronto delle 24h)
    if (fs.existsSync(FILE_UNICO)) {
        const vecchioDB = JSON.parse(fs.readFileSync(FILE_UNICO, 'utf8'));
        // Trasformiamo l'array in un oggetto indicizzato per ID giocatore per il confronto
        vecchioDB.forEach(h => {
            if (!dbStorico[h.p]) dbStorico[h.p] = { u: h.u, i: h.i, f: h.f || {} };
        });
    }

    const now = new Date();
    
    // Mappiamo lo stato attuale dei castelli
    const playerStatus = {};
    scanData.forEach(h => {
        if (!h.p || h.p === 0) return;
        if (!playerStatus[h.p]) playerStatus[h.p] = { n: h.n, castelli: {} };
        playerStatus[h.p].castelli[`${h.x}_${h.y}`] = `${h.n}|${h.pt}`;
    });

    // Aggiorniamo i dati della scansione con le info di inattività
    const finalData = scanData.map(h => {
        if (!h.p || h.p === 0) return h;

        const pID = h.p;
        const storico = dbStorico[pID];
        const attuale = playerStatus[pID];
        
        let ultimaModifica = storico ? storico.u : now.toISOString();
        let inattivo = storico ? storico.i : false;
        let firmeVecchie = storico ? storico.f : {};

        // Confronto firme castelli
        let cambiato = false;
        for (const [coord, firma] of Object.entries(attuale.castelli)) {
            if (firmeVecchie[coord] !== firma) {
                cambiato = true;
                break;
            }
        }

        if (cambiato) {
            ultimaModifica = now.toISOString();
            inattivo = false;
        } else if (storico) {
            const ore = (now - new Date(storico.u)) / (1000 * 60 * 60);
            if (ore >= 24) inattivo = true;
        }

        // Ritorniamo l'habitat arricchito
        return {
            ...h,
            u: ultimaModifica, // Ultima modifica
            i: inattivo,       // Inattivo (true/false)
            f: attuale.castelli // Firme per il prossimo giro
        };
    });

    fs.writeFileSync(FILE_UNICO, JSON.stringify(finalData, null, 2));
    
    console.log(`✅ Database Unificato creato: ${FILE_UNICO}`);
    console.log(`📊 Totale habitat: ${finalData.length}`);
} catch (e) {
    console.error("Errore:", e.message);
}
