#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "requests>=2.31.0",
#   "python-dotenv>=1.0.0",
#   "mcp[cli]>=1.3.0",
# ]
# ///

"""
Example demonstrating a local weather MCP server using the MCP Python SDK.

This example shows how to:
1. Create an MCP server that exposes weather-related tools
2. Define tools for get-alerts and get-forecast
3. Use the FastMCP framework for simplified MCP server development
4. Integrate with Claude 3.7 Sonnet's tool calling with thinking blocks

=== WHAT IS MODEL CONTEXT PROTOCOL (MCP)? ===

Model Context Protocol (MCP) is an open protocol that enables Large Language Models (LLMs) 
to access external tools and data sources. It follows a client-server architecture where:

- MCP Hosts: Programs like Claude Code CLI that want to access data through MCP
- MCP Clients: Protocol clients that maintain 1:1 connections with servers
- MCP Servers: Lightweight programs (like this example) that expose specific capabilities through MCP
- Data Sources: Either local data on your computer or remote services accessible via APIs

=== QUICK START GUIDE ===

OPTION 1: ONE-STEP INSTALLATION (RECOMMENDED)
---------------------------------------------
Install directly into Claude Code:

Add the MCP server to Claude Code
```bash
claude mcp install local-weather-mcp -- uv run mcp_server_local_example.py
```

Turn on the server
```bash
uv run mcp_server_local_example.py
```




```bash
# Install dependencies and register with Claude Code in one command
uvx mcp install mcp_server_local_example.py --name weather-api
```

Then start Claude Code:
```bash
claude
```

USING THE WEATHER API IN CLAUDE
-------------------------------
Once set up, simply ask Claude about the weather:
- "What's the weather in Tokyo right now?"
- "Are there any weather alerts in Miami?"
- "Tell me the current weather conditions in Paris."

When finished:
```bash
claude mcp remove local-weather-mcp
```
"""

import os
import sys
import json
import argparse
import requests
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table

# Load environment variables
load_dotenv()

# Initialize rich console
console = Console()


def get_weather(location: str) -> Dict[str, Any]:
    """
    Get current weather for a location using Open-Meteo API

    Args:
        location (str): City name or location

    Returns:
        dict: Weather data including temperature (in Fahrenheit), condition, humidity, and alerts
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

        # Get temperature in Celsius and convert to Fahrenheit
        temp_c = current.get("temperature_2m", "Unknown")
        if isinstance(temp_c, (int, float)) or (
            isinstance(temp_c, str) and temp_c.replace(".", "", 1).isdigit()
        ):
            temp_c = float(temp_c)
            temp_f = (temp_c * 9 / 5) + 32
            temperature = temp_f
        else:
            temperature = temp_c

        return {
            "temperature": temperature,
            "temperature_c": temp_c,  # Keep original Celsius value for reference
            "condition": condition,
            "humidity": f"{current.get('relative_humidity_2m', 'Unknown')}%",
            "alerts": alerts,
        }
    except Exception as e:
        console.print(f"[bold red]Error fetching weather data:[/bold red] {e}")
        return {
            "temperature": "Error",
            "temperature_c": "Error",
            "condition": "Service unavailable",
            "humidity": "Unknown",
            "alerts": ["Weather service unavailable"],
        }


# Create the MCP server
mcp = FastMCP("Weather API")


@mcp.tool()
def get_forecast(location: str) -> Dict[str, Any]:
    """Get weather forecast for a location.

    Args:
        location: City name or location for the forecast

    Returns:
        Weather forecast data including temperature (in Fahrenheit), conditions, and humidity
    """
    weather_data = get_weather(location)
    return {
        "temperature": weather_data["temperature"],
        "conditions": weather_data["condition"],
        "humidity": weather_data["humidity"],
    }


@mcp.tool()
def get_alerts(location: str) -> List[str]:
    """Get weather alerts for a location.

    Args:
        location: City name or location to check for weather alerts

    Returns:
        List of active weather alerts for the location
    """
    weather_data = get_weather(location)
    return weather_data["alerts"]


@mcp.resource("weather://{location}/current")
def get_current_weather(location: str) -> str:
    """Get current weather information for a location.

    Args:
        location: City name or location

    Returns:
        Text description of current weather conditions
    """
    weather_data = get_weather(location)
    alerts_text = ""
    if weather_data["alerts"]:
        alerts_text = f"\nActive alerts: {', '.join(weather_data['alerts'])}"

    # Format temperature display with both units
    if (
        "temperature_c" in weather_data
        and weather_data["temperature_c"] != "Unknown"
        and weather_data["temperature_c"] != "Error"
    ):
        temp_c = weather_data["temperature_c"]
        temp_f = weather_data["temperature"]
        temp_display = f"{temp_c}°C ({temp_f:.1f}°F)"
    else:
        temp_display = f"{weather_data['temperature']}°F"

    return f"""
Current weather for {location}:
Temperature: {temp_display}
Conditions: {weather_data['condition']}
Humidity: {weather_data['humidity']}{alerts_text}
"""


def demonstrate_client_usage():
    """Simulate how a client would interact with this MCP server."""

    try:
        from anthropic import Anthropic

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            client = Anthropic(api_key=api_key)
        else:
            raise ValueError("No API key found")
    except (ImportError, ValueError):
        console.print(
            Panel(
                "Note: No Anthropic API key found or client available.\n"
                "This is a simulation of how Claude would interact with this MCP server.",
                title="[bold yellow]SIMULATED CLIENT EXAMPLE[/bold yellow]",
                border_style="yellow",
            )
        )

        # Simulate client interaction
        location = "Paris"
        console.print(f"[bold cyan]User:[/bold cyan] What's the weather in {location}?")

        thinking_content = (
            "I need to get weather information for this location.\n"
            "I'll use the weather API tools to get the forecast and any alerts."
        )
        console.print(
            Panel(
                thinking_content,
                title="[bold cyan]Claude (thinking)[/bold cyan]",
                border_style="cyan",
            )
        )

        # Get actual data from our functions for the demo
        with console.status("[bold green]Fetching weather data...", spinner="dots"):
            forecast = get_forecast(location)
            alerts = get_alerts(location)

        # Create a table for weather data
        weather_table = Table(title=f"Weather Data for {location}")
        weather_table.add_column("Metric", style="cyan")
        weather_table.add_column("Value", style="green")

        weather_table.add_row("Temperature", f"{forecast['temperature']:.1f}°F")
        weather_table.add_row("Conditions", forecast["conditions"])
        weather_table.add_row("Humidity", forecast["humidity"])
        weather_table.add_row("Alerts", ", ".join(alerts) if alerts else "None")

        console.print(weather_table)

        # Claude's response
        response = (
            f"The current weather in {location} is {forecast['conditions'].lower()} "
        )
        response += f"with a temperature of {forecast['temperature']:.1f}°F and humidity of {forecast['humidity']}. "

        if alerts:
            response += (
                f"There are active weather alerts for {location}: {', '.join(alerts)}. "
            )
            response += "Please take necessary precautions if you're in the area."
        else:
            response += f"There are no active weather alerts for {location}."

        console.print(
            Panel(
                response,
                title="[bold blue]Claude's Response[/bold blue]",
                border_style="blue",
            )
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run a weather MCP server with the MCP Python SDK"
    )
    parser.add_argument(
        "--client", action="store_true", help="Demonstrate client usage"
    )

    args = parser.parse_args()

    if args.client:
        demonstrate_client_usage()
    else:
        # Display tool definitions
        console.print(
            Panel(
                Syntax(
                    json.dumps(
                        {
                            "name": "get_forecast",
                            "description": "Get weather forecast for a location",
                            "input_schema": {
                                "type": "object",
                                "properties": {"location": {"type": "string"}},
                                "required": ["location"],
                            },
                        },
                        indent=2,
                    ),
                    "json",
                    theme="monokai",
                    word_wrap=True,
                ),
                title="[bold magenta]Weather Tool Definition[/bold magenta]",
                border_style="magenta",
            )
        )

        # Display server info
        server_info = (
            "Server capabilities:\n"
            "- get_forecast: Get weather forecast for a location\n"
            "- get_alerts: Get weather alerts for a location\n"
            "- weather://{location}/current: Resource for current weather\n\n"
            "Quick setup:\n"
            "1. In Claude Code: claude mcp install local-weather-api -- uv run mcp_server_local_example.py\n"
            '2. Ask about weather anywhere: "What\'s the weather in Tokyo?"\n\n'
            "Server is running. Press Ctrl+C to stop."
        )

        console.print(
            Panel(
                server_info,
                title="[bold green]WEATHER MCP SERVER[/bold green]",
                border_style="green",
            )
        )

        # Run the MCP server
        with console.status(
            "[bold green] Your Local Weather MCP server is live!", spinner="dots"
        ):
            mcp.run()
