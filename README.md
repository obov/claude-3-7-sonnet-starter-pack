# Claude 3.7 Sonnet Starter Pack 🚀
> Look, Anthropic's Claude-3.7-Sonnet is a powerful, hybrid CRASHOUT LLM.
> 
> Their new CLAUDE CODE is THE best showcase of an [effective AI AGENT](https://www.anthropic.com/research/building-effective-agents) TO DATE.
> 
> Let's breakdown their capabilities and see how you can use it in your engineering work and play.

*Check out [IndyDevDan YouTube Channel](https://youtu.be/jCVO57fZIfM) for the full breakdown of this starter pack and for more actionable insights on AI Agents, LLMs, and AI Coding.*

![Claude 3.7 Sonnet Hero Image](images/gpt-4-5-flop-claude-3-7-sonnet-claude-code.png)

## Overview

This starter pack provides a collection of simple, self-contained examples showcasing the capabilities of Claude 3.7 Sonnet, Anthropic's latest and most powerful model. Each script demonstrates a specific feature or capability, making it easy to understand and integrate into your own projects.

## Installation - Install [uv](https://docs.astral.sh/uv/getting-started/installation/)
> uv is THE modern package manager for Python.

macos + linux
```bash
brew install uv
```

windows
```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Usage - Single File Sonnet Scripts
> See each file to see usage instructions. Start with `simple_prompt.py` and work your way up.

- `simple_prompt.py` - Basic prompt to Claude 3.7 Sonnet
- `simple_structured_output.py` - Demonstrates structured JSON output
- `simple_tool_use.py` - Shows basic tool use integration
- `prompt_with_extended_thinking.py` - Implements extended thinking for complex reasoning
- `prompt_with_extended_thinking_and_streaming.py` - Combines extended thinking with streaming responses
- `prompt_with_extended_thinking_tool_use.py` - Integrates extended thinking with tool use
- `prompt_with_extended_output_and_extended_thinking_and_streaming.py` - Showcases extended output combined with extended thinking and streaming
- `agent_bash_and_editor_with_extended_thinking.py` - Demonstrates an agent with bash and editor capabilities using extended thinking
- `mcp_server_local_example.py` - Demonstrates a local MCP server for weather data with Claude 3.7 Sonnet
- `mcp_server_fetch_hosted_example.py` - Shows how to use the Fetch MCP server to retrieve web content with Claude


## Model Stats

| **Feature**           | **Specification**                         |
| --------------------- | ----------------------------------------- |
| Model                 | **`claude-3-7-sonnet-20250219`**          |
| Tokens In             | 200k                                      |
| Tokens Out (Normal)   | 8k                                        |
| Tokens Out (Extended) | 128k (`betas=["output-128k-2025-02-19"]`) |
| Thinking Tokens       | 64k                                       |
| Knowledge Cut Off     | November 2024                             |

## Intelligence Comparison
> My take (vibes + benchmarks) on the intelligence of the models. Don't take it as gospel.

```
claude-3-7-sonnet w/64k >
    o1 (HIGH) >
    o3-mini (HIGH) >
    DeepSeek R1 >
    GPT-4.5 >=
    claude-3-7-sonnet >= 
    claude-3-5-sonnet >=
    Deepseek v3
```

## Pricing

| **Token use**                             | **Cost**     |
| ----------------------------------------- | ------------ |
| Input tokens                              | $3 / MTok    |
| Output tokens (including thinking tokens) | $15 / MTok   |
| Prompt caching write                      | $3.75 / MTok |
| Prompt caching read                       | $0.30 / MTok |

## Extended Thinking: The 80/20 Guide

**Big idea**: The big takeaway with extended thinking is that you have **FINE-GRAINED control** over the reasoning of your Claude 3.7 model now. You can effectively trade time & money for intelligence. This is powerful.

For simple tasks, you can just use the model with no extended thinking. For more complex tasks, you can scale up your extended thinking budget according to your needs:

| **Thinking Budget** | **Intelligence Level** |
| ------------------- | ---------------------- |
| 1024 tokens         | XS intelligence        |
| 2000 tokens         | S intelligence         |
| 4000 tokens         | M intelligence         |
| 8000 tokens         | L intelligence         |
| 16000 tokens        | XL intelligence        |
| 32000 tokens        | 2XL intelligence       |
| 64000 tokens        | 4XL intelligence       |

### Important Notes on Extended Thinking

- The minimum budget is 1,024 tokens
- Set appropriate budgets: Start with larger thinking budgets (16,000+ tokens) for complex tasks and adjust based on your needs
- Anthropic suggests starting at the minimum and increasing the thinking budget incrementally to find the optimal range for your use case
- Higher token counts may allow more comprehensive and nuanced reasoning, but there may be diminishing returns depending on the task
- The thinking budget is a target rather than a strict limit - actual token usage may vary based on the task
- Be prepared for potentially longer response times due to additional processing
- Streaming is required when **`max_tokens`** is greater than 21,333
- Monitor token usage to optimize costs and performance
- Use extended thinking for particularly complex tasks that benefit from step-by-step reasoning like math, coding, and analysis
- Experiment with thinking token budgets: The model might perform differently at different settings

## Documentation

For more information on Claude 3.7 Sonnet and extended thinking, check out these resources:

- [Claude 3.7 Sonnet Starter Pack FULL BREAKDOWN](https://youtu.be/jCVO57fZIfM)
- [Claude 3.7 Sonnet & Claude Code Release Post](https://www.anthropic.com/news/claude-3-7-sonnet)
- [Astral UV](https://docs.astral.sh/uv/)
- [Extended Thinking Tips for Complex STEM Problems](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips#complex-stem-problems)
- [Extended Thinking Documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Python MCP](https://github.com/modelcontextprotocol/python-sdk?tab=readme-ov-file#installation)
- [Model Context Protocol](https://github.com/modelcontextprotocol/servers)
- [Claude Code Tutorials](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/tutorials#set-up-model-context-protocol-mcp)