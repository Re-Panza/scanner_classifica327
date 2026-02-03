const fs = require('fs');
const FILE = 'database_mondo_337.json';

try {
    const scanData = JSON.parse(fs.readFileSync('mondo337_temp.json', 'utf8'));
    let storico = {};
    if (fs.existsSync(FILE)) {
        JSON.parse(fs.readFileSync(FILE, 'utf8')).forEach(h => {
            if (h.p) storico[`${h.p}_${h.x}_${h.y}`] = h;
        });
    }

    const now = new Date();
    const finalData = scanData.map(h => {
        if (!h.p) return h;
        const s = storico[`${h.p}_${h.x}_${h.y}`];
        const firma = `${h.n}|${h.pt}`;
        
        h.u = (s && s.f === firma) ? s.u : now.toISOString();
        h.i = (s && s.f === firma && (now - new Date(s.u)) > 86400000);
        h.f = firma;
        return h;
    });

    fs.writeFileSync(FILE, JSON.stringify(finalData, null, 2));
    console.log("✅ Storico aggiornato.");
} catch (e) { console.error(e.message); process.exit(1); }
