import Anthropic from "@anthropic-ai/sdk";
import config from "./index";
import prisma from "./database";

const anthropicClient = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

// Claude Sonnet 4.6 pricing (USD per million tokens)
const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;

// USD → INR rate (configurable via env, default 90)
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
        model: config.anthropic.modelId,
        inputTokens,
        outputTokens,
        costUsd,
        costInr,
      },
    })
    .catch((err) =>
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
  const {
    maxTokens = 4096,
    temperature = 0.3,
    system,
    serviceName = "unknown",
  } = options;

  const response = await anthropicClient.messages.create({
    model: config.anthropic.modelId,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages as any,
  });

  // Log token usage asynchronously
  const { input_tokens, output_tokens } = response.usage;
  logUsage(serviceName, input_tokens, output_tokens);

  return response.content[0]?.type === "text" ? response.content[0].text : "";
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

export default anthropicClient;
