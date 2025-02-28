#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "rich>=13.7.0",
# ]
# ///

"""
Extended Thinking with Streaming Example for Claude 3.7 Sonnet

This script demonstrates how to stream extended thinking responses from Claude 3.7 Sonnet.
It allows you to see Claude's thinking process in real-time as it happens, and displays the 
complete thinking process for reference after the streaming is complete.

Usage:
    (answer is 489.24)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "What is 27 * 453 / 5 * 0.2?" --max_tokens 4000 --thinking_budget_tokens 2000

    # (Answer: B is telling the truth)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "Solve this logic puzzle: A says that B is lying. B says that C is lying. C says that A and B are both lying. Who is telling the truth?" --max_tokens 3000 --thinking_budget_tokens 2000
    
    # (Answer: 5 cats)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "If 5 cats can catch 5 mice in 5 minutes, how many cats would be needed to catch 100 mice in 100 minutes?" --max_tokens 3000 --thinking_budget_tokens 2000
    
    # (Answer: approximately 5.2 units)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "Imagine a square with side length 10. If you randomly select two points inside the square, what is the expected value of the distance between them?" --max_tokens 3000 --thinking_budget_tokens 2000
    
    # (Answer: 40,320 ways, which is 8!)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "In how many ways can 8 rooks be placed on an 8×8 chessboard so that no two rooks attack each other?" --max_tokens 3000 --thinking_budget_tokens 2000
    
    # (Answer: 14 flips on average)
    uv run prompt_with_extended_thinking_and_streaming.py --prompt "What is the expected number of coin flips needed to get 3 heads in a row?" --max_tokens 3000 --thinking_budget_tokens 2000
"""

import os
import sys
import json
import argparse
import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.live import Live
from rich.table import Table
from rich.markdown import Markdown


def main():
    # Initialize rich console
    console = Console()

    parser = argparse.ArgumentParser(
        description="Claude 3.7 Sonnet extended thinking with streaming example"
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
        default=4000,
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

        # Initialize content storage
        thinking_content = ""
        response_content = ""
        current_block_type = None
        thinking_tokens = 0
        response_tokens = 0

        # Create a Live display for streaming content
        with Live(auto_refresh=True, console=console) as live:
            # Stream a message with Claude 3.7 Sonnet using extended thinking
            with client.messages.stream(
                model="claude-3-7-sonnet-20250219",
                max_tokens=args.max_tokens,
                thinking={
                    "type": "enabled",
                    "budget_tokens": args.thinking_budget_tokens,
                },
                messages=[{"role": "user", "content": args.prompt}],
            ) as stream:
                # Process the streaming response
                for event in stream:
                    # Log the event data
                    event_data = json.dumps(event.model_dump(), indent=2)
                    live.update(
                        Panel(
                            Syntax(event_data, "json", theme="monokai", word_wrap=True),
                            title="[bold green]API Event[/bold green]",
                            border_style="green",
                        )
                    )

                    if event.type == "content_block_start":
                        current_block_type = event.content_block.type
                        live.update(
                            Panel(
                                f"Starting [bold]{current_block_type}[/bold] block...",
                                title=f"[bold magenta]Block Start: {current_block_type}[/bold magenta]",
                                border_style="magenta",
                            )
                        )

                    elif event.type == "content_block_delta":
                        if event.delta.type == "thinking_delta":
                            thinking_content += event.delta.thinking
                            thinking_tokens += len(event.delta.thinking.split())

                            # Update the live display with thinking content
                            live.update(
                                Panel(
                                    Syntax(
                                        thinking_content,
                                        "markdown",
                                        theme="monokai",
                                        word_wrap=True,
                                    ),
                                    title="[bold cyan]Claude's Thinking Process[/bold cyan]",
                                    border_style="cyan",
                                )
                            )

                        elif event.delta.type == "text_delta":
                            response_content += event.delta.text
                            response_tokens += len(event.delta.text.split())

                            # Update the live display with response content
                            live.update(
                                Panel(
                                    response_content,
                                    title="[bold blue]Claude's Response[/bold blue]",
                                    border_style="blue",
                                )
                            )

                    elif event.type == "content_block_stop":
                        live.update(
                            Panel(
                                f"[bold]{current_block_type}[/bold] block complete",
                                title=f"[bold green]Block Complete: {current_block_type}[/bold green]",
                                border_style="green",
                            )
                        )

            # Calculate approximate token usage
            prompt_tokens = len(args.prompt.split())
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

            # Prepare token usage summary
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

        # After Live context manager ends, show the complete thinking block
        if thinking_content:
            console.print("\n")
            console.print(
                Panel(
                    Markdown(thinking_content),
                    title="[bold cyan]Complete Thinking Process[/bold cyan]",
                    border_style="cyan",
                    width=100,
                    expand=False,
                )
            )

        # Display final response
        if response_content:
            console.print("\n")
            console.print(
                Panel(
                    Markdown(response_content),
                    title="[bold blue]Claude's Final Response[/bold blue]",
                    border_style="blue",
                    width=100,
                    expand=False,
                )
            )

        # Display token usage summary at the very end
        console.print("\n")
        console.print(token_table)

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
