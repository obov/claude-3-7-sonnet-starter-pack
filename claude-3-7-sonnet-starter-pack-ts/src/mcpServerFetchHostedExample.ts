import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example demonstrating how to use the MCP Fetch server with Claude and uvx.
 * 
 * # Install the fetch MCP server
 * claude mcp add fetch -- uvx mcp-server-fetch
 * 
 * # List the MCP servers - should see fetch
 * claude mcp list
 * 
 * # Start Claude Code with fetch MCP tool enabled
 * claude
 * 
 * # Usage: Minimal example
 * Use the fetch tool to get content from https://example.com
 * 
 * # Usage: Parse content from a URL
 * fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons. 
 * 
 * # Usage: Parse and operate
 * fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons then write these to a markdown file. 
 * 
 * # Usage: Parse and operate (more complex)
 * fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons then write these to a markdown file separated by skill level. 
 * 
 * # inspect the fetch MCP server
 * npx @modelcontextprotocol/inspector uvx mcp-server-fetch
 * 
 * # uninstall the fetch MCP server
 * claude mcp remove fetch
 */

/**
 * Get the Anthropic API client with proper authentication.
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No API key found. Please set the ANTHROPIC_API_KEY environment variable.");
  }
  return new Anthropic({ apiKey });
}

/**
 * Create formatted CLI message output.
 */
function createMessage(content: string): string {
  const separator = "=".repeat(80);
  return `\n${separator}\n${content}\n${separator}\n`;
}

/**
 * Example showing how to use the Fetch MCP with Claude 3.7 Sonnet.
 */
async function demonstrateFetchUsage() {
  let hasApiKey = true;
  let client: Anthropic;

  try {
    client = getClient();
  } catch (error) {
    hasApiKey = false;
    console.log("Note: No Anthropic API key found. This is a simulated example only.");
  }

  // Define the fetch tool schema
  const fetchTool: any = {
    name: "fetch",
    description: "Fetches content from a URL and returns it as markdown or raw HTML",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch content from" },
        max_length: {
          type: "integer",
          description: "Maximum number of characters to return (default 5000)",
        },
        start_index: {
          type: "integer",
          description: "Starting character index for pagination (default 0)",
        },
        raw: {
          type: "boolean",
          description: "If true, returns raw HTML instead of processed markdown (default false)",
        },
      },
      required: ["url"],
    },
  };

  // Sample URL to fetch content from
  const sampleUrl = "https://docs.anthropic.com/claude/reference/getting-started-with-the-api";

  function simulateFetchedContent(url: string): string {
    return `
# Getting Started with the Claude API

This guide will help you get started with the Claude API. Claude is a next-generation AI assistant capable of a wide range of tasks.

## Requirements

To use the Claude API, you'll need:
- An Anthropic API key ([sign up here](https://console.anthropic.com/))
- Python 3.8+ or Node.js 14+

## Installation

For Python:
\`\`\`python
pip install anthropic
\`\`\`

For Node.js:
\`\`\`javascript
npm install @anthropic-ai/sdk
\`\`\`

## Making Your First API Call

Here's a simple example in Python:

\`\`\`python
from anthropic import Anthropic

# Initialize the client with your API key
client = Anthropic(api_key="your_api_key")

# Send a message to Claude
message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1000,
    messages=[
        {"role": "user", "content": "Hello, Claude! What can you do?"}
    ]
)

# Print Claude's response
print(message.content[0].text)
\`\`\`

For more detailed examples and advanced usage, please consult the full documentation.
`;
  }

  if (hasApiKey) {
    console.log(createMessage("LIVE EXAMPLE WITH CLAUDE 3.7 SONNET"));
    console.log(`Sending request to fetch content from ${sampleUrl}`);

    try {
      // @ts-ignore - Anthropic SDK typing issue for thinking parameter
      const response = await client!.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        thinking: { type: "enabled", budget_tokens: 8000 },
        tools: [fetchTool],
        messages: [
          {
            role: "user",
            content: `Can you fetch the content from ${sampleUrl} and summarize the main points?`,
          },
        ],
      });

      // Look for tool use in response
      const toolUseBlock = response.content.find(block => block.type === "tool_use") as any;

      if (toolUseBlock) {
        // In a real scenario, this is where you would actually fetch the content
        // For this example, we'll simulate the fetched content
        // @ts-ignore - SDK typing issue
        const fetchedContent = simulateFetchedContent(toolUseBlock.input?.url || "");

        console.log("\nClaude requested to fetch content. Tool use details:");
        // @ts-ignore - SDK typing issue
        console.log(`  URL: ${toolUseBlock.input?.url || ''}`);
        // @ts-ignore - SDK typing issue
        console.log(`  Max length: ${toolUseBlock.input?.max_length || 'default'}`);
        // @ts-ignore - SDK typing issue
        console.log(`  Start index: ${toolUseBlock.input?.start_index || 'default'}`);
        // @ts-ignore - SDK typing issue
        console.log(`  Raw mode: ${toolUseBlock.input?.raw || 'default'}`);

        // Send the fetched content back to Claude
        // @ts-ignore - Anthropic SDK typing issues
        const continuation = await client!.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 4000,
          thinking: { type: "enabled", budget_tokens: 8000 },
          tools: [fetchTool],
          messages: [
            {
              role: "user",
              content: `Can you fetch the content from ${sampleUrl} and summarize the main points?`,
            },
            {
              role: "assistant",
              content: response.content.filter(block => 
                // @ts-ignore - Type check issues with Anthropic SDK
                block.type === "thinking" || block.type === "tool_use"
              ),
            },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: toolUseBlock.id,
                  content: fetchedContent,
                },
              ],
            },
          ],
        });

        // Print Claude's final response
        console.log("\nClaude's summary of the fetched content:");
        for (const block of continuation.content) {
          if (block.type === "text") {
            // @ts-ignore - SDK typing issue
            console.log(block.text);
          }
        }
      }
    } catch (error) {
      console.error("Error calling Claude API:", error);
    }
  } else {
    // Simulated example flow
    console.log(createMessage("SIMULATED EXAMPLE"));
    console.log(`User: Can you fetch the content from ${sampleUrl} and summarize the main points?`);

    console.log("\nClaude (thinking): I need to retrieve content from this URL to properly answer. I'll use the fetch tool.");

    console.log(`\nClaude (tool use): Using fetch tool with url='${sampleUrl}'`);

    const fetchedContent = simulateFetchedContent(sampleUrl);

    console.log("\nFetched content (simulated):");
    console.log(fetchedContent.substring(0, 500) + "...\n[Content truncated for display]");

    const summary = `
Based on the fetched content from the Claude API documentation, here's a summary of the main points:

1. The Claude API requires an Anthropic API key which can be obtained from the Anthropic console.

2. The API can be used with either Python 3.8+ or Node.js 14+, with dedicated SDKs available for both languages.

3. Installation is straightforward:
   - For Python: \`pip install anthropic\`
   - For Node.js: \`npm install @anthropic-ai/sdk\`

4. A basic API call involves:
   - Initializing the client with your API key
   - Creating a message with a specified model (like claude-3-opus)
   - Sending user content and receiving Claude's response

5. The documentation includes code examples showing the fundamental patterns for interacting with Claude through the API.

The documentation appears to be a getting started guide that covers the essential requirements, setup process, and basic usage patterns for developers new to the Claude API.
`;

    console.log("\nClaude's summary of the fetched content (simulated):");
    console.log(summary);
  }
}

/**
 * Main function to run the example.
 */
function main() {
  // Display explanation of the example
  console.log(createMessage("FETCH MCP SERVER EXAMPLE"));
  console.log("This example demonstrates how to use the Fetch MCP server with Claude 3.7 Sonnet.");
  console.log("It shows the setup process and a simulated interaction with the fetch tool.");
  console.log("\nIMPORTANT: This is a client-side example only. You need to set up the MCP server separately.");
  console.log("Follow these steps to use real fetch functionality:");
  console.log("1. Install the fetch MCP server: uvx mcp-server-fetch");
  console.log("2. Register with Claude Code: claude mcp add fetch -- uvx mcp-server-fetch");
  console.log("3. Start Claude Code: claude --mcp\n");

  // Run the demonstration
  demonstrateFetchUsage().then(() => {
    // Final instructions
    console.log(createMessage("NEXT STEPS"));
    console.log("To use the fetch tool in your own applications:");
    console.log("1. Ensure you have the MCP server running");
    console.log("2. Use the tool schema shown in this example");
    console.log("3. Process fetched content appropriately based on your use case");
    console.log("\nFor more information, refer to the Claude API documentation and MCP specification.");
  }).catch(error => {
    console.error("Error in demonstration:", error);
  });
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { demonstrateFetchUsage };