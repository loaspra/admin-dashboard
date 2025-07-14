import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface TestResult {
  success: boolean;
  responseTime?: number;
  responseLength?: number;
  error?: string;
}

async function testGeminiConnectivity(): Promise<TestResult> {
  console.log("🚀 Testing Google Gemini connectivity...\n");

  // Check for API key
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ Error: GOOGLE_AI_API_KEY or GOOGLE_API_KEY environment variable is required",
    );
    console.log("Please set your API key in the .env file:");
    console.log("GOOGLE_AI_API_KEY=your_api_key_here");
    return { success: false, error: "Missing API key" };
  }

  console.log("✅ API key found");
  console.log(
    "🔑 API key preview:",
    apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4),
  );

  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("✅ GoogleGenerativeAI instance created");

    // Get the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite-preview-06-17",
    });
    console.log(
      "✅ Model initialized: gemini-2.5-flash-lite-preview-06-17-flash-lite",
    );

    // Test with a simple prompt
    console.log("\n🤖 Sending test prompt...");
    const prompt =
      "Hello! Please respond with a simple greeting and confirm you're working correctly.";

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();

    const response = await result.response;
    const text = response.text();
    const responseTime = endTime - startTime;

    console.log("✅ Response received successfully!");
    console.log("⏱️  Response time:", responseTime + "ms");
    console.log("📝 Response length:", text.length + " characters");
    console.log("\n📄 Gemini Response:");
    console.log("─".repeat(50));
    console.log(text);
    console.log("─".repeat(50));

    // Test model capabilities
    console.log("\n🧠 Testing model capabilities...");
    const mathPrompt = "What is 15 * 7? Please respond with just the number.";
    const mathResult = await model.generateContent(mathPrompt);
    const mathResponse = await mathResult.response;
    const mathText = mathResponse.text().trim();

    console.log("🔢 Math test (15 * 7):", mathText);
    console.log(
      mathText === "105"
        ? "✅ Math calculation correct!"
        : "⚠️  Math calculation might be off",
    );

    // Test JSON response capability
    console.log("\n📋 Testing JSON response...");
    const jsonPrompt = `Please respond with valid JSON containing: {"status": "working", "timestamp": "${new Date().toISOString()}", "model": "gemini-2.5-flash-lite-preview-06-17-flash-lite"}`;
    const jsonResult = await model.generateContent(jsonPrompt);
    const jsonResponse = await jsonResult.response;
    const jsonText = jsonResponse.text();

    try {
      const parsedJson = JSON.parse(
        jsonText.replace(/```json|```/g, "").trim(),
      );
      console.log("✅ JSON parsing successful:", parsedJson);
    } catch (jsonError) {
      console.log(
        "⚠️  JSON parsing failed, but response received:",
        jsonText.substring(0, 100) + "...",
      );
    }

    console.log("\n🎉 Gemini connectivity test completed successfully!");
    console.log("📊 Summary:");
    console.log("   - API key: Valid");
    console.log("   - Model: gemini-2.5-flash-lite-preview-06-17");
    console.log("   - Response time: " + responseTime + "ms");
    console.log("   - Basic functionality: Working");
    console.log("   - Text generation: ✅");
    console.log(
      "   - Math capabilities: " + (mathText === "105" ? "✅" : "⚠️"),
    );

    return {
      success: true,
      responseTime,
      responseLength: text.length,
    };
  } catch (error: any) {
    console.error("\n❌ Error testing Gemini connectivity:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);

    if (error.message.includes("API_KEY_INVALID")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Check if your API key is correct");
      console.log("   - Ensure the API key has the necessary permissions");
      console.log("   - Verify your Google AI Studio account is active");
    } else if (error.message.includes("quota")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - You may have exceeded your API quota");
      console.log("   - Check your Google AI Studio usage dashboard");
    } else if (
      error.message.includes("network") ||
      error.message.includes("ENOTFOUND")
    ) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Check your internet connection");
      console.log("   - Verify firewall settings");
    } else if (error.message.includes("model")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - The model might not be available in your region");
      console.log('   - Try using "gemini-1.5-flash" as an alternative');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Advanced test function for checking rate limits and model variations
async function testAdvancedFeatures(): Promise<void> {
  console.log("\n🔬 Running advanced Gemini tests...\n");

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log("❌ API key required for advanced tests");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Test different models
  const models = [
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  for (const modelName of models) {
    try {
      console.log(`🧪 Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const startTime = Date.now();
      const result = await model.generateContent(
        'Respond with "OK" if you can process this request.',
      );
      const endTime = Date.now();

      const response = await result.response;
      const text = response.text();

      console.log(
        `   ✅ ${modelName}: ${endTime - startTime}ms - "${text.trim()}"`,
      );
    } catch (error: any) {
      console.log(`   ❌ ${modelName}: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testGeminiConnectivity()
    .then((result) => {
      if (result.success) {
        console.log("\n🌟 All basic tests passed!");
        return testAdvancedFeatures();
      } else {
        console.log("\n💥 Basic tests failed. Skipping advanced tests.");
        process.exit(1);
      }
    })
    .then(() => {
      console.log("\n🎯 Testing complete!");
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}

export { testGeminiConnectivity, testAdvancedFeatures };
