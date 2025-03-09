#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "python-dotenv>=1.0.0",
# ]
# ///

"""
Example demonstrating how to use the MCP Fetch server with Claude and uvx.

# Install the fetch MCP server
claude mcp add fetch -- uvx mcp-server-fetch

# List the MCP servers - should see fetch
claude mcp list

# Start Claude Code with fetch MCP tool enabled
claude

# Usage: Minimal example
Use the fetch tool to get content from https://example.com

# Usage: Parse content from a URL
fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons. 

# Usage: Parse and operate
fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons then write these to a markdown file. 

# Usage: Parse and operate (more complex)
fetch from https://agenticengineer.com/principled-ai-coding and list the names of the lessons and descriptions of the lessons then write these to a markdown file separated by skill level. 

# inspect the fetch MCP server
npx @modelcontextprotocol/inspector uvx mcp-server-fetch

# uninstall the fetch MCP server
claude mcp remove fetch
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the Anthropic client
try:
    from anthropic import Anthropic
except ImportError:
    print("Error: anthropic package not found. Please install it using:")
    print("pip install anthropic>=0.45.2")
    sys.exit(1)


def get_client():
    """Get the Anthropic API client with proper authentication."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError(
            "No API key found. Please set the ANTHROPIC_API_KEY environment variable."
        )
    return Anthropic(api_key=api_key)


def create_message(content):
    """Create formatted CLI message output."""
    separator = "=" * 80
    return f"\n{separator}\n{content}\n{separator}\n"


def demonstrate_fetch_usage():
    """Example showing how to use the Fetch MCP with Claude 3.7 Sonnet."""

    try:
        client = get_client()
        has_api_key = True
    except ValueError:
        has_api_key = False
        print("Note: No Anthropic API key found. This is a simulated example only.")

    # Define the fetch tool schema
    fetch_tool = {
        "name": "fetch",
        "description": "Fetches content from a URL and returns it as markdown or raw HTML",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to fetch content from"},
                "max_length": {
                    "type": "integer",
                    "description": "Maximum number of characters to return (default 5000)",
                },
                "start_index": {
                    "type": "integer",
                    "description": "Starting character index for pagination (default 0)",
                },
                "raw": {
                    "type": "boolean",
                    "description": "If true, returns raw HTML instead of processed markdown (default false)",
                },
            },
            "required": ["url"],
        },
    }

    # Sample URL to fetch content from
    sample_url = (
        "https://docs.anthropic.com/claude/reference/getting-started-with-the-api"
    )

    def simulate_fetched_content(url):
        """Simulate fetched content for demonstration purposes."""
        return f"""
# Getting Started with the Claude API

This guide will help you get started with the Claude API. Claude is a next-generation AI assistant capable of a wide range of tasks.

## Requirements

To use the Claude API, you'll need:
- An Anthropic API key ([sign up here](https://console.anthropic.com/))
- Python 3.8+ or Node.js 14+

## Installation

For Python:
```python
pip install anthropic
```

For Node.js:
```javascript
npm install @anthropic-ai/sdk
```

## Making Your First API Call

Here's a simple example in Python:

```python
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
```

For more detailed examples and advanced usage, please consult the full documentation.
"""

    if has_api_key:
        print(create_message("LIVE EXAMPLE WITH CLAUDE 3.7 SONNET"))
        print(f"Sending request to fetch content from {sample_url}")

        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4000,
            thinking={"type": "enabled", "budget_tokens": 8000},
            tools=[fetch_tool],
            messages=[
                {
                    "role": "user",
                    "content": f"Can you fetch the content from {sample_url} and summarize the main points?",
                }
            ],
        )

        # Look for tool use in response
        tool_use_block = next(
            (block for block in response.content if block.type == "tool_use"), None
        )

        if tool_use_block:
            # In a real scenario, this is where you would actually fetch the content
            # For this example, we'll simulate the fetched content
            fetched_content = simulate_fetched_content(
                tool_use_block.input.get("url", "")
            )

            print("\nClaude requested to fetch content. Tool use details:")
            print(f"  URL: {tool_use_block.input.get('url', '')}")
            print(f"  Max length: {tool_use_block.input.get('max_length', 'default')}")
            print(
                f"  Start index: {tool_use_block.input.get('start_index', 'default')}"
            )
            print(f"  Raw mode: {tool_use_block.input.get('raw', 'default')}")

            # Send the fetched content back to Claude
            continuation = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=4000,
                thinking={"type": "enabled", "budget_tokens": 8000},
                tools=[fetch_tool],
                messages=[
                    {
                        "role": "user",
                        "content": f"Can you fetch the content from {sample_url} and summarize the main points?",
                    },
                    {
                        "role": "assistant",
                        "content": [
                            block
                            for block in response.content
                            if block.type in ["thinking", "tool_use"]
                        ],
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use_block.id,
                                "content": fetched_content,
                            }
                        ],
                    },
                ],
            )

            # Print Claude's final response
            print("\nClaude's summary of the fetched content:")
            for block in continuation.content:
                if block.type == "text":
                    print(block.text)
    else:
        # Simulated example flow
        print(create_message("SIMULATED EXAMPLE"))
        print(
            f"User: Can you fetch the content from {sample_url} and summarize the main points?"
        )

        print(
            "\nClaude (thinking): I need to retrieve content from this URL to properly answer. I'll use the fetch tool."
        )

        print(f"\nClaude (tool use): Using fetch tool with url='{sample_url}'")

        fetched_content = simulate_fetched_content(sample_url)

        print("\nFetched content (simulated):")
        print(fetched_content[:500] + "...\n[Content truncated for display]")

        summary = """
Based on the fetched content from the Claude API documentation, here's a summary of the main points:

1. The Claude API requires an Anthropic API key which can be obtained from the Anthropic console.

2. The API can be used with either Python 3.8+ or Node.js 14+, with dedicated SDKs available for both languages.

3. Installation is straightforward:
   - For Python: `pip install anthropic`
   - For Node.js: `npm install @anthropic-ai/sdk`

4. A basic API call involves:
   - Initializing the client with your API key
   - Creating a message with a specified model (like claude-3-opus)
   - Sending user content and receiving Claude's response

5. The documentation includes code examples showing the fundamental patterns for interacting with Claude through the API.

The documentation appears to be a getting started guide that covers the essential requirements, setup process, and basic usage patterns for developers new to the Claude API.
"""

        print("\nClaude's summary of the fetched content (simulated):")
        print(summary)


def main():
    """Main function to run the example."""
    parser = argparse.ArgumentParser(
        description="Fetch MCP server example with Claude 3.7 Sonnet"
    )

    args = parser.parse_args()

    # Display explanation of the example
    print(create_message("FETCH MCP SERVER EXAMPLE"))
    print(
        "This example demonstrates how to use the Fetch MCP server with Claude 3.7 Sonnet."
    )
    print("It shows the setup process and a simulated interaction with the fetch tool.")
    print(
        "\nIMPORTANT: This is a client-side example only. You need to set up the MCP server separately."
    )
    print("Follow these steps to use real fetch functionality:")
    print("1. Install the fetch MCP server: uvx mcp-server-fetch")
    print("2. Register with Claude Code: claude mcp add fetch -- uvx mcp-server-fetch")
    print("3. Start Claude Code: claude --mcp\n")

    # Run the demonstration
    demonstrate_fetch_usage()

    # Final instructions
    print(create_message("NEXT STEPS"))
    print("To use the fetch tool in your own applications:")
    print("1. Ensure you have the MCP server running")
    print("2. Use the tool schema shown in this example")
    print("3. Process fetched content appropriately based on your use case")
    print(
        "\nFor more information, refer to the Claude API documentation and MCP specification."
    )


if __name__ == "__main__":
    main()
