const fs = require('fs');

const FILE_MONDO = 'database_mondo_327.json';
const FILE_CLASSIFICA = 'database_classificamondo327.json';
const FILE_HISTORY = 'history.json';

function loadJSON(filename) {
    if (fs.existsSync(filename)) {
        try { return JSON.parse(fs.readFileSync(filename, 'utf8')); } 
        catch (e) { return null; }
    }
    return null;
}

const mondoData = loadJSON(FILE_MONDO);
const classificaData = loadJSON(FILE_CLASSIFICA);
let historyDB = loadJSON(FILE_HISTORY) || {};

if (!mondoData || !classificaData) {
    console.log("⚠️ Mancano i file database. Tracker saltato.");
    process.exit(0);
}

const now = new Date().toISOString();
let changesCount = 0;
const currentState = {};

// 1. Dati Classifica
classificaData.forEach(entry => {
    if (entry.id && entry.nick) {
        if (!currentState[entry.id]) currentState[entry.id] = {};
        currentState[entry.id].nick = entry.nick;
    }
});

// 2. Dati Mappa
mondoData.forEach(castle => {
    if (castle.p && castle.p > 0) {
        if (!currentState[castle.p]) currentState[castle.p] = {};
        if (currentState[castle.p].alliance === undefined) {
            currentState[castle.p].alliance = castle.a;
        }
    }
});

// 3. Confronto
for (const [playerId, data] of Object.entries(currentState)) {
    if (!historyDB[playerId]) {
        historyDB[playerId] = {
            currentNick: data.nick || "Sconosciuto",
            currentAlliance: data.alliance || 0,
            lastSeen: now,
            events: [] 
        };
        continue;
    }

    const pHistory = historyDB[playerId];
    pHistory.lastSeen = now;

    // Cambio Nome
    if (data.nick && pHistory.currentNick !== data.nick) {
        pHistory.events.push({ date: now, type: 'name_change', oldVal: pHistory.currentNick, newVal: data.nick });
        pHistory.currentNick = data.nick;
        changesCount++;
    }

    // Cambio Alleanza
    if (data.alliance !== undefined && pHistory.currentAlliance !== data.alliance) {
        pHistory.events.push({ date: now, type: 'alliance_change', oldVal: pHistory.currentAlliance, newVal: data.alliance });
        pHistory.currentAlliance = data.alliance;
        changesCount++;
    }
}

if (changesCount > 0) {
    fs.writeFileSync(FILE_HISTORY, JSON.stringify(historyDB, null, 2));
    console.log(`✅ Storico aggiornato: ${changesCount} nuovi eventi.`);
}
