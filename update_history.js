const fs = require('fs');
const FILE_UNICO = 'database_mondo_327.json'; // Questo DEVE essere il nome finale

try {
    // Legge il file prodotto dallo scanner (passato come argomento)
    const scanData = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    let dbStorico = {};

    if (fs.existsSync(FILE_UNICO)) {
        const vecchioDB = JSON.parse(fs.readFileSync(FILE_UNICO, 'utf8'));
        vecchioDB.forEach(h => {
            if (h.p) dbStorico[`${h.p}_${h.x}_${h.y}`] = { u: h.u, i: h.i, f: h.f };
        });
    }

    const now = new Date();
    const finalData = scanData.map(h => {
        if (!h.p || h.p === 0) return h;
        const key = `${h.p}_${h.x}_${h.y}`;
        const firmaAttuale = `${h.n}|${h.pt}`;
        const storico = dbStorico[key];

        let ultimaModifica = storico ? storico.u : now.toISOString();
        let inattivo = storico ? storico.i : false;

        if (storico && firmaAttuale !== storico.f) {
            ultimaModifica = now.toISOString();
            inattivo = false;
        } else if (storico) {
            const ore = (now - new Date(storico.u)) / (1000 * 60 * 60);
            if (ore >= 24) inattivo = true;
        }

        return { ...h, u: ultimaModifica, i: inattivo, f: firmaAttuale };
    });

    fs.writeFileSync(FILE_UNICO, JSON.stringify(finalData, null, 2));
    console.log("✅ Elaborazione completata con successo!");
} catch (e) {
    console.error("Errore:", e.message);
}
