import Anthropic from "@anthropic-ai/sdk";
import config from "./index";

const anthropicClient = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

export async function invokeModel(
  messages: BedrockMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<string> {
  const { maxTokens = 4096, temperature = 0.3, system } = options;

  const response = await anthropicClient.messages.create({
    model: config.anthropic.modelId,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages as any,
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

export async function invokeModelJSON<T = any>(
  messages: BedrockMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<T> {
  const text = await invokeModel(messages, options);

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  return JSON.parse(jsonStr);
}

export default anthropicClient;
