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
Extended Thinking with Tool Use Example for Claude 3.7 Sonnet

This script demonstrates how to combine extended thinking with tool use in Claude 3.7 Sonnet.
It implements a real weather API tool and a clothing recommendation tool that uses Claude.

The weather tool fetches real-time data from the Open-Meteo API, and the clothing tool
uses Claude to generate personalized recommendations based on the weather conditions.

Usage:
    uv run prompt_with_extended_thinking_tool_use.py --prompt "What's the weather in New York and what should I wear?" --max_tokens 2000 --thinking_budget_tokens 1024
    
Examples:
    uv run prompt_with_extended_thinking_tool_use.py --prompt "What's the weather in Minneapolis and what should I wear?" --max_tokens 2048 --thinking_budget_tokens 1024
    uv run prompt_with_extended_thinking_tool_use.py --prompt "How's the weather in San Francisco and what clothes do you recommend?" --max_tokens 2048 --thinking_budget_tokens 1024
    uv run prompt_with_extended_thinking_tool_use.py --prompt "What's the current weather in Sydney, Australia and what clothing is appropriate?" --max_tokens 2048 --thinking_budget_tokens 1024
    uv run prompt_with_extended_thinking_tool_use.py --prompt "Tell me about the weather in London today and suggest what I should wear for sightseeing" --max_tokens 2048 --thinking_budget_tokens 1024
"""

import os
import sys
import json
import argparse
import requests
import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table


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


def get_clothing_recommendation(temperature, conditions):
    """
    Get clothing recommendations based on weather conditions using Claude

    Args:
        temperature (float or int): Temperature in Celsius
        conditions (str): Weather conditions description

    Returns:
        str: Clothing recommendation
    """
    try:
        # Get API key from environment variable
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return "Unable to generate clothing recommendations (API key not found)"

        # Initialize the Anthropic client
        client = anthropic.Anthropic(api_key=api_key)

        # Convert Celsius to Fahrenheit for more familiar temperature range
        temp_f = (temperature * 9 / 5) + 32

        # Create prompt for Claude
        prompt = f"""
        Please provide a brief clothing recommendation based on the following weather:
        - Temperature: {temperature}°C ({temp_f:.1f}°F)
        - Weather conditions: {conditions}
        
        Keep your response concise (1-2 sentences) and focus only on what to wear.
        """

        # Get recommendation from Claude
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract and return the recommendation
        recommendation = response.content[0].text.strip()
        return recommendation

    except Exception as e:
        print(f"Error generating clothing recommendation: {e}")
        return "Unable to generate clothing recommendations at this time."


def main():
    # Initialize rich console
    console = Console()

    parser = argparse.ArgumentParser(
        description="Claude 3.7 Sonnet extended thinking with tool use example"
    )
    parser.add_argument(
        "--prompt", type=str, required=True, help="The prompt to send to Claude"
    )
    parser.add_argument(
        "--max_tokens",
        type=int,
        default=2000,
        help="Maximum number of tokens in the response",
    )
    parser.add_argument(
        "--thinking_budget_tokens",
        type=int,
        default=8000,
        help="Budget for thinking tokens (minimum 1024)",
    )
    args = parser.parse_args()

    # Validate thinking budget (minimum 1024 tokens)
    if args.thinking_budget_tokens < 1024:
        console.print(
            "[bold yellow]Warning:[/bold yellow] Minimum thinking budget is 1024 tokens. Setting to 1024."
        )
        args.thinking_budget_tokens = 1024

    # Ensure max_tokens is greater than thinking_budget_tokens
    if args.max_tokens <= args.thinking_budget_tokens:
        new_max_tokens = args.thinking_budget_tokens + 1000
        console.print(
            f"[bold yellow]Warning:[/bold yellow] max_tokens must be greater than thinking_budget_tokens. Setting max_tokens to {new_max_tokens}."
        )
        args.max_tokens = new_max_tokens

    # Get API key from environment variable
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        console.print(
            "[bold red]Error:[/bold red] ANTHROPIC_API_KEY environment variable not set"
        )
        sys.exit(1)

    # Initialize the Anthropic client
    client = anthropic.Anthropic(api_key=api_key)

    # Define tools
    weather_tool = {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
        },
    }

    clothing_tool = {
        "name": "get_clothing_recommendation",
        "description": "Get clothing recommendations based on temperature and weather conditions",
        "input_schema": {
            "type": "object",
            "properties": {
                "temperature": {"type": "number"},
                "conditions": {"type": "string"},
            },
            "required": ["temperature", "conditions"],
        },
    }

    # Display tool definitions
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

    console.print(
        Panel(
            Syntax(
                json.dumps(clothing_tool, indent=2),
                "json",
                theme="monokai",
                word_wrap=True,
            ),
            title="[bold magenta]Clothing Tool Definition[/bold magenta]",
            border_style="magenta",
        )
    )

    try:
        # Display request information
        console.print(
            Panel(
                f"[bold]Prompt:[/bold] {args.prompt}\n[bold]Max Tokens:[/bold] {args.max_tokens}\n[bold]Thinking Budget:[/bold] {args.thinking_budget_tokens} tokens",
                title="[bold green]Request to Claude 3.7 Sonnet[/bold green]",
                border_style="green",
            )
        )

        # First request - Claude responds with thinking and tool request
        with console.status(
            f"[bold green]Sending request to Claude 3.7 Sonnet with {args.thinking_budget_tokens} thinking tokens...",
            spinner="dots",
        ):
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=args.max_tokens,
                thinking={
                    "type": "enabled",
                    "budget_tokens": args.thinking_budget_tokens,
                },
                tools=[weather_tool, clothing_tool],
                messages=[{"role": "user", "content": args.prompt}],
            )

        # Log the API response
        console.print(
            Panel(
                Syntax(
                    json.dumps(response.model_dump(), indent=2),
                    "json",
                    theme="monokai",
                    word_wrap=True,
                ),
                title="[bold green]API Response[/bold green]",
                border_style="green",
            )
        )

        # Extract thinking block
        thinking_block = next(
            (block for block in response.content if block.type == "thinking"), None
        )

        if thinking_block:
            # Use syntax highlighting for the thinking process
            console.print(
                Panel(
                    Syntax(
                        thinking_block.thinking,
                        "markdown",
                        theme="monokai",
                        word_wrap=True,
                    ),
                    title="[bold cyan]Claude's Thinking Process[/bold cyan]",
                    border_style="cyan",
                )
            )

        # Extract tool use block if present
        tool_use_block = next(
            (block for block in response.content if block.type == "tool_use"), None
        )

        if tool_use_block:
            # Create a table for tool use request
            tool_table = Table(title=f"Tool Use Request: {tool_use_block.name}")
            tool_table.add_column("Parameter", style="cyan")
            tool_table.add_column("Value", style="green")

            for key, value in tool_use_block.input.items():
                tool_table.add_row(key, str(value))

            console.print(tool_table)

            # Get real weather data
            if tool_use_block.name == "get_weather":
                location = tool_use_block.input.get("location", "Unknown")
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
                        f"Sending weather data for {location} to Claude...",
                        title="[bold green]Tool Result[/bold green]",
                        border_style="green",
                    )
                )

                # Format weather conditions for next tool
                temp = weather_data["temperature"]
                if temp != "Unknown" and temp != "Error":
                    temp = float(temp)
                conditions = weather_data["condition"]

                with console.status(
                    "[bold green]Processing tool result...", spinner="dots"
                ):
                    continuation = client.messages.create(
                        model="claude-3-7-sonnet-20250219",
                        max_tokens=args.max_tokens,
                        thinking={
                            "type": "enabled",
                            "budget_tokens": args.thinking_budget_tokens,
                        },
                        tools=[weather_tool, clothing_tool],
                        messages=[
                            {"role": "user", "content": args.prompt},
                            # Include the thinking block in the assistant's response
                            {
                                "role": "assistant",
                                "content": [thinking_block, tool_use_block],
                            },
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tool_use_block.id,
                                        "content": f"Temperature: {weather_data['temperature']}°C, Conditions: {weather_data['condition']}, Humidity: {weather_data['humidity']}",
                                    }
                                ],
                            },
                        ],
                    )

                # Check if there's another tool use in the continuation
                second_tool_use = next(
                    (
                        block
                        for block in continuation.content
                        if block.type == "tool_use"
                    ),
                    None,
                )

                if (
                    second_tool_use
                    and second_tool_use.name == "get_clothing_recommendation"
                ):
                    # Create a table for second tool use request
                    second_tool_table = Table(
                        title=f"Tool Use Request: {second_tool_use.name}"
                    )
                    second_tool_table.add_column("Parameter", style="cyan")
                    second_tool_table.add_column("Value", style="green")

                    for key, value in second_tool_use.input.items():
                        second_tool_table.add_row(key, str(value))

                    console.print(second_tool_table)

                    # Get real clothing recommendation using Claude
                    temperature = second_tool_use.input.get("temperature", 0)
                    conditions = second_tool_use.input.get("conditions", "Unknown")

                    clothing_rec = get_clothing_recommendation(temperature, conditions)

                    # Display clothing recommendation
                    console.print(
                        Panel(
                            clothing_rec,
                            title="[bold magenta]Clothing Recommendation[/bold magenta]",
                            border_style="magenta",
                        )
                    )

                    # Send the second tool result back to Claude
                    console.print(
                        Panel(
                            "Sending clothing recommendation to Claude...",
                            title="[bold green]Second Tool Result[/bold green]",
                            border_style="green",
                        )
                    )

                    with console.status(
                        "[bold green]Processing final response...", spinner="dots"
                    ):
                        final_response = client.messages.create(
                            model="claude-3-7-sonnet-20250219",
                            max_tokens=args.max_tokens,
                            thinking={
                                "type": "enabled",
                                "budget_tokens": args.thinking_budget_tokens,
                            },
                            tools=[weather_tool, clothing_tool],
                            messages=[
                                {"role": "user", "content": args.prompt},
                                {
                                    "role": "assistant",
                                    "content": [thinking_block, tool_use_block],
                                },
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "tool_result",
                                            "tool_use_id": tool_use_block.id,
                                            "content": f"Temperature: {weather_data['temperature']}°C, Conditions: {weather_data['condition']}, Humidity: {weather_data['humidity']}",
                                        }
                                    ],
                                },
                                {"role": "assistant", "content": continuation.content},
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "tool_result",
                                            "tool_use_id": second_tool_use.id,
                                            "content": clothing_rec,
                                        }
                                    ],
                                },
                            ],
                        )

                    # Display Claude's final response
                    text_blocks = [
                        block.text
                        for block in final_response.content
                        if block.type == "text"
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
                        thinking_tokens = (
                            len(thinking_block.thinking.split())
                            if thinking_block
                            else 0
                        )
                        tool_result_tokens = len(
                            f"Temperature: {weather_data['temperature']}°C, Conditions: {weather_data['condition']}, Humidity: {weather_data['humidity']}".split()
                        ) + len(clothing_rec.split())
                        response_tokens = sum(
                            len(block.text.split())
                            for block in final_response.content
                            if block.type == "text"
                        )
                        total_tokens = (
                            prompt_tokens
                            + thinking_tokens
                            + tool_result_tokens
                            + response_tokens
                        )

                        # Calculate approximate costs (Claude 3.7 Sonnet pricing)
                        input_cost = (prompt_tokens + tool_result_tokens) * (
                            3.0 / 1000000
                        )  # $3.00 per million tokens
                        output_cost = response_tokens * (
                            15.0 / 1000000
                        )  # $15.00 per million tokens
                        thinking_cost = thinking_tokens * (
                            15.0 / 1000000
                        )  # $15.00 per million tokens (thinking tokens are billed as output)
                        total_cost = input_cost + output_cost + thinking_cost

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
                        token_table.add_row(
                            "Thinking Tokens",
                            str(thinking_tokens),
                            f"${thinking_cost:.6f}",
                        )
                        token_table.add_row(
                            "Total", str(total_tokens), f"${total_cost:.6f}"
                        )
                        console.print(token_table)
                else:
                    # Display Claude's response after the first tool use
                    text_blocks = [
                        block.text
                        for block in continuation.content
                        if block.type == "text"
                    ]
                    if text_blocks:
                        console.print(
                            Panel(
                                "\n".join(text_blocks),
                                title="[bold blue]Claude's Response After Weather Tool[/bold blue]",
                                border_style="blue",
                            )
                        )
            else:
                # Handle other tool types if needed
                console.print(
                    f"[bold yellow]Note:[/bold yellow] Tool {tool_use_block.name} not implemented in this example"
                )
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

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
