async function runChatGPT({ apiKey, model, prompt, task, maxTokens, maxCompletionTokensMode = "auto", expectJson = false }) {
  if (!apiKey) {
    throw new Error("CHATGPT_API_KEY (or OPENAI_API_KEY) is required when ChatGPT provider is selected.");
  }

  // Use explicit expectJson flag instead of prompt inspection
  const systemContent = expectJson
    ? "You are an expert AI code reviewer. You analyze code and return structured JSON output for inline GitHub review comments. Always return valid JSON, never markdown."
    : `You are an expert AI pair reviewer tasked with ${task} duties. Respond with concise, professional Markdown that can be posted directly on GitHub.`;

  const requestPayload = {
    model,
    messages: [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  // For inline reviews, request JSON response format if supported
  if (expectJson && (model.includes("gpt-4") || model.includes("gpt-5"))) {
    requestPayload.response_format = { type: "json_object" };
  }

  // Only set temperature for models that support it (not o1, o3, gpt-5-mini, etc.)
  const supportsTemperature = !model.match(/o1-|o3-|gpt-5/i);
  if (supportsTemperature) {
    requestPayload.temperature = 0.2;
  }

  if (maxTokens && Number.isFinite(maxTokens) && maxTokens > 0) {
    // Check if user explicitly set max-completion-tokens-mode via input
    const useCompletionTokens = maxCompletionTokensMode;

    if (useCompletionTokens === "true" || useCompletionTokens === "1") {
      // Force max_completion_tokens (for gpt-4o, gpt-5-mini, gpt-5-mini, o1, o3, etc.)
      requestPayload.max_completion_tokens = maxTokens;
    } else if (useCompletionTokens === "false" || useCompletionTokens === "0") {
      // Force max_tokens (for older models like gpt-4-turbo, gpt-3.5-turbo)
      requestPayload.max_tokens = maxTokens;
    } else {
      // Auto-detect based on model name if not explicitly set
      const usesNewParameter = model.match(/gpt-4o|gpt-5|o1-|o3-|chatgpt-4o/i);
      if (usesNewParameter) {
        requestPayload.max_completion_tokens = maxTokens;
      } else {
        requestPayload.max_tokens = maxTokens;
      }
    }
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
  const choice = payload.choices?.[0];
  const content = choice?.message?.content?.trim();
  const finishReason = choice?.finish_reason;

  // Handle different finish reasons
  if (finishReason === "length") {
    throw new Error(`ChatGPT response was truncated due to token limit (finish_reason: length). Current max completion tokens: ${maxTokens}. Increase the action input \`max-output-tokens\` (recommended: 8000-16000) or reduce the PR size.`);
  }

  if (!content) {
    // Log the actual response for debugging
    console.error("Empty response from ChatGPT. Full payload:", JSON.stringify(payload, null, 2));
    throw new Error(`ChatGPT returned empty content. Finish reason: ${finishReason}. This usually indicates an API error or unsupported model configuration.`);
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
