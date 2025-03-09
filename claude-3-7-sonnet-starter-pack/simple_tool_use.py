#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "rich>=13.7.0",
#   "requests>=2.31.0",
# ]
# ///

"""
Simple Tool Use Example for Claude 3.7 Sonnet

This script demonstrates how to use Claude 3.7 Sonnet with tool calling.
It implements a real weather tool that uses the Open-Meteo API to fetch current weather data.

Usage:
    uv run simple_tool_use.py --prompt "What's the weather in Paris?"
    
Examples:
    uv run simple_tool_use.py --prompt "What's the weather in Minneapolis?"
    uv run simple_tool_use.py --prompt "What's the weather in San Francisco?"
    uv run simple_tool_use.py --prompt "What's the weather in New York?"
    uv run simple_tool_use.py --prompt "What's the weather in Chicago?"
"""

import os
import sys
import json
import argparse
import requests
import anthropic
from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.status import Status


def get_weather(location):
    """
    Get current weather for a location using Open-Meteo API

    Args:
        location (str): City name or location

    Returns:
        dict: Weather data including temperature, condition, and humidity
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

        return {
            "temperature": current.get("temperature_2m", "Unknown"),
            "condition": condition,
            "humidity": f"{current.get('relative_humidity_2m', 'Unknown')}%",
        }
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return {
            "temperature": "Error",
            "condition": "Service unavailable",
            "humidity": "Unknown",
        }


def main():
    # Initialize rich console
    console = Console()

    parser = argparse.ArgumentParser(description="Claude 3.7 Sonnet tool use example")
    parser.add_argument(
        "--prompt", type=str, required=True, help="The prompt to send to Claude"
    )
    parser.add_argument(
        "--max_tokens",
        type=int,
        default=1000,
        help="Maximum number of tokens in the response",
    )
    args = parser.parse_args()

    # Get API key from environment variable
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        console.print(
            "[bold red]Error:[/bold red] ANTHROPIC_API_KEY environment variable not set"
        )
        sys.exit(1)

    # Initialize the Anthropic client
    client = anthropic.Anthropic(api_key=api_key)

    # Define a simple weather tool
    weather_tool = {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
        },
    }

    # Display tool definition
    console.print(
        Panel(
            Syntax(
                json.dumps(weather_tool, indent=2),
                "json",
                theme="monokai",
                word_wrap=True,
            ),
            title="[bold magenta]Weather Tool Definition[/bold magenta]",
            border_style="magenta",
        )
    )

    try:
        # Display request information
        console.print(
            Panel(
                f"[bold]Prompt:[/bold] {args.prompt}\n[bold]Max Tokens:[/bold] {args.max_tokens}",
                title="[bold green]Request to Claude 3.7 Sonnet[/bold green]",
                border_style="green",
            )
        )

        # First request - Claude responds with tool request
        with console.status(
            "[bold green]Sending initial request to Claude 3.7 Sonnet...",
            spinner="dots",
        ):
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=args.max_tokens,
                tools=[weather_tool],
                messages=[{"role": "user", "content": args.prompt}],
            )

        # Check if there's a tool use in the response
        tool_use_blocks = [
            block for block in response.content if block.type == "tool_use"
        ]

        if tool_use_blocks:
            tool_use = tool_use_blocks[0]

            # Create a table for tool use request
            tool_table = Table(title="Tool Use Request")
            tool_table.add_column("Tool Name", style="cyan")
            tool_table.add_column("Input Parameters", style="green")
            tool_table.add_row(tool_use.name, json.dumps(tool_use.input, indent=2))
            console.print(tool_table)

            # Get real weather data
            location = tool_use.input.get("location", "Unknown")
            weather_data = get_weather(location)

            # Create a table for weather data
            weather_table = Table(title=f"Real Weather Data for {location}")
            weather_table.add_column("Metric", style="cyan")
            weather_table.add_column("Value", style="green")
            for key, value in weather_data.items():
                weather_table.add_row(key.capitalize(), str(value))
            console.print(weather_table)

            # Send the tool result back to Claude
            console.print(
                Panel(
                    "Sending tool result back to Claude...",
                    title="[bold green]Tool Result[/bold green]",
                    border_style="green",
                )
            )

            with console.status(
                "[bold green]Processing tool result...", spinner="dots"
            ):
                continuation = client.messages.create(
                    model="claude-3-7-sonnet-20250219",
                    max_tokens=args.max_tokens,
                    tools=[weather_tool],
                    messages=[
                        {"role": "user", "content": args.prompt},
                        {"role": "assistant", "content": response.content},
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tool_use.id,
                                    "content": f"Temperature: {weather_data['temperature']}°C, Condition: {weather_data['condition']}, Humidity: {weather_data['humidity']}",
                                }
                            ],
                        },
                    ],
                )

            # Display Claude's final response
            text_blocks = [
                block.text for block in continuation.content if block.type == "text"
            ]
            if text_blocks:
                console.print(
                    Panel(
                        "\n".join(text_blocks),
                        title="[bold blue]Claude's Final Response[/bold blue]",
                        border_style="blue",
                    )
                )

                # Calculate approximate token usage
                prompt_tokens = len(args.prompt.split())
                tool_result_tokens = len(
                    f"Temperature: {weather_data['temperature']}°F, Condition: {weather_data['condition']}, Humidity: {weather_data['humidity']}".split()
                )
                response_tokens = sum(
                    len(block.text.split())
                    for block in continuation.content
                    if block.type == "text"
                )
                total_tokens = prompt_tokens + tool_result_tokens + response_tokens

                # Calculate approximate costs (Claude 3.7 Sonnet pricing)
                input_cost = (prompt_tokens + tool_result_tokens) * (
                    3.0 / 1000000
                )  # $3.00 per million tokens
                output_cost = response_tokens * (
                    15.0 / 1000000
                )  # $15.00 per million tokens
                total_cost = input_cost + output_cost

                # Display token usage summary
                token_table = Table(title="Token Usage Summary")
                token_table.add_column("Type", style="cyan")
                token_table.add_column("Count", style="magenta")
                token_table.add_column("Cost ($)", style="green")
                token_table.add_row(
                    "Input Tokens",
                    str(prompt_tokens + tool_result_tokens),
                    f"${input_cost:.6f}",
                )
                token_table.add_row(
                    "Output Tokens", str(response_tokens), f"${output_cost:.6f}"
                )
                token_table.add_row("Total", str(total_tokens), f"${total_cost:.6f}")
                console.print(token_table)
        else:
            # If no tool was used, just display the response
            text_blocks = [
                block.text for block in response.content if block.type == "text"
            ]
            if text_blocks:
                console.print(
                    Panel(
                        "\n".join(text_blocks),
                        title="[bold yellow]Claude's Response (No Tool Use)[/bold yellow]",
                        border_style="yellow",
                    )
                )

                # Calculate approximate token usage
                prompt_tokens = len(args.prompt.split())
                response_tokens = sum(
                    len(block.text.split())
                    for block in response.content
                    if block.type == "text"
                )
                total_tokens = prompt_tokens + response_tokens

                # Calculate approximate costs (Claude 3.7 Sonnet pricing)
                input_cost = prompt_tokens * (3.0 / 1000000)  # $3.00 per million tokens
                output_cost = response_tokens * (
                    15.0 / 1000000
                )  # $15.00 per million tokens
                total_cost = input_cost + output_cost

                # Display token usage summary
                token_table = Table(title="Token Usage Summary")
                token_table.add_column("Type", style="cyan")
                token_table.add_column("Count", style="magenta")
                token_table.add_column("Cost ($)", style="green")
                token_table.add_row(
                    "Input Tokens", str(prompt_tokens), f"${input_cost:.6f}"
                )
                token_table.add_row(
                    "Output Tokens", str(response_tokens), f"${output_cost:.6f}"
                )
                token_table.add_row("Total", str(total_tokens), f"${total_cost:.6f}")
                console.print(token_table)

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
