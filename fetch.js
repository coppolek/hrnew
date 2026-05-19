const fetch = require('node-fetch');
async function run() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const freeGemini = data.data.filter(d => d.id.includes('free') && d.id.includes('gemini'));
  console.log(freeGemini.map(f => f.id));
}
run();
