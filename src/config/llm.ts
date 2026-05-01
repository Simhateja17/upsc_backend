import { azureClient, chatDeployment } from "./azure";
import prisma from "./database";

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

// GPT-5.4 mini pricing (USD per million tokens) — TODO: update with actual Azure pricing
const PRICE_INPUT_PER_M = 0.15;
const PRICE_OUTPUT_PER_M = 0.60;

// USD -> INR rate (configurable via env, default 90)
const USD_TO_INR = parseFloat(process.env.USD_TO_INR || "90");

function computeCost(inputTokens: number, outputTokens: number) {
  const costUsd =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
  const costInr = costUsd * USD_TO_INR;
  return { costUsd, costInr };
}

async function logUsage(
  service: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const { costUsd, costInr } = computeCost(inputTokens, outputTokens);
  // Fire-and-forget — never block or throw on the main call
  prisma.aiUsageLog
    .create({
      data: {
        service,
        model: chatDeployment,
        inputTokens,
        outputTokens,
        costUsd,
        costInr,
      },
    })
    .catch((err: unknown) =>
      console.error("[AI cost logger] Failed to write usage log:", err)
    );
}

export async function invokeModel(
  messages: BedrockMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
    serviceName?: string;
  } = {}
): Promise<string> {
  if (!azureClient) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY."
    );
  }

  const {
    maxTokens = 4096,
    temperature = 0.3,
    system,
    serviceName = "unknown",
  } = options;

  // Build OpenAI-format messages
  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (system) {
    openaiMessages.push({ role: "system", content: system });
  }

  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content
            .filter((b) => b.type === "text")
            .map((b) => b.text || "")
            .join("\n");
    openaiMessages.push({ role: msg.role, content });
  }

  let response;
  try {
    response = await azureClient.chat.completions.create(
      {
        model: chatDeployment,
        messages: openaiMessages,
        max_completion_tokens: maxTokens,
        temperature,
      },
      { signal: AbortSignal.timeout(45000) }
    );
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    // Some Azure deployments/API versions still expect max_tokens instead.
    if (msg.includes("max_completion_tokens")) {
      response = await azureClient.chat.completions.create(
        {
          model: chatDeployment,
          messages: openaiMessages,
          max_tokens: maxTokens,
          temperature,
        },
        { signal: AbortSignal.timeout(45000) }
      );
    } else if (msg.includes("temperature")) {
      // Some models (e.g. gpt-5.3-chat) do not support temperature values other than the default.
      response = await azureClient.chat.completions.create(
        {
          model: chatDeployment,
          messages: openaiMessages,
          max_completion_tokens: maxTokens,
        },
        { signal: AbortSignal.timeout(45000) }
      );
    } else {
      throw err;
    }
  }

  // Log token usage asynchronously
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  logUsage(serviceName, inputTokens, outputTokens);

  return response.choices[0]?.message?.content ?? "";
}

export async function invokeModelJSON<T = any>(
  messages: BedrockMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
    serviceName?: string;
  } = {}
): Promise<T> {
  const text = await invokeModel(messages, options);

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  return JSON.parse(jsonStr);
}
