const fetch = require('node-fetch');

async function test() {
    const payload = {
    model: "meta-llama/llama-3.3-70b-instruct:free",
    messages: [
        { role: "system", content: "Sei un pianificatore. { \"entries\": [ ... ] }" },
        { role: "user", content: "Dati: { id: '1', nome: 'Mario Rossi', basePlan: { LUN: 4 } }. Mese di 30 giorni, inizia di Domenica." }
    ]
    };

    console.log("sending request...");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.CUSTOM_KEY || ''}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
    });
    
    // We won't actually have a custom key to test with real openrouter but let's check format.
    // However, I get "API Key OpenRouter non trovata" if not set in the app.
}
test();
