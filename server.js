const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname)));

app.post("/api/proofread", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
  }

  try {
    const { model = "gpt-4.1-mini", prompt = "" } = req.body || {};
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "proofread proxy failed" });
  }
});

app.post("/api/image", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
  }

  try {
    const { model = "gpt-image-1", size = "1024x1024", prompt = "" } = req.body || {};
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        size,
        prompt,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "image proxy failed" });
  }
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
