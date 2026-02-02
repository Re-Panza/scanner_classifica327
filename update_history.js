const fs = require('fs');

const inputFile = process.argv[2]; 
// Estrae il numero del mondo dal file di input (es. 327 o 337)
const mondoMatch = inputFile ? inputFile.match(/\d+/) : null;
const mondoNum = mondoMatch ? mondoMatch[0] : 'unknown';

// NUOVI NOMI FILE RICHIESTI
const FILE_DB = `database_mondocompleto${mondoNum}.json`;
const FILE_INATTIVI = `database_soloinattivi${mondoNum}.json`;

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
        
        // Firma univoca del castello (nome|punti)
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
            
            // Confronto dei castelli per rilevare attività
            for (const [coord, firmaAttuale] of Object.entries(player.castelli)) {
                const firmaPrecedente = db[pid].firme_castelli ? db[pid].firme_castelli[coord] : null;
                
                if (firmaPrecedente !== firmaAttuale) {
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

    // 2. Generazione Lista Inattivi "database_soloinattivi"
    const listaInattivi = Object.keys(db)
        .filter(pid => db[pid].inattivo === true)
        .map(pid => ({ id: pid, nome: db[pid].nome, dal: db[pid].ultima_modifica }));

    // Salvataggio con i nuovi nomi
    fs.writeFileSync(FILE_DB, JSON.stringify(db, null, 2));
    fs.writeFileSync(FILE_INATTIVI, JSON.stringify(listaInattivi, null, 2));
    
    console.log(`✅ Elaborazione completata.`);
    console.log(`📁 Database Completo: ${FILE_DB}`);
    console.log(`📁 Solo Inattivi: ${FILE_INATTIVI} (${listaInattivi.length} record)`);
} catch (e) {
    console.error("Errore:", e.message);
}
