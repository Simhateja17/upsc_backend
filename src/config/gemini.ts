import { azureClient, chatDeployment, generateJSON as azureGenerateJSON } from "./azure";
import { pdf } from "pdf-to-img";

export async function generateJSON<T>(
  prompt: string,
  system: string,
  temperature = 0.7
): Promise<T> {
  // Backwards-compatible wrapper name; uses Azure infrastructure only.
  return azureGenerateJSON<T>(prompt, system, temperature);
}

const OCR_INSTRUCTION =
  "You are an OCR assistant for UPSC Mains answer sheets. " +
  "Extract the student's answer verbatim, preserving paragraph breaks and ordering. " +
  "Do not summarize, correct, rewrite, or add any commentary. " +
  "If the image is blank or unreadable, return an empty string.";

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
              { type: "text", text: "Extract all text from this image:" },
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
              { type: "text", text: "Extract all text from this image:" },
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
    // Convert PDF to image and OCR — handles both text-based and scanned PDFs
    console.log("[OCR] Converting PDF page 1 to image for vision OCR...");
    try {
      const document = await pdf(fileBuffer, { scale: 2 });
      let firstPageBuffer: Buffer | null = null;
      for await (const image of document) {
        firstPageBuffer = image;
        break; // Only need the first page
      }
      if (!firstPageBuffer) {
        throw new Error("Could not render any pages from the PDF.");
      }
      console.log(`[OCR] PDF page 1 rendered (${firstPageBuffer.length} bytes)`);
      const text = await extractTextWithAzure(firstPageBuffer, "image/png");
      console.log(`[OCR] Azure vision on PDF page 1 OK (${text.length} chars)`);
      return text;
    } catch (err: any) {
      console.error("[OCR] PDF-to-image conversion failed:", err.message);
      throw new Error(
        "Could not read your PDF. Please upload a clear photo (JPG/PNG) of your handwritten answer instead."
      );
    }
  }

  if (!azureClient) {
    throw new Error("Azure OpenAI is not configured for OCR.");
  }
  console.log("[OCR] Trying Azure OpenAI vision...");
  const text = await extractTextWithAzure(fileBuffer, mimeType);
  console.log(`[OCR] Azure OK (${text.length} chars)`);
  return text;
}
