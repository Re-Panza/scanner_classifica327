const fs = require('fs');

const inputFile = process.argv[2]; 
// La regex \d+ estrae "337" da "mondo_337.json"
const mondoMatch = inputFile ? inputFile.match(/\d+/) : null;
const mondoNum = mondoMatch ? mondoMatch[0] : 'unknown';
const FILE_DB = `db_${mondoNum}.json`;
const FILE_INATTIVI = `inattivi_${mondoNum}.json`;

try {
    const scanData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    let db = {};
    if (fs.existsSync(FILE_DB)) {
        db = JSON.parse(fs.readFileSync(FILE_DB, 'utf8'));
    }

    const now = new Date();
    const currentStatus = {};

    // 1. Mappiamo i dati attuali usando l'ID giocatore 'p'
    scanData.forEach(h => {
        const pid = h.p; 
        if (!pid || pid === 0) return;
        if (!currentStatus[pid]) currentStatus[pid] = { nome: h.n, castelli: {} };
        
        // Identificazione univoca del castello tramite coordinate
        currentStatus[pid].castelli[`${h.x}_${h.y}`] = `${h.n}|${h.pt}`;
    });

    Object.keys(currentStatus).forEach(pid => {
        const player = currentStatus[pid];
        
        if (!db[pid]) {
            db[pid] = {
                nome: player.nome,
                ultima_modifica: now.toISOString(),
                inattivo: false,
                firme_castelli: player.castelli 
            };
        } else {
            let haCambiatoQualcosa = false;
            
            for (const [coord, firmaAttuale] of Object.entries(player.castelli)) {
                const firmaPrecedente = db[pid].firme_castelli ? db[pid].firme_castelli[coord] : null;
                
                // Controllo cambiamenti o nuove conquiste
                if (firmaPrecedente && firmaPrecedente !== firmaAttuale) {
                    haCambiatoQualcosa = true;
                    break;
                }
                if (!firmaPrecedente) {
                    haCambiatoQualcosa = true;
                    break;
                }
            }

            if (haCambiatoQualcosa) {
                db[pid].ultima_modifica = now.toISOString();
                db[pid].inattivo = false;
                db[pid].firme_castelli = player.castelli;
                db[pid].nome = player.nome;
            } else {
                // Calcolo inattività dopo 24 ore senza modifiche
                const orePassate = (now - new Date(db[pid].ultima_modifica)) / (1000 * 60 * 60);
                if (orePassate >= 24) db[pid].inattivo = true;
                
                db[pid].firme_castelli = player.castelli;
            }
        }
    });

    // 2. Generazione Lista Inattivi Dinamica
    const listaInattivi = Object.keys(db)
        .filter(pid => db[pid].inattivo === true)
        .map(pid => ({ id: pid, nome: db[pid].nome, dal: db[pid].ultima_modifica }));

    // Salvataggio dei file nella cartella corrente della repo lk_database
    fs.writeFileSync(FILE_DB, JSON.stringify(db, null, 2));
    fs.writeFileSync(FILE_INATTIVI, JSON.stringify(listaInattivi, null, 2));
    
    console.log(`✅ Elaborazione completata. Inattivi: ${listaInattivi.length}`);
} catch (e) {
    console.error("Errore:", e.message);
}
