async function runChatGPT({ apiKey, model, prompt, task, maxTokens }) {
  if (!apiKey) {
    throw new Error("CHATGPT_API_KEY (or OPENAI_API_KEY) is required when ChatGPT provider is selected.");
  }

  const requestPayload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are an expert AI pair reviewer tasked with ${task} duties. Respond with concise, professional Markdown that can be posted directly on GitHub.`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  if (maxTokens && Number.isFinite(maxTokens) && maxTokens > 0) {
    requestPayload.max_tokens = maxTokens;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ChatGPT request failed (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("ChatGPT response did not include any content.");
  }

  return {
    provider: "ChatGPT",
    model,
    content
  };
}

module.exports = {
  runChatGPT
};
