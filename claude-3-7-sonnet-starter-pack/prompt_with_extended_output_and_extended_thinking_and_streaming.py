#!/usr/bin/env -S uv run --script

# /// script
# dependencies = [
#   "anthropic>=0.45.2",
#   "argparse>=1.4.0",
#   "rich>=13.7.0",
# ]
# ///

"""
Extended Output, Extended Thinking, and Streaming Example for Claude 3.7 Sonnet

This script demonstrates how to use extended output (128k tokens) with extended thinking
and streaming for Claude 3.7 Sonnet. This is useful for generating very long, detailed responses.

The script provides comprehensive metrics tracking throughout the generation process:

During streaming:
- Live word count and token metrics in the JSON event data
- Real-time progress percentages for both response and thinking tokens
- Visual progress bars showing token utilization
- Preview of content chunks as they're generated
- Continuously updated metrics in panel titles

After completion, it displays:
1. The complete thinking process with word/token counts
2. Claude's final response with comprehensive word/token statistics
3. Token usage summary with cost estimates 

Usage:
    (10,000 words ≈ ~13,500 tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Generate a 10,000 word comprehensive analysis of renewable energy technologies" --max_tokens 32000 --thinking_budget_tokens 8000 --enable_extended_output

    (20,000 words ≈ ~27,000 tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Generate a 20,000 word comprehensive analysis of renewable energy technologies" --max_tokens 32000 --thinking_budget_tokens 8000 --enable_extended_output
    
    (30,000 words ≈ ~40,500 tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Generate a 30,000 word comprehensive analysis of renewable energy technologies" --max_tokens 32000 --thinking_budget_tokens 8000 --enable_extended_output

More Examples:
    # Standard output (8k token limit)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Write a detailed essay comparing different AI language models" --max_tokens 4000 --thinking_budget_tokens 2000

    # Extended output examples for long-form content (128k token limit)
    
    # 1. Technical documentation (15,000+ words ≈ 20,000+ tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Create a comprehensive technical documentation (at least 15,000 words ≈ 20,000 tokens) for a modern web application framework, including: 1) 5 chapters with multiple subheadings each, 2) At least 20 code examples in JavaScript (minimum 15 lines each), 3) 10 API endpoint specifications with request/response examples, 4) A security section with at least 8 best practices, and 5) A deployment guide with step-by-step instructions for 3 different environments. Include detailed text descriptions of diagrams where they would be helpful." --max_tokens 50000 --thinking_budget_tokens 10000 --enable_extended_output
    
    # 2. Creative writing (20,000+ words ≈ 27,000+ tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Write a novella of at least 20,000 words (approximately 27,000 tokens) set in a near-future world where artificial general intelligence has just been achieved. Structure it with: 1) At least 8 chapters, 2) A minimum of 4 main characters with different perspectives on AI, 3) At least 15 scenes with dialogue (minimum 10 exchanges each), 4) Character development arcs for all main characters, 5) At least 3 plot conflicts and resolutions, and 6) A minimum of 25 descriptive paragraphs (100+ words each) establishing settings and atmosphere." --max_tokens 60000 --thinking_budget_tokens 12000 --enable_extended_output
    
    # 3. Research paper (12,000+ words ≈ 16,000+ tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Generate a comprehensive research paper (minimum 12,000 words ≈ 16,000 tokens) on the environmental impacts of different renewable energy technologies. Include: 1) An abstract of 250-300 words (≈ 330-400 tokens), 2) An introduction of at least 1,000 words (≈ 1,350 tokens), 3) A methodology section of 1,500+ words (≈ 2,000 tokens), 4) Data analysis sections for each of 5 energy types (solar, wind, hydroelectric, geothermal, and bioenergy) with at least 1,000 words (≈ 1,350 tokens) each, 5) A comparative analysis section of 2,000+ words (≈ 2,700 tokens), 6) A discussion section of at least 1,500 words (≈ 2,000 tokens), 7) A conclusion of 800+ words (≈ 1,100 tokens), and 8) At least 40 citations and references in APA format." --max_tokens 45000 --thinking_budget_tokens 10000 --enable_extended_output
    
    # 4. Educational curriculum (10,000+ words ≈ 13,500+ tokens)
    uv run prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Develop a detailed 12-week data science curriculum (minimum 10,000 words ≈ 13,500 tokens) for undergraduate students. Include: 1) 12 weekly modules, each with at least 5 lecture topics described in 100+ words (≈ 135+ tokens) each, 2) 36 reading assignments (3 per week) with rationales, 3) 24 coding exercises (2 per week) with specifications and starter code, 4) 6 projects with detailed requirements (500+ words ≈ 670+ tokens each), 5) 12 assessments with rubrics, 6) Learning objectives for each week (minimum 5 per week), and 7) At least 15 sample code snippets (20+ lines each) illustrating key concepts." --max_tokens 40000 --thinking_budget_tokens 8000 --enable_extended_output
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
        description="Claude 3.7 Sonnet extended output with extended thinking and streaming example"
    )
    parser.add_argument(
        "--prompt", type=str, required=True, help="The prompt to send to Claude"
    )
    parser.add_argument(
        "--max_tokens",
        type=int,
        default=32000,
        help="Maximum number of tokens in the response",
    )
    parser.add_argument(
        "--thinking_budget_tokens",
        type=int,
        default=16000,
        help="Budget for thinking tokens (minimum 1024)",
    )
    parser.add_argument(
        "--enable_extended_output",
        action="store_true",
        help="Enable extended output (128k tokens)",
    )
    args = parser.parse_args()

    # Validate thinking budget (minimum 1024 tokens)
    if args.thinking_budget_tokens < 1024:
        console.print(
            "[bold yellow]Warning:[/bold yellow] Minimum thinking budget is 1024 tokens. Setting to 1024."
        )
        args.thinking_budget_tokens = 1024

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
        output_mode = (
            "[bold green]Extended output (128k tokens)[/bold green]"
            if args.enable_extended_output
            else "[bold blue]Standard output (8k tokens)[/bold blue]"
        )

        console.print(
            Panel(
                f"[bold]Prompt:[/bold] {args.prompt}\n"
                f"[bold]Max Tokens:[/bold] {args.max_tokens}\n"
                f"[bold]Thinking Budget:[/bold] {args.thinking_budget_tokens} tokens\n"
                f"[bold]Output Mode:[/bold] {output_mode}",
                title="[bold green]Request to Claude 3.7 Sonnet[/bold green]",
                border_style="green",
            )
        )

        # Prepare the stream parameters
        stream_params = {
            "model": "claude-3-7-sonnet-20250219",
            "max_tokens": args.max_tokens,
            "thinking": {
                "type": "enabled",
                "budget_tokens": args.thinking_budget_tokens,
            },
            "messages": [{"role": "user", "content": args.prompt}],
        }

        # Add beta flag for extended output if enabled
        if args.enable_extended_output:
            # Use the beta client for extended output
            stream_method = client.beta.messages.stream
            stream_params["betas"] = ["output-128k-2025-02-19"]
        else:
            # Use the standard client
            stream_method = client.messages.stream

        # Initialize content storage
        thinking_content = ""
        response_content = ""
        current_block_type = None
        thinking_tokens = 0
        response_tokens = 0

        # Create a Live display for streaming content
        with Live(auto_refresh=True, console=console) as live:
            # Stream the response
            with stream_method(**stream_params) as stream:
                # Process the streaming response
                for event in stream:
                    # Log the event data
                    event_data = event.model_dump()
                    
                    # Add summary metrics to all event data
                    event_data["response_metrics"] = {
                        "words_generated": len(response_content.split()),
                        "response_tokens": response_tokens,
                        "progress": f"{round((response_tokens / args.max_tokens) * 100, 1)}% of {args.max_tokens} tokens used"
                    }
                    
                    event_data["thinking_metrics"] = {
                        "thinking_words": len(thinking_content.split()),
                        "thinking_tokens": thinking_tokens,
                        "thinking_progress": f"{round((thinking_tokens / args.thinking_budget_tokens) * 100, 1)}% of {args.thinking_budget_tokens} tokens used"
                    }
                    
                    # Add specific details for delta events
                    if event.type == "content_block_delta":
                        if hasattr(event, 'delta'):
                            if event.delta.type == "text_delta":
                                event_data["current_chunk"] = {
                                    "type": "text_generation",
                                    "words_in_chunk": len(event.delta.text.split()),
                                    "preview": event.delta.text[:50] + ("..." if len(event.delta.text) > 50 else "")
                                }
                            elif event.delta.type == "thinking_delta":
                                event_data["current_chunk"] = {
                                    "type": "thinking_generation",
                                    "words_in_chunk": len(event.delta.thinking.split()),
                                    "preview": event.delta.thinking[:50] + ("..." if len(event.delta.thinking) > 50 else "")
                                }
                    
                    # Format as JSON string
                    event_data_str = json.dumps(event_data, indent=2)
                    
                    # Create progress bars for display in title
                    response_progress = round((response_tokens / args.max_tokens) * 100, 1)
                    thinking_progress = round((thinking_tokens / args.thinking_budget_tokens) * 100, 1) if thinking_tokens > 0 else 0
                    
                    # Format title with current metrics
                    metrics_title = f"[bold green]API Event [Response: {len(response_content.split())} words, {response_tokens} tokens, {response_progress}% | Thinking: {len(thinking_content.split())} words, {thinking_tokens} tokens, {thinking_progress}%][/bold green]"
                    
                    live.update(
                        Panel(
                            Syntax(event_data_str, "json", theme="monokai", word_wrap=True),
                            title=metrics_title,
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

                            # Calculate thinking word count and metrics
                            thinking_word_count = len(thinking_content.split())
                            thinking_percentage = round((thinking_tokens / args.thinking_budget_tokens) * 100, 1)
                            
                            # Format thinking progress bar
                            thinking_progress = "█" * int(thinking_percentage/5) + "░" * (20 - int(thinking_percentage/5))

                            # Update the live display with thinking content and metrics
                            live.update(
                                Panel(
                                    Syntax(
                                        thinking_content,
                                        "markdown",
                                        theme="monokai",
                                        word_wrap=True,
                                    ),
                                    title=f"[bold cyan]Claude's Thinking Process [Words: {thinking_word_count} | Tokens: {thinking_tokens}/{args.thinking_budget_tokens}][/bold cyan]",
                                    border_style="cyan",
                                    subtitle=f"[bold green]Thinking Progress: |{thinking_progress}| {thinking_percentage}% • Words: {thinking_word_count} • Tokens: {thinking_tokens}[/bold green]"
                                )
                            )

                        elif event.delta.type == "text_delta":
                            response_content += event.delta.text
                            response_tokens += len(event.delta.text.split())

                            # Calculate current word count and metrics
                            word_count = len(response_content.split())
                            max_tokens_percentage = round(
                                (response_tokens / args.max_tokens) * 100, 1
                            )

                            # Create a JSON object with metrics
                            metrics_json = {
                                "type": "response_metrics",
                                "text_preview": (
                                    response_content[-200:]
                                    if len(response_content) > 200
                                    else response_content
                                ),
                                "total_words": word_count,
                                "estimated_tokens": response_tokens,
                                "max_tokens_used": f"{max_tokens_percentage}% of {args.max_tokens}",
                            }

                            # Format progress bar
                            progress = "█" * int(max_tokens_percentage / 5) + "░" * (
                                20 - int(max_tokens_percentage / 5)
                            )

                            # Update the live display with response content and word count in title
                            live.update(
                                Panel(
                                    response_content,
                                    title=f"[bold blue]Claude's Response [Words: {word_count} | Tokens: {response_tokens}/{args.max_tokens}][/bold blue]",
                                    border_style="blue",
                                    subtitle=f"[bold green]Progress: |{progress}| {max_tokens_percentage}% • Words: {word_count} • Tokens: {response_tokens}[/bold green]",
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

                # We'll create the final token summary at the end of the script, not here

                # After Live context manager ends, display final outputs in order

                # 1. First show the complete thinking block
                if thinking_content:
                    thinking_word_count = len(thinking_content.split())
                    console.print("\n")
                    console.print(
                        Panel(
                            Markdown(thinking_content),
                            title=f"[bold cyan]Complete Thinking Process [Words: {thinking_word_count} | Tokens: {thinking_tokens}][/bold cyan]",
                            border_style="cyan",
                            width=100,
                            expand=False,
                        )
                    )

                # 2. Then show the final response
                if response_content:
                    word_count = len(response_content.split())
                    max_tokens_percentage = round(
                        (response_tokens / args.max_tokens) * 100, 1
                    )

                    # Create statistics JSON
                    stats_json = {
                        "output_statistics": {
                            "total_words": word_count,
                            "estimated_tokens": response_tokens,
                            "max_tokens_used_percentage": f"{max_tokens_percentage}%",
                            "thinking_words": (
                                thinking_word_count
                                if "thinking_word_count" in locals()
                                else 0
                            ),
                            "thinking_tokens": thinking_tokens,
                        }
                    }

                    console.print("\n")
                    console.print(
                        Panel(
                            Markdown(response_content),
                            title=f"[bold blue]Claude's Final Response [Words: {word_count} | Tokens: {response_tokens}][/bold blue]",
                            border_style="blue",
                            width=100,
                            expand=False,
                            subtitle=f"[bold green]Final Output Statistics: {json.dumps(stats_json['output_statistics'], separators=(',', ':'))}[/bold green]",
                        )
                    )

                # Display the final summary (after everything else)
                # We'll delay this until the end of the streaming process
                final_token_summary = Table(title="Token Usage Summary")
                final_token_summary.add_column("Type", style="cyan")
                final_token_summary.add_column("Count", style="magenta")
                final_token_summary.add_column("Cost ($)", style="green")
                final_token_summary.add_row("Input Tokens", str(prompt_tokens), f"${input_cost:.6f}")
                final_token_summary.add_row("Output Tokens", str(response_tokens), f"${output_cost:.6f}")
                final_token_summary.add_row("Thinking Tokens", str(thinking_tokens), f"${thinking_cost:.6f}")
                final_token_summary.add_row("Total", str(total_tokens), f"${total_cost:.6f}")

    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)
    
    finally:
        # Display token usage as the absolutely last thing, regardless of how the script exits
        if 'final_token_summary' in locals():
            console.print("\n")
            console.print("[bold yellow]===== FINAL TOKEN USAGE SUMMARY =====[/bold yellow]")
            console.print(final_token_summary)


if __name__ == "__main__":
    main()
