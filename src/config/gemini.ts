import { azureClient, chatDeployment, generateJSON as azureGenerateJSON } from "./azure";

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  // Backwards-compatible wrapper name; uses Azure infrastructure only.
  return azureGenerateJSON<T>(prompt, system, temperature);
}

const OCR_INSTRUCTION =
  "You are an OCR assistant for UPSC Mains handwritten answer sheets. " +
  "Extract the student's answer verbatim, preserving paragraph breaks and ordering. " +
  "Do not summarize, correct, rewrite, or add any commentary. " +
  "If the image is blank, unreadable, or contains no handwritten text, return an empty string.";

/**
 * OCR via Azure OpenAI vision (GPT-5.4-mini / GPT-4o support image inputs).
 * Used as the primary OCR method since it's on a paid plan.
 */
async function extractTextWithAzure(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for OCR.");
  }

  const base64Data = fileBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  let response;
  try {
    response = await azureClient.chat.completions.create(
      {
        model: chatDeployment,
        messages: [
          { role: "system", content: OCR_INSTRUCTION },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all handwritten text from this image:" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_completion_tokens: 4096,
        temperature: 0,
      },
      { signal: AbortSignal.timeout(30000) }
    );
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    // Some models (e.g. gpt-5.3-chat) do not support temperature values other than the default.
    if (msg.includes("temperature")) {
      response = await azureClient.chat.completions.create(
        {
          model: chatDeployment,
          messages: [
            { role: "system", content: OCR_INSTRUCTION },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all handwritten text from this image:" },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_completion_tokens: 4096,
        },
        { signal: AbortSignal.timeout(30000) }
      );
    } else {
      throw err;
    }
  }

  return (response.choices[0]?.message?.content ?? "").trim();
}

/**
 * OCR / vision extraction: reads a handwritten answer sheet (image or PDF)
 * and returns the extracted plain text using Azure only.
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    throw new Error(
      "Azure vision OCR does not accept raw PDF in image_url. Convert PDF pages to images first."
    );
  }

  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for OCR.");
  }
  console.log("[OCR] Trying Azure OpenAI vision...");
  const text = await extractTextWithAzure(fileBuffer, mimeType);
  console.log(`[OCR] Azure OK (${text.length} chars)`);
  return text;
}
