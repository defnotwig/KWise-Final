const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.post("/api/upgrade-suggestions", async (req, res) => {
  const { cartItems, menuItems } = req.body;

  const prompt = `
You are a PC upgrade advisor. Based on the following selected components:

${cartItems.map(item => `- ${item.name}: ${item.specifications}`).join("\n")}

And the full parts database:

${menuItems.flatMap(cat =>
  cat.products.map(p => `(${cat.name}) ${p.name}: ${p.specifications}`)
).join("\n")}

Suggest 1 better upgrade per selected item that offers higher performance or future-proofing. Include a brief reason why it's better.
Respond in this format:
[
  {
    "original": "Intel Core i5 12400F",
    "suggestion": "Intel Core i7 12700F",
    "reason": "Offers more cores and higher boost clock, better for multitasking and gaming."
  },
  ...
]
  `.trim();

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3", // Replace with correct model ID from Ollama
      prompt,
      stream: false,
    });

    const parsed = JSON.parse(response.data.response);
    res.json(parsed);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to get suggestion" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
