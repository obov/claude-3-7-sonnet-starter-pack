#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "rich>=13.7.0",
# ]
# ///

"""
Extended Thinking Example for Claude 3.7 Sonnet

This script demonstrates basic extended thinking capabilities of Claude 3.7 Sonnet.
It allows you to set a thinking budget to improve Claude's reasoning on complex tasks.

Usage:
    uv run prompt_with_extended_thinking.py --prompt "Explain quantum computing to me" --max_tokens 2048 --thinking_budget_tokens 1024
"""

import os
import sys
import json
import argparse
import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn


def main():
    # Initialize rich console
    console = Console()

    parser = argparse.ArgumentParser(
        description="Claude 3.7 Sonnet extended thinking example"
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
        console.print(
            f"[bold yellow]Warning:[/bold yellow] max_tokens must be greater than thinking_budget_tokens. Setting max_tokens to {args.thinking_budget_tokens + 1000}."
        )
        args.max_tokens = args.thinking_budget_tokens + 1000

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
                f"[bold]Prompt:[/bold] {args.prompt}\n[bold]Max Tokens:[/bold] {args.max_tokens}\n[bold]Thinking Budget:[/bold] {args.thinking_budget_tokens} tokens",
                title="[bold green]Request to Claude 3.7 Sonnet[/bold green]",
                border_style="green",
            )
        )

        # Create a message with Claude 3.7 Sonnet using extended thinking
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

        # Extract and display the thinking block if present
        thinking_blocks = [
            block for block in response.content if block.type == "thinking"
        ]
        if thinking_blocks:
            # Use syntax highlighting for the thinking process
            console.print(
                Panel(
                    Syntax(
                        thinking_blocks[0].thinking,
                        "markdown",
                        theme="monokai",
                        word_wrap=True,
                    ),
                    title="[bold cyan]Claude's Thinking Process[/bold cyan]",
                    border_style="cyan",
                )
            )

        # Display the text response
        text_blocks = [block for block in response.content if block.type == "text"]
        if text_blocks:
            console.print(
                Panel(
                    text_blocks[0].text,
                    title="[bold blue]Claude's Response[/bold blue]",
                    border_style="blue",
                )
            )

            # Calculate approximate token usage
            prompt_tokens = len(args.prompt.split())
            thinking_tokens = sum(
                len(block.thinking.split())
                for block in response.content
                if block.type == "thinking"
            )
            response_tokens = sum(
                len(block.text.split())
                for block in response.content
                if block.type == "text"
            )
            total_tokens = prompt_tokens + thinking_tokens + response_tokens

            # Calculate approximate costs (Claude 3.7 Sonnet pricing)
            input_cost = prompt_tokens * (3.0 / 1000000)  # $3.00 per million tokens
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
                "Input Tokens", str(prompt_tokens), f"${input_cost:.6f}"
            )
            token_table.add_row(
                "Output Tokens", str(response_tokens), f"${output_cost:.6f}"
            )
            token_table.add_row(
                "Thinking Tokens", str(thinking_tokens), f"${thinking_cost:.6f}"
            )
            token_table.add_row("Total", str(total_tokens), f"${total_cost:.6f}")
            console.print(token_table)

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
