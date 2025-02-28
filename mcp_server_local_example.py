#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "requests>=2.31.0",
#   "python-dotenv>=1.0.0",
#   "mcp[cli]>=0.1.0",
# ]
# ///

"""
Example demonstrating a local weather MCP server based on the Model Context Protocol (MCP).

This example shows how to:
1. Create an MCP server that exposes weather-related tools
2. Define tool schemas for get-alerts and get-forecast
3. Handle tool requests and return responses
4. Integrate with Claude 3.7 Sonnet's tool calling with thinking blocks

=== WHAT IS MODEL CONTEXT PROTOCOL (MCP)? ===

Model Context Protocol (MCP) is an open protocol that enables Large Language Models (LLMs) 
to access external tools and data sources. It follows a client-server architecture where:

- MCP Hosts: Programs like Claude Code CLI that want to access data through MCP
- MCP Clients: Protocol clients that maintain 1:1 connections with servers
- MCP Servers: Lightweight programs (like this example) that expose specific capabilities through MCP
- Data Sources: Either local data on your computer or remote services accessible via APIs

MCP allows Claude to:
- Access specialized tools and data sources
- Follow a standardized communication protocol for tool interactions
- Run tools on your local machine or connect to external services securely

=== DETAILED SETUP AND USAGE GUIDE ===

STEP 1: INSTALL DEPENDENCIES
----------------------------
Make sure you have uv installed (https://github.com/astral-sh/uv).
This script uses uv to manage dependencies automatically.

STEP 2: SET UP ENVIRONMENT
--------------------------
Create a .env file in the same directory with your Anthropic API key:
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

STEP 3: START THE MCP SERVER
---------------------------
In terminal 1, run:
    uvx mcp_server_local_example.py

The server will start on port 8000 by default. You can specify a different port:
    uvx mcp_server_local_example.py --port 8080

STEP 4: TEST THE MCP SERVER
--------------------------
Test the server is working with curl commands:

# Get the schema:
curl -X POST http://localhost:8000/ -d '{"type":"schema"}'

# Test get-forecast:
curl -X POST http://localhost:8000/ -d '{"type":"execute","tools":[{"name":"get-forecast","parameters":{"location":"Paris"}}]}'

# Test get-alerts:
curl -X POST http://localhost:8000/ -d '{"type":"execute","tools":[{"name":"get-alerts","parameters":{"location":"Miami"}}]}'

STEP 5: RUN THE CLIENT EXAMPLE (OPTIONAL)
----------------------------------------
In a new terminal, run:
    uvx mcp_server_local_example.py --client

This will demonstrate how Claude interacts with the MCP server.

STEP 6: INTEGRATING WITH CLAUDE CODE
-----------------------------------
To use this MCP server with Claude Code:

1. Keep the MCP server running in a separate terminal

2. Register your MCP tool with Claude Code using the claude command:
   
   # Basic registration syntax
   claude mcp add <n> <command> [args...]
   
   # For this example (use -s for scope: project or global)
   claude mcp add weather-api -s project -- uvx mcp_server_local_example.py
   
   # Alternative: Register using URL if server is already running
   claude mcp register weather-api http://localhost:8000

3. Verify registration was successful:
   
   claude mcp list

4. Start the Claude Code CLI with MCP tools enabled:
   
   claude --mcp

5. In the Claude Code session, you can now:
   - Ask about weather for any location
   - Claude will use your MCP server to fetch real weather data
   - Example: "What's the weather in Tokyo right now?"

6. To unregister the MCP tool when done:
   
   claude mcp remove weather-api
   # OR 
   claude mcp unregister weather-api

STEP 7: UNDERSTANDING THE MCP ARCHITECTURE
-----------------------------------------
The MCP server in this example follows these core principles:

1. Schema Definition: Advertises available tools and their required parameters
2. Tool Execution: Handles requests to run specific tools with provided parameters
3. Data Processing: Transforms raw API data into structured responses
4. Client-Server Communication: Uses HTTP POST requests in a standardized JSON format

The key MCP components in this example:
- MCPRequestHandler: Processes incoming MCP requests
- handle_schema_request: Returns tool schemas in MCP format
- handle_execute_request: Executes tools based on incoming requests

STEP 8: EXTENDING THIS EXAMPLE
----------------------------
To create your own MCP server:
1. Define your tool schemas following the JSON Schema standard
2. Implement handler functions for each tool
3. Create request handlers for schema and execution requests
4. Start an HTTP server to listen for MCP requests

TROUBLESHOOTING
--------------
- Make sure the server is running in a separate terminal
- Confirm the port is not in use by another application
- Check your .env file has a valid Anthropic API key
- Ensure your system allows localhost connections
- For network errors, verify firewall settings
- Use the MCP inspector for debugging:
  npx @modelcontextprotocol/inspector uvx mcp_server_local_example.py
"""

import os
import sys
import json
import argparse
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import get_client, create_message


def get_weather(location):
    """
    Get current weather for a location using Open-Meteo API

    Args:
        location (str): City name or location

    Returns:
        dict: Weather data including temperature, condition, humidity, and alerts
    """
    try:
        # Get coordinates for the location using geocoding API
        geocoding_url = (
            f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1"
        )
        geo_response = requests.get(geocoding_url)
        geo_data = geo_response.json()

        if not geo_data.get("results"):
            return {
                "temperature": "Unknown",
                "condition": "Location not found",
                "humidity": "Unknown",
                "alerts": [],
            }

        # Extract coordinates
        lat = geo_data["results"][0]["latitude"]
        lon = geo_data["results"][0]["longitude"]

        # Get weather data using coordinates
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code"
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()

        # Extract current weather information
        current = weather_data.get("current", {})

        # Convert weather code to condition string
        # Based on WMO Weather interpretation codes (WW)
        # https://open-meteo.com/en/docs
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            56: "Light freezing drizzle",
            57: "Dense freezing drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Light freezing rain",
            67: "Heavy freezing rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }

        weather_code = current.get("weather_code", 0)
        condition = weather_codes.get(weather_code, "Unknown")

        # Generate alerts based on weather conditions
        alerts = []
        if weather_code >= 95:
            alerts.append("Thunderstorm Warning")
        if weather_code in [65, 67, 82]:
            alerts.append("Heavy Rain Warning")
        if weather_code in [75, 86]:
            alerts.append("Heavy Snow Warning")
        if weather_code in [56, 57, 66, 67]:
            alerts.append("Freezing Precipitation Warning")

        return {
            "temperature": current.get("temperature_2m", "Unknown"),
            "condition": condition,
            "humidity": f"{current.get('relative_humidity_2m', 'Unknown')}%",
            "alerts": alerts,
        }
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return {
            "temperature": "Error",
            "condition": "Service unavailable",
            "humidity": "Unknown",
            "alerts": ["Weather service unavailable"],
        }


def get_forecast(location: str) -> Dict[str, Any]:
    """Get weather forecast for a location."""
    weather_data = get_weather(location)
    return {
        "temperature": weather_data["temperature"],
        "conditions": weather_data["condition"],
        "humidity": weather_data["humidity"],
    }


def get_alerts(location: str) -> List[str]:
    """Get weather alerts for a location."""
    weather_data = get_weather(location)
    return weather_data["alerts"]


class MCPRequestHandler(BaseHTTPRequestHandler):
    """Handler for MCP server requests."""

    def _set_headers(self):
        """Set response headers."""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

    def do_POST(self):
        """Handle POST requests."""
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        request = json.loads(post_data.decode("utf-8"))

        response = self.handle_mcp_request(request)

        self._set_headers()
        self.wfile.write(json.dumps(response).encode("utf-8"))

    def handle_mcp_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MCP request and return response."""
        if request.get("type") == "schema":
            return self.handle_schema_request()
        elif request.get("type") == "execute":
            return self.handle_execute_request(request)
        else:
            return {"error": "Invalid request type"}

    def handle_schema_request(self) -> Dict[str, Any]:
        """Handle schema request and return tool schemas."""
        return {
            "schema": {
                "type": "object",
                "properties": {
                    "tools": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "enum": ["get-alerts", "get-forecast"],
                                },
                                "parameters": {
                                    "type": "object",
                                    "properties": {"location": {"type": "string"}},
                                    "required": ["location"],
                                },
                            },
                            "required": ["name", "parameters"],
                        },
                    }
                },
                "required": ["tools"],
            }
        }

    def handle_execute_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle execute request and return tool results."""
        tools = request.get("tools", [])
        results = []

        for tool in tools:
            name = tool.get("name")
            parameters = tool.get("parameters", {})
            location = parameters.get("location", "")

            if name == "get-alerts":
                alerts = get_alerts(location)
                results.append({"name": name, "result": alerts})
            elif name == "get-forecast":
                forecast = get_forecast(location)
                results.append({"name": name, "result": forecast})
            else:
                results.append({"name": name, "error": "Unknown tool"})

        return {"results": results}


def run_mcp_server(port: int = 8000):
    """Run the MCP server on the specified port."""
    server_address = ("", port)
    httpd = HTTPServer(server_address, MCPRequestHandler)
    print(f"\n=== WEATHER MCP SERVER ===")
    print(f"Starting MCP server on port {port}...")

    print(f"\nTEST EXAMPLES:")
    print(f'  curl -X POST http://localhost:{port}/ -d \'{{"type":"schema"}}\'')
    print(
        f'  curl -X POST http://localhost:{port}/ -d \'{{"type":"execute","tools":[{{"name":"get-forecast","parameters":{{"location":"Paris"}}}}]}}\''
    )

    print(f"\nCLAUDE CODE INTEGRATION:")
    print(f"  1. Keep this server running")
    print(
        f"  2. Register MCP tool: claude mcp register weather-api http://localhost:{port}"
    )
    print(f"  3. Start Claude Code: claude --mcp")
    print(f'  4. In Claude Code, ask: "What\'s the weather in Tokyo right now?"')
    print(f"  5. When done: claude mcp unregister weather-api")

    print(f"\nServer is running. Press Ctrl+C to stop.\n")
    httpd.serve_forever()


def demonstrate_mcp_client():
    """Example showing how to use the MCP server with Claude 3.7 Sonnet.

    This demonstrates how to call the MCP server and integrate with Claude.
    """
    try:
        # Try to get the client, but don't fail if API key is missing
        client = get_client()
        has_api_key = True
    except ValueError:
        # No API key available, we'll simulate the API call
        has_api_key = False
        print("Note: No Anthropic API key found. Simulating API calls instead.")

    # Define MCP tool
    mcp_tool = {
        "name": "weather_mcp",
        "description": "Get weather information from the MCP server",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
        },
    }

    # Sample location to check weather
    location = "Paris"

    if has_api_key:
        # First request - Claude responds with thinking and tool request
        print(f"\nSending request to Claude 3.7 Sonnet...")
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=20000,
            thinking={"type": "enabled", "budget_tokens": 16000},
            tools=[mcp_tool],
            messages=[
                {"role": "user", "content": f"What's the weather in {location}?"}
            ],
        )

        # Extract thinking block and tool use block
        thinking_block = next(
            (block for block in response.content if block.type == "thinking"), None
        )
        tool_use_block = next(
            (block for block in response.content if block.type == "tool_use"), None
        )

        if tool_use_block:
            # Get real weather data
            location = tool_use_block.input.get("location", "")
            weather_data = get_forecast(location)
            alerts = get_alerts(location)

            # Combine forecast and alerts
            result = {"forecast": weather_data, "alerts": alerts}

            print(f"\nWeather data for {location}:")
            print(f"  Temperature: {weather_data['temperature']}°C")
            print(f"  Conditions: {weather_data['conditions']}")
            print(f"  Humidity: {weather_data['humidity']}")
            print(f"  Alerts: {', '.join(alerts) if alerts else 'None'}")

            # Second request - Include thinking block and tool result
            print(f"\nSending tool result back to Claude...")
            continuation = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=20000,
                thinking={"type": "enabled", "budget_tokens": 16000},
                tools=[mcp_tool],
                messages=[
                    {"role": "user", "content": f"What's the weather in {location}?"},
                    {"role": "assistant", "content": [thinking_block, tool_use_block]},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use_block.id,
                                "content": json.dumps(result),
                            }
                        ],
                    },
                ],
            )

            # Print the final response
            print("\nClaude's response:")
            for block in continuation.content:
                if block.type == "text":
                    print(block.text)
    else:
        # Simulate the entire flow without making API calls
        print("\n=== SIMULATED CLIENT EXAMPLE ===")
        print(f"User: What's the weather in {location}?")
        print(
            "\nClaude (thinking): I need to get weather information for this location. I'll use the weather_mcp tool."
        )
        print(f"\nClaude (tool use): Using weather_mcp tool with location='{location}'")

        # Get real weather data using our API
        weather_data = get_forecast(location)
        alerts = get_alerts(location)

        print(f"\nWeather data retrieved:")
        print(f"  Temperature: {weather_data['temperature']}°C")
        print(f"  Conditions: {weather_data['conditions']}")
        print(f"  Humidity: {weather_data['humidity']}")
        print(f"  Alerts: {', '.join(alerts) if alerts else 'None'}")

        print(
            f"\nClaude: The current weather in {location} is {weather_data['conditions'].lower()} with a temperature of {weather_data['temperature']}°C and humidity of {weather_data['humidity']}."
        )
        if alerts:
            print(
                f"There are active weather alerts for {location}: {', '.join(alerts)}."
            )
            print("Please take necessary precautions if you're in the area.")
        else:
            print(f"There are no active weather alerts for {location}.")
        print("=== END SIMULATED EXAMPLE ===\n")


if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run a weather MCP server or client")
    parser.add_argument(
        "--client", action="store_true", help="Run as client instead of server"
    )
    parser.add_argument("--port", type=int, default=8000, help="Port for the server")

    args = parser.parse_args()

    if args.client:
        demonstrate_mcp_client()
    else:
        run_mcp_server(args.port)
