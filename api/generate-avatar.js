export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { image } = req.body;

  const sombreros = ["a giant sombrero", "a tiny top hat", "a viking helmet", "a chef hat with a burger on top", "a cowboy hat", "a crown made of french fries", "a backwards cap"];
  const caras = ["thick groucho marx glasses and mustache", "big clown nose", "monocle and fake mustache", "oversized sunglasses", "one eyebrow raised cartoonishly", "a cigarette behind the ear", "big googly eyes"];
  const extras = ["holding a giant burger like a trophy", "with a ketchup bottle in hand", "sitting on a throne of hamburgers", "with a cape made of burger wrappers", "with a tiny burger floating above their head like a halo"];

  const sombrero = sombreros[Math.floor(Math.random() * sombreros.length)];
  const cara = caras[Math.floor(Math.random() * caras.length)];
  const extra = extras[Math.floor(Math.random() * extras.length)];

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.VITE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: "Describe this person in English in 1 sentence: gender, approximate age, hair color and style, skin tone, main facial features. Only the description." }
        ]
      }]
    })
  });
  const claudeData = await claudeRes.json();
  const descripcion = claudeData.content[0].text;

  const prompt = `Funny cartoon caricature sticker of a person: ${descripcion}. They are wearing ${sombrero}, have ${cara}, and are ${extra}. Exaggerated cartoon style, vibrant colors, thick outlines, white background, no text, funny and cheerful expression.`;

  const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    })
  });
  const dalleData = await dalleRes.json();
  
  if (!dalleData.data || !dalleData.data[0]) {
    return res.status(500).json({ error: "No se pudo generar la imagen" });
  }

  res.status(200).json({ 
    imageUrl: dalleData.data[0].url,
    accesorios: `${sombrero} | ${cara} | ${extra}`
  });
}
