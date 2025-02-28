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

```bash
# Install dependencies and register with Claude Code in one command
uvx mcp install mcp_server_local_example.py --name weather-api
```

Then start Claude Code:
```bash
claude
```

OPTION 2: MANUAL SETUP
---------------------
1. Install dependencies:
   ```bash
   uv pip install "mcp[cli]>=1.3.0" anthropic requests
   ```

2. Run the server:
   ```bash
   python mcp_server_local_example.py
   ```

3. In another terminal, register with Claude:
   ```bash
   claude mcp register weather-api http://localhost:8000
   ```

4. Start Claude:
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
claude mcp unregister weather-api
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

# Load environment variables
load_dotenv()

def get_weather(location: str) -> Dict[str, Any]:
    """
    Get current weather for a location using Open-Meteo API
    
    Args:
        location (str): City name or location
        
    Returns:
        dict: Weather data including temperature, condition, humidity, and alerts
    """
    try:
        # Get coordinates for the location using geocoding API
        geocoding_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1"
        geo_response = requests.get(geocoding_url)
        geo_data = geo_response.json()
        
        if not geo_data.get("results"):
            return {
                "temperature": "Unknown",
                "condition": "Location not found",
                "humidity": "Unknown",
                "alerts": []
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
            "alerts": alerts
        }
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return {
            "temperature": "Error",
            "condition": "Service unavailable",
            "humidity": "Unknown",
            "alerts": ["Weather service unavailable"]
        }

# Create the MCP server
mcp = FastMCP("Weather API")

@mcp.tool()
def get_forecast(location: str) -> Dict[str, Any]:
    """Get weather forecast for a location.
    
    Args:
        location: City name or location for the forecast
        
    Returns:
        Weather forecast data including temperature, conditions, and humidity
    """
    weather_data = get_weather(location)
    temp = weather_data["temperature"]
    # Convert to Fahrenheit if temperature is a number
    if isinstance(temp, (int, float)) or (isinstance(temp, str) and temp.replace(".", "", 1).isdigit()):
        temp = float(temp)
        temp_f = (temp * 9 / 5) + 32
        temp = temp_f
    return {
        "temperature": temp,
        "conditions": weather_data["condition"],
        "humidity": weather_data["humidity"]
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
    
    # Convert temperature to Fahrenheit for display
    temp = weather_data['temperature']
    temp_unit = '°C'
    if isinstance(temp, (int, float)) or (isinstance(temp, str) and temp.replace(".", "", 1).isdigit()):
        temp_c = float(temp)
        temp_f = (temp_c * 9 / 5) + 32
        temp = f"{temp_c}°C ({temp_f:.1f}°F)"
        temp_unit = ''
    else:
        temp = f"{temp}°C"
    
    return f"""
Current weather for {location}:
Temperature: {temp}
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
        print("\n=== SIMULATED CLIENT EXAMPLE ===")
        print("Note: No Anthropic API key found or client available.")
        print("This is a simulation of how Claude would interact with this MCP server.\n")
        
        # Simulate client interaction
        location = "Paris"
        print(f"User: What's the weather in {location}?")
        print("\nClaude (thinking): I need to get weather information for this location.")
        print("I'll use the weather API tools to get the forecast and any alerts.")
        
        # Get actual data from our functions for the demo
        forecast = get_forecast(location)
        alerts = get_alerts(location)
        
        print(f"\nWeather data retrieved for {location}:")
        print(f"  Temperature: {forecast['temperature']}°F")
        print(f"  Conditions: {forecast['conditions']}")
        print(f"  Humidity: {forecast['humidity']}")
        print(f"  Alerts: {', '.join(alerts) if alerts else 'None'}")
        
        print(f"\nClaude: The current weather in {location} is {forecast['conditions'].lower()} ")
        print(f"with a temperature of {forecast['temperature']}°F and humidity of {forecast['humidity']}.")
        
        if alerts:
            print(f"There are active weather alerts for {location}: {', '.join(alerts)}.")
            print("Please take necessary precautions if you're in the area.")
        else:
            print(f"There are no active weather alerts for {location}.")
        
        print("=== END SIMULATED EXAMPLE ===\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Run a weather MCP server with the MCP Python SDK'
    )
    parser.add_argument('--client', action='store_true', help='Demonstrate client usage')
    
    args = parser.parse_args()
    
    if args.client:
        demonstrate_client_usage()
    else:
        print(f"\n=== WEATHER MCP SERVER ===")
        print("Starting Weather MCP server...")
        print("\nServer capabilities:")
        print("- get_forecast: Get weather forecast for a location")
        print("- get_alerts: Get weather alerts for a location")
        print("- weather://{location}/current: Resource for current weather")
        
        print("\nQuick setup:")
        print("1. In Claude Code: mcp install mcp_server_local_example.py --name weather-api")
        print("2. Ask about weather anywhere: \"What's the weather in Tokyo?\"")
        print("\nServer is running. Press Ctrl+C to stop.\n")
        
        # Run the MCP server
        mcp.run()