const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://192.168.18.4:11434/api/generate', {
      model: 'llama3.2:1b',
      prompt: 'Hello, respond with JSON {"id": "1", "sentiment": "Positive", "confidence": 0.9, "topic": "Greeting"}',
      format: {
          type: "object",
          properties: {
              id: { type: "string" },
              sentiment: { type: "string" },
              confidence: { type: "number" },
              topic: { type: "string" }
          },
          required: ["id", "sentiment", "confidence", "topic"]
      },
      stream: false,
      options: { temperature: 0.1, num_predict: 500 }
    });
    console.log("Success:", res.data.response);
  } catch (err) {
    console.error("Error:", err.message);
    if(err.response) console.error(err.response.data);
  }
}
test();
