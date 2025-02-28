#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "python-dotenv>=1.0.0",
# ]
# ///

"""
Example demonstrating how to use the MCP Fetch server with Claude.

This example shows how to:
1. Set up and configure the fetch MCP server
2. Use the fetch tool to retrieve web content
3. Process fetched content with Claude 3.7 Sonnet
4. Handle pagination for long content

=== WHAT IS THE FETCH MCP SERVER? ===

The Fetch MCP server is a Model Context Protocol server that provides web content fetching capabilities. 
It enables Claude to retrieve and process content from web pages, converting HTML to markdown
for easier consumption.

Key features:
- Retrieves content from any URL
- Converts HTML to readable markdown
- Handles pagination with start_index parameter for large content
- Configurable content length limits
- Option to retrieve raw HTML instead of markdown

=== DETAILED SETUP AND USAGE GUIDE ===

STEP 1: INSTALL DEPENDENCIES
----------------------------
Make sure you have uv installed (https://github.com/astral-sh/uv).
This script uses uv to manage dependencies automatically.

For optimal HTML processing, it's recommended to install Node.js.

STEP 2: INSTALL THE FETCH MCP SERVER
-----------------------------------

Using uvx (recommended):
No specific installation needed. You can directly run:
uvx mcp-server-fetch

STEP 3: SET UP ENVIRONMENT
--------------------------
Create a .env file in the same directory with your Anthropic API key:
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

STEP 4: CONFIGURE CLAUDE CODE TO USE FETCH
-----------------------------------------
Register the fetch MCP server with Claude Code:

For uvx installation:
   claude mcp add fetch -- uvx mcp-server-fetch

Verify registration was successful:
   claude mcp list

Start Claude Code with MCP tools enabled:
   claude

STEP 5: USING THE FETCH TOOL WITH CLAUDE
---------------------------------------
Once configured, you can use the fetch tool with Claude:

1. Basic URL fetching:
   "Use the fetch tool to get content from https://example.com"

2. Reading paginated content:
   "Continue reading from the previous URL starting at index 5000"

3. Specifying content length:
   "Get just the first 1000 characters from https://example.com"

4. Getting raw HTML:
   "Fetch the raw HTML from https://example.com"

STEP 6: ADVANCED CONFIGURATION OPTIONS
------------------------------------
You can customize the fetch server behavior with additional flags:

1. Ignore robots.txt restrictions:
   claude mcp add fetch -s project -- uvx mcp-server-fetch --ignore-robots-txt

2. Custom user agent:
   claude mcp add fetch -s project -- uvx mcp-server-fetch --user-agent="Your Custom User Agent"

STEP 7: DEBUGGING THE FETCH SERVER
--------------------------------
Use the MCP inspector for debugging:

npx @modelcontextprotocol/inspector uvx mcp-server-fetch
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
    separator = "="*80
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
                "url": {
                    "type": "string",
                    "description": "URL to fetch content from"
                },
                "max_length": {
                    "type": "integer",
                    "description": "Maximum number of characters to return (default 5000)"
                },
                "start_index": {
                    "type": "integer",
                    "description": "Starting character index for pagination (default 0)"
                },
                "raw": {
                    "type": "boolean",
                    "description": "If true, returns raw HTML instead of processed markdown (default false)"
                }
            },
            "required": ["url"]
        }
    }
    
    # Sample URL to fetch content from
    sample_url = "https://docs.anthropic.com/claude/reference/getting-started-with-the-api"
    
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
            thinking={
                "type": "enabled",
                "budget_tokens": 8000
            },
            tools=[fetch_tool],
            messages=[
                {"role": "user", "content": f"Can you fetch the content from {sample_url} and summarize the main points?"}
            ]
        )
        
        # Look for tool use in response
        tool_use_block = next((block for block in response.content 
                             if block.type == 'tool_use'), None)
        
        if tool_use_block:
            # In a real scenario, this is where you would actually fetch the content
            # For this example, we'll simulate the fetched content
            fetched_content = simulate_fetched_content(tool_use_block.input.get("url", ""))
            
            print("\nClaude requested to fetch content. Tool use details:")
            print(f"  URL: {tool_use_block.input.get('url', '')}")
            print(f"  Max length: {tool_use_block.input.get('max_length', 'default')}")
            print(f"  Start index: {tool_use_block.input.get('start_index', 'default')}")
            print(f"  Raw mode: {tool_use_block.input.get('raw', 'default')}")
            
            # Send the fetched content back to Claude
            continuation = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=4000,
                thinking={
                    "type": "enabled",
                    "budget_tokens": 8000
                },
                tools=[fetch_tool],
                messages=[
                    {"role": "user", "content": f"Can you fetch the content from {sample_url} and summarize the main points?"},
                    {"role": "assistant", "content": [
                        block for block in response.content 
                        if block.type in ['thinking', 'tool_use']
                    ]},
                    {"role": "user", "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_block.id,
                        "content": fetched_content
                    }]}
                ]
            )
            
            # Print Claude's final response
            print("\nClaude's summary of the fetched content:")
            for block in continuation.content:
                if block.type == "text":
                    print(block.text)
    else:
        # Simulated example flow
        print(create_message("SIMULATED EXAMPLE"))
        print(f"User: Can you fetch the content from {sample_url} and summarize the main points?")
        
        print("\nClaude (thinking): I need to retrieve content from this URL to properly answer. I'll use the fetch tool.")
        
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
        description='Fetch MCP server example with Claude 3.7 Sonnet'
    )
    
    args = parser.parse_args()
    
    # Display explanation of the example
    print(create_message("FETCH MCP SERVER EXAMPLE"))
    print("This example demonstrates how to use the Fetch MCP server with Claude 3.7 Sonnet.")
    print("It shows the setup process and a simulated interaction with the fetch tool.")
    print("\nIMPORTANT: This is a client-side example only. You need to set up the MCP server separately.")
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
    print("\nFor more information, refer to the Claude API documentation and MCP specification.")

if __name__ == "__main__":
    main()