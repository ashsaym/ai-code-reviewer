async function runClaude({ apiKey, model, prompt, task, maxTokens }) {
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is required when Claude provider is selected.");
  }

  const requestPayload = {
    model,
    max_tokens: maxTokens && Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 1200,
    temperature: 0.2,
    system: `You are an expert reviewer focusing on ${task}. Keep output concise and GitHub-ready.`,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Claude request failed (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const content = payload.content?.[0]?.text?.trim();
  if (!content) {
    throw new Error("Claude response did not include any content.");
  }

  return {
    provider: "Claude",
    model,
    content
  };
}

module.exports = {
  runClaude
};
