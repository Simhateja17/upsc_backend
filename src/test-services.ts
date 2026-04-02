import dotenv from "dotenv";
dotenv.config();

// Test Resend
async function testResend() {
  console.log("\n🔧 Testing Resend Email Service...");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ RESEND_API_KEY not found in .env");
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // Test API key validity by fetching domains
    const { data, error } = await resend.domains.list();

    if (error) {
      console.error("❌ Resend API error:", error.message);
      return false;
    }

    console.log("✅ Resend connected successfully!");
    console.log("   Domains:", data?.data?.length || 0);
    return true;
  } catch (err: any) {
    console.error("❌ Resend test failed:", err.message);
    return false;
  }
}

// Test Azure OpenAI API
async function testAzureOpenAI() {
  console.log("\n🔧 Testing Azure OpenAI API...");

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-5.4-mini";

  if (!endpoint || !apiKey) {
    console.error("❌ AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY not found in .env");
    return false;
  }

  try {
    const { AzureOpenAI } = await import("openai");
    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
    });

    const response = await client.chat.completions.create({
      model: deployment,
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'Hello from Azure OpenAI!' and nothing else." }],
      temperature: 0,
    });

    const text = response.choices[0]?.message?.content ?? "";
    console.log("✅ Azure OpenAI API connected successfully!");
    console.log(`   Deployment: ${deployment}`);
    console.log("   Response:", text);
    return true;
  } catch (err: any) {
    console.error("❌ Azure OpenAI test failed:", err.message);
    if (err.status === 401) {
      console.log("   Check your AZURE_OPENAI_API_KEY in .env");
    } else if (err.status === 404) {
      console.log("   Deployment not found. Check AZURE_OPENAI_CHAT_DEPLOYMENT in .env");
    }
    return false;
  }
}

// Test Supabase Storage
async function testSupabaseStorage() {
  console.log("\n🔧 Testing Supabase Storage...");

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ Supabase credentials not found in .env");
    return false;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceKey);

    // List buckets
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ Supabase Storage error:", error.message);
      return false;
    }

    console.log("✅ Supabase Storage connected!");
    console.log("   Buckets:", data?.length || 0);

    // Check for required buckets
    const requiredBuckets = ["pyq-pdfs", "answer-uploads", "study-materials"];
    const existingBuckets = data?.map(b => b.name) || [];
    const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));

    if (missingBuckets.length > 0) {
      console.log("   ⚠️  Missing buckets:", missingBuckets.join(", "));
      console.log("   Run the server to auto-create them or create manually in Supabase dashboard");
    }

    return true;
  } catch (err: any) {
    console.error("❌ Supabase test failed:", err.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log("====================================");
  console.log("🚀 Testing Backend Service Connections");
  console.log("====================================");

  const results = {
    resend: await testResend(),
    azureOpenAI: await testAzureOpenAI(),
    supabase: await testSupabaseStorage(),
  };

  console.log("\n====================================");
  console.log("📊 Test Results Summary");
  console.log("====================================");
  console.log(`Resend:    ${results.resend ? "✅ Working" : "❌ Failed"}`);
  console.log(`Azure AI:  ${results.azureOpenAI ? "✅ Working" : "❌ Failed"}`);
  console.log(`Supabase:  ${results.supabase ? "✅ Working" : "❌ Failed"}`);

  if (!results.resend || !results.azureOpenAI) {
    console.log("\n📝 Required Environment Variables:");
    console.log("-----------------------------------");
    if (!results.resend) {
      console.log("\nFor Resend:");
      console.log("  RESEND_API_KEY=re_xxxxxxxxxxxxx");
      console.log("  Get it from: https://resend.com/api-keys");
    }
    if (!results.azureOpenAI) {
      console.log("\nFor Azure OpenAI:");
      console.log("  AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/");
      console.log("  AZURE_OPENAI_API_KEY=your-key");
      console.log("  AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5.4-mini");
    }
  }

  process.exit(results.resend && results.azureOpenAI && results.supabase ? 0 : 1);
}

// Run tests
runTests().catch(console.error);
