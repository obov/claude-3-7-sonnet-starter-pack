#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "rich>=13.7.0",
# ]
# ///

"""
Simple Prompt Example for Claude 3.7 Sonnet

This script demonstrates basic usage of Claude 3.7 Sonnet without extended thinking.

Usage:
    uv run simple_prompt.py --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?"
    uv run simple_prompt.py --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?" --max_tokens 1000
"""

import os
import sys
import argparse
import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table


def main():
    # Initialize rich console
    console = Console()

    parser = argparse.ArgumentParser(
        description="Simple Claude 3.7 Sonnet prompt example"
    )
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

    try:
        # Display request information
        console.print(
            Panel(
                f"[bold]Prompt:[/bold] {args.prompt}\n[bold]Max Tokens:[/bold] {args.max_tokens}",
                title="[bold green]Request to Claude 3.7 Sonnet[/bold green]",
                border_style="green",
            )
        )

        # Create a message with Claude 3.7 Sonnet
        with console.status(
            "[bold green]Sending request to Claude 3.7 Sonnet...", spinner="dots"
        ):
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=args.max_tokens,
                messages=[{"role": "user", "content": args.prompt}],
            )

        # Display the response in a panel with blue styling
        console.print(
            Panel(
                response.content[0].text,
                title="[bold blue]Claude 3.7 Sonnet Response[/bold blue]",
                border_style="blue",
            )
        )

        # Calculate approximate token usage
        prompt_tokens = len(args.prompt.split())
        response_tokens = len(response.content[0].text.split())
        total_tokens = prompt_tokens + response_tokens

        # Calculate approximate costs (Claude 3.7 Sonnet pricing)
        input_cost = prompt_tokens * (3.0 / 1000000)  # $3.00 per million tokens
        output_cost = response_tokens * (15.0 / 1000000)  # $15.00 per million tokens
        total_cost = input_cost + output_cost

        # Display token usage summary
        token_table = Table(title="Token Usage Summary")
        token_table.add_column("Type", style="cyan")
        token_table.add_column("Count", style="magenta")
        token_table.add_column("Cost ($)", style="green")
        token_table.add_row("Input Tokens", str(prompt_tokens), f"${input_cost:.6f}")
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
