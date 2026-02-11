const fs = require('fs');

// CONFIGURAZIONE NOMI FILE
const FILE_MONDO = 'database_mondo_327.json';
const FILE_CLASSIFICA = 'database_classificamondo327.json';
const FILE_HISTORY = 'history.json';

// Funzione di utilità per caricare i JSON
function loadJSON(filename) {
    if (fs.existsSync(filename)) {
        try {
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
        } catch (e) {
            console.error(`Errore lettura ${filename}:`, e);
            return null;
        }
    }
    return null;
}

// Caricamento Dati
console.log("--- Inizio Tracker ---");
const mondoData = loadJSON(FILE_MONDO);
const classificaData = loadJSON(FILE_CLASSIFICA);
let historyDB = loadJSON(FILE_HISTORY) || {};

if (!mondoData || !classificaData) {
    console.error("❌ Errore: Uno dei database sorgente manca. Impossibile procedere.");
    process.exit(1);
}

const now = new Date().toISOString();
let changesCount = 0;

// 1. COSTRUZIONE STATO CORRENTE
// Creiamo un oggetto temporaneo con i dati attuali di ogni giocatore trovato
const currentState = {};

// A. Recupera Nomi dalla Classifica
classificaData.forEach(entry => {
    if (entry.id && entry.nick) {
        if (!currentState[entry.id]) currentState[entry.id] = {};
        currentState[entry.id].nick = entry.nick;
    }
});

// B. Recupera Alleanza dalla Mappa
// Scansioniamo i castelli. Se troviamo un castello di un player, salviamo la sua alleanza.
mondoData.forEach(castle => {
    // p = player ID, a = alliance ID. Ignoriamo ID 0 (barbari)
    if (castle.p && castle.p > 0) {
        if (!currentState[castle.p]) currentState[castle.p] = {};
        
        // Assegna l'alleanza se non l'abbiamo già fatto per questo player
        if (currentState[castle.p].alliance === undefined) {
            currentState[castle.p].alliance = castle.a;
        }
    }
});

// 2. CONFRONTO CON LA STORIA (HISTORY)
for (const [playerId, data] of Object.entries(currentState)) {
    // Se il giocatore è nuovo nel database storico, inizializzalo
    if (!historyDB[playerId]) {
        historyDB[playerId] = {
            currentNick: data.nick || "Sconosciuto",
            currentAlliance: data.alliance || 0,
            lastSeen: now,
            events: [] 
        };
        // Non segniamo eventi alla prima apparizione per non intasare il log
        continue;
    }

    const playerHistory = historyDB[playerId];
    playerHistory.lastSeen = now; // Aggiorna l'ultima volta che è stato visto

    // --- CONTROLLO CAMBIO NOME ---
    // Controlliamo solo se abbiamo un nick valido corrente e se è diverso da quello storico
    if (data.nick && playerHistory.currentNick !== data.nick) {
        const evento = {
            date: now,
            type: 'name_change',
            oldVal: playerHistory.currentNick,
            newVal: data.nick
        };
        playerHistory.events.push(evento);
        console.log(`📝 [ID ${playerId}] Nome cambiato: ${playerHistory.currentNick} -> ${data.nick}`);
        
        // Aggiorna lo stato attuale
        playerHistory.currentNick = data.nick;
        changesCount++;
    }

    // --- CONTROLLO CAMBIO ALLEANZA ---
    // Controlliamo solo se l'alleanza è definita (diversa da undefined) e diversa dallo storico
    if (data.alliance !== undefined && playerHistory.currentAlliance !== data.alliance) {
        const evento = {
            date: now,
            type: 'alliance_change',
            oldVal: playerHistory.currentAlliance,
            newVal: data.alliance
        };
        playerHistory.events.push(evento);
        console.log(`🛡️ [ID ${playerId}] Alleanza cambiata: ${playerHistory.currentAlliance} -> ${data.alliance}`);
        
        // Aggiorna lo stato attuale
        playerHistory.currentAlliance = data.alliance;
        changesCount++;
    }
}

// 3. SALVATAGGIO
if (changesCount > 0) {
    fs.writeFileSync(FILE_HISTORY, JSON.stringify(historyDB, null, 2));
    console.log(`✅ Salvataggio completato. ${changesCount} nuovi eventi registrati in ${FILE_HISTORY}.`);
} else {
    console.log("💤 Nessun cambiamento rilevato rispetto all'ultima scansione.");
}
