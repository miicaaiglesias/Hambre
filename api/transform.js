export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { image } = req.body;
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.VITE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: `Mirá esta foto. Describí de forma MUY divertida qué accesorios ridículos le agregarías para un avatar de hamburguesería. Respondé SOLO en este JSON sin markdown:
{"sombrero":"descripción","cara":"descripción","detalle":"detalle temático hamburguesa","emoji_combo":"3-4 emojis","apodo":"apodo gracioso 2-3 palabras"}` }
        ]
      }]
    })
  });
  
  const data = await response.json();
  res.status(200).json({ result: data.content[0].text });
}
