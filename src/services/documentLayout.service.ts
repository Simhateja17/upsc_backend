export type NormalizedBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type DocumentLayoutLine = {
  text: string;
  box: NormalizedBox;
};

export type DocumentPageLayout = {
  pageNumber: number;
  width: number;
  height: number;
  unit?: string;
  lines: DocumentLayoutLine[];
};

type AzurePage = {
  pageNumber?: number;
  width?: number;
  height?: number;
  unit?: string;
  lines?: Array<{ content?: string; polygon?: number[] }>;
  words?: Array<{ content?: string; polygon?: number[] }>;
};

type AzureAnalyzeResult = {
  analyzeResult?: {
    pages?: AzurePage[];
  };
  status?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function polygonToBox(polygon: number[] | undefined, pageWidth: number, pageHeight: number): NormalizedBox | null {
  if (!polygon || polygon.length < 8 || !pageWidth || !pageHeight) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index < polygon.length - 1; index += 2) {
    xs.push(Number(polygon[index]));
    ys.push(Number(polygon[index + 1]));
  }

  return {
    x1: Math.max(0, Math.min(...xs) / pageWidth),
    y1: Math.max(0, Math.min(...ys) / pageHeight),
    x2: Math.min(1, Math.max(...xs) / pageWidth),
    y2: Math.min(1, Math.max(...ys) / pageHeight),
  };
}

function normalizePage(page: AzurePage): DocumentPageLayout {
  const width = Number(page.width || 1);
  const height = Number(page.height || 1);
  const lines = (page.lines || [])
    .map((line: { content?: string; polygon?: number[] }) => {
      const box = polygonToBox(line.polygon, width, height);
      if (!box || !line.content?.trim()) return null;
      return {
        text: line.content.trim(),
        box,
      };
    })
    .filter((line: DocumentLayoutLine | null): line is DocumentLayoutLine => Boolean(line));

  return {
    pageNumber: Number(page.pageNumber || 1),
    width,
    height,
    unit: page.unit,
    lines,
  };
}

function validateDocumentIntelligenceConfig(endpoint: string, apiKey: string) {
  if (/\.openai\.azure\.com\/?$/i.test(endpoint)) {
    throw new Error(
      "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT is an Azure OpenAI endpoint. Use the Azure AI Document Intelligence endpoint, e.g. https://<resource>.cognitiveservices.azure.com/"
    );
  }

  if (!/\.cognitiveservices\.azure\.com\/?$/i.test(endpoint)) {
    throw new Error(
      "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT must be the Document Intelligence endpoint from Azure Portal Key and endpoints."
    );
  }

  if (/^your-/i.test(apiKey.trim())) {
    throw new Error("AZURE_DOCUMENT_INTELLIGENCE_KEY is still a placeholder.");
  }
}

export async function analyzeDocumentPageLayout(params: {
  imageBuffer: Buffer;
  mimeType: string;
  pageNumber: number;
  attemptId: string;
}): Promise<DocumentPageLayout | null> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  const apiVersion = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION || "2024-11-30";
  const model = process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL || "prebuilt-read";
  const timeoutMs = Number(process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS || 90000);

  if (!endpoint || !apiKey) {
    console.warn("[doc-layout] skipped: Azure Document Intelligence env vars are not configured");
    return null;
  }
  validateDocumentIntelligenceConfig(endpoint, apiKey);

  const startedAt = Date.now();
  const baseUrl = endpoint.replace(/\/+$/, "");
  const analyzeUrl = `${baseUrl}/documentintelligence/documentModels/${model}:analyze?api-version=${encodeURIComponent(apiVersion)}`;

  console.log("[doc-layout] analyze start", {
    attemptId: params.attemptId,
    pageNumber: params.pageNumber,
    model,
    apiVersion,
    endpointHost: new URL(baseUrl).host,
    bytes: params.imageBuffer.length,
    mimeType: params.mimeType,
  });

  const analyzeResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": params.mimeType,
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: params.imageBuffer,
  });

  if (!analyzeResponse.ok) {
    const body = await analyzeResponse.text();
    throw new Error(`Document Intelligence analyze failed [${analyzeResponse.status}]: ${body.slice(0, 500)}`);
  }

  const operationLocation = analyzeResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Document Intelligence analyze did not return operation-location");
  }

  const pollIntervalMs = Number(process.env.AZURE_DOCUMENT_INTELLIGENCE_POLL_MS || 750);
  const deadline = Date.now() + timeoutMs;
  let result: AzureAnalyzeResult | null = null;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    const pollResponse = await fetch(operationLocation, {
      method: "GET",
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
      signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
    });
    if (!pollResponse.ok) {
      const body = await pollResponse.text();
      throw new Error(`Document Intelligence poll failed [${pollResponse.status}]: ${body.slice(0, 500)}`);
    }

    result = (await pollResponse.json()) as AzureAnalyzeResult;
    if (result.status === "succeeded") break;
    if (result.status === "failed") {
      throw new Error("Document Intelligence analyze operation failed");
    }
  }

  if (!result || result.status !== "succeeded") {
    throw new Error(`Document Intelligence analyze timed out after ${timeoutMs}ms`);
  }

  const page = result.analyzeResult?.pages?.[0];
  const normalized = page ? normalizePage(page) : null;
  console.log("[doc-layout] analyze completed", {
    attemptId: params.attemptId,
    pageNumber: params.pageNumber,
    elapsed: `${Date.now() - startedAt}ms`,
    lines: normalized?.lines.length || 0,
  });

  return normalized ? { ...normalized, pageNumber: params.pageNumber } : null;
}
