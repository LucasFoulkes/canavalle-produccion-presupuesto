// Simple example using the OpenAI Responses API from Node.
// Requires: npm install openai
// IMPORTANT: Don't hard-code API keys. Set it in your environment:
//   PowerShell: $Env:OPENAI_API_KEY = "sk-..."
//   bash:       export OPENAI_API_KEY=REDACTED
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
    console.error("Missing OPENAI_API_KEY. Set it in your environment.")
    process.exit(1)
}

const client = new OpenAI({ apiKey });

try {
    const response = await client.responses.create({
        // Pick the model you want to use. Adjust as needed.
        // Choose a model you have access to
        model: "gpt-4o-mini",
        input: "Write a one-sentence bedtime story about a unicorn.",
    });

    console.log(response.output_text);
} catch (err) {
    console.error("OpenAI call failed:", err);
    process.exitCode = 1;
}
