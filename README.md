# Claude 3.7 Sonnet Starter Pack 🚀

*Check out [IndyDevDan YouTube Channel](https://www.youtube.com/c/indydevdan) for more AI Agents, LLMs, and AI Coding*

![Claude 3.7 Sonnet Hero Image](https://docs.anthropic.com/assets/images/claude-hero-a532fd8a.webp)

## Overview

This starter pack provides a collection of simple, self-contained examples showcasing the capabilities of Claude 3.7 Sonnet, Anthropic's latest and most powerful model. Each script demonstrates a specific feature or capability, making it easy to understand and integrate into your own projects.

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

o3 > claude-3-7-sonnet w/64k > o3-mini (HIGH) ≥ claude-3-7-sonnet > DeepSeek R1 ≥ claude-3-5-sonnet ≥ Deepseek v3

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

- [Extended Thinking Tips for Complex STEM Problems](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips#complex-stem-problems)
- [Extended Thinking Documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
