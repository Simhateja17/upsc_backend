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

// Test Anthropic API
async function testAnthropic() {
  console.log("\n🔧 Testing Anthropic API...");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const modelId = process.env.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6";

  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in .env");
    return false;
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: modelId,
      max_tokens: 100,
      messages: [{ role: "user", content: "Say 'Hello from Anthropic!' and nothing else." }],
      temperature: 0,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    console.log("✅ Anthropic API connected successfully!");
    console.log(`   Model: ${modelId}`);
    console.log("   Response:", text);
    return true;
  } catch (err: any) {
    console.error("❌ Anthropic test failed:", err.message);
    if (err.status === 401) {
      console.log("   Check your ANTHROPIC_API_KEY in .env");
    } else if (err.status === 404) {
      console.log("   Model not found. Check ANTHROPIC_MODEL_ID in .env");
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
    anthropic: await testAnthropic(),
    supabase: await testSupabaseStorage(),
  };

  console.log("\n====================================");
  console.log("📊 Test Results Summary");
  console.log("====================================");
  console.log(`Resend:    ${results.resend ? "✅ Working" : "❌ Failed"}`);
  console.log(`Anthropic: ${results.anthropic ? "✅ Working" : "❌ Failed"}`);
  console.log(`Supabase:  ${results.supabase ? "✅ Working" : "❌ Failed"}`);

  if (!results.resend || !results.anthropic) {
    console.log("\n📝 Required Environment Variables:");
    console.log("-----------------------------------");
    if (!results.resend) {
      console.log("\nFor Resend:");
      console.log("  RESEND_API_KEY=re_xxxxxxxxxxxxx");
      console.log("  Get it from: https://resend.com/api-keys");
    }
    if (!results.anthropic) {
      console.log("\nFor Anthropic:");
      console.log("  ANTHROPIC_API_KEY=sk-ant-...");
      console.log("  ANTHROPIC_MODEL_ID=claude-sonnet-4-6");
      console.log("\n  Get your API key from: https://console.anthropic.com/settings/keys");
    }
  }

  process.exit(results.resend && results.anthropic && results.supabase ? 0 : 1);
}

// Run tests
runTests().catch(console.error);
