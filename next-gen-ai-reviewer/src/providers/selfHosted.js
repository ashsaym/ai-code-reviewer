function buildAuthHeader({ headerName, token }) {
  if (!token) {
    return {};
  }

  const normalized = headerName?.trim() || "Authorization";
  if (normalized.toLowerCase() === "authorization" && !token.toLowerCase().startsWith("bearer ")) {
    return { Authorization: `Bearer ${token}` };
  }

  return { [normalized]: token };
}

async function runSelfHosted({ endpoint, apiKey, model, prompt, task, headerName, maxTokens }) {
  if (!endpoint) {
    throw new Error("Self-hosted endpoint URL is required when self-hosted provider is selected.");
  }

  const headers = {
    "Content-Type": "application/json",
    ...buildAuthHeader({ headerName, token: apiKey })
  };

  const requestPayload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are an on-prem code reviewer focusing on ${task}. Return clean Markdown that can be posted on GitHub.`
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Self-hosted request failed (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Self-hosted response did not include any content.");
  }

  const resolvedModel = payload.model || model || "local";

  return {
    provider: "Self-Hosted",
    model: resolvedModel,
    content
  };
}

module.exports = {
  runSelfHosted
};
