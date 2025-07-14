const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGeminiConnectivity() {
  console.log("🚀 Testing Google Gemini connectivity...\n");

  // Check for API key
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ Error: GOOGLE_AI_API_KEY or GOOGLE_API_KEY environment variable is required",
    );
    console.log("Please set your API key in the .env file:");
    console.log("GOOGLE_AI_API_KEY=your_api_key_here");
    process.exit(1);
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
    console.log("✅ Model initialized: gemini-2.5-flash-lite-preview-06-17");

    // Test with a simple prompt
    console.log("\n🤖 Sending test prompt...");
    const prompt =
      "Hello! Please respond with a simple greeting and confirm you're working correctly.";

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();

    const response = await result.response;
    const text = response.text();

    console.log("✅ Response received successfully!");
    console.log("⏱️  Response time:", endTime - startTime + "ms");
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

    console.log("\n🎉 Gemini connectivity test completed successfully!");
    console.log("📊 Summary:");
    console.log("   - API key: Valid");
    console.log("   - Model: gemini-2.5-flash-lite-preview-06-17");
    console.log("   - Response time: " + (endTime - startTime) + "ms");
    console.log("   - Basic functionality: Working");
  } catch (error) {
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
    }

    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGeminiConnectivity().catch(console.error);
}

module.exports = { testGeminiConnectivity };
