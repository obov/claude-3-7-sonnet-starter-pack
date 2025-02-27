# Claude 3.7 Sonnet Starter Pack 🚀

*Check out [IndyDevDan YouTube Channel](https://www.youtube.com/c/indydevdan) for more AI development content!*

![Claude 3.7 Sonnet Hero Image](https://docs.anthropic.com/assets/images/claude-hero-a532fd8a.webp)

## Overview

This starter pack provides a collection of simple, self-contained examples showcasing the capabilities of Claude 3.7 Sonnet, Anthropic's latest and most powerful model. Each script demonstrates a specific feature or capability, making it easy to understand and integrate into your own projects.

All examples use the [rich](https://github.com/Textualize/rich) Python library for beautiful, colorful terminal output with consistent visual styling:

- 🔵 **Blue panels** for Claude's responses
- 🟢 **Green panels** for requests and successful operations
- 🟣 **Magenta panels** for tool definitions and important metrics
- 🟡 **Yellow panels** for warnings and special cases
- 🔴 **Red text** for errors
- 🟣 **Cyan panels** for thinking processes

## Model Stats

| **Feature** | **Specification** |
|-------------|-------------------|
| Model | **`claude-3-7-sonnet-20250219`** |
| Tokens In | 200k |
| Tokens Out (Normal) | 8k |
| Tokens Out (Extended) | 128k (`betas=["output-128k-2025-02-19"]`) |
| Thinking Tokens | 64k |
| Knowledge Cut Off | November 2024 |

## Intelligence Comparison

o3 > claude-3-7-sonnet w/64k > o3-mini (HIGH) ≥ claude-3-7-sonnet > DeepSeek R1 ≥ claude-3-5-sonnet ≥ Deepseek v3

## Pricing

| **Token use** | **Cost** |
| --- | --- |
| Input tokens | $3 / MTok |
| Output tokens (including thinking tokens) | $15 / MTok |
| Prompt caching write | $3.75 / MTok |
| Prompt caching read | $0.30 / MTok |

## Extended Thinking: The 80/20 Guide

**Big idea**: The big takeaway with extended thinking is that you have **FINE-GRAINED control** over the reasoning of your Claude 3.7 model now. You can effectively trade time & money for intelligence. This is powerful.

For simple tasks, you can just use the model with no extended thinking. For more complex tasks, you can scale up your extended thinking budget according to your needs:

| **Thinking Budget** | **Intelligence Level** |
|---------------------|------------------------|
| 1024 tokens | XS intelligence |
| 2000 tokens | S intelligence |
| 4000 tokens | M intelligence |
| 8000 tokens | L intelligence |
| 16000 tokens | XL intelligence |
| 32000 tokens | 2XL intelligence |
| 64000 tokens | 4XL intelligence |

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

## Examples

### Simple Prompt

Basic usage of Claude 3.7 Sonnet without extended thinking.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/simple_prompt.py --prompt "What are the key features of Claude 3.7 Sonnet?" --max_tokens 1000
```

**Rich Features:**
- Green panel for request information
- Status spinner during API call
- Blue panel for Claude's response

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: What are the key features of Claude 3.7 Sonnet?                    ┃
┃ Max Tokens: 1000                                                           ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[Status: Sending request to Claude 3.7 Sonnet...]

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude 3.7 Sonnet Response ━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Claude 3.7 Sonnet is Anthropic's most advanced AI assistant, with several  ┃
┃ key features including:                                                    ┃
┃                                                                            ┃
┃ 1. Enhanced reasoning capabilities for complex tasks                       ┃
┃ 2. Extended thinking for step-by-step problem solving                      ┃
┃ 3. Improved tool use with multiple tools in sequence                       ┃
┃ 4. Extended output up to 128k tokens                                       ┃
┃ 5. Knowledge cutoff of November 2024                                       ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./simple_prompt.py)

### Simple Tool Use

Demonstrates how to use Claude 3.7 Sonnet with tool calling.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/simple_tool_use.py --prompt "What's the weather in Paris?" --max_tokens 1000
```

**Rich Features:**
- Magenta panel with syntax highlighting for tool definition
- Green panel for request information
- Status spinner during API calls
- Tables for tool inputs and outputs
- Blue panel for Claude's final response

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━ Weather Tool Definition ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ {                                                                          ┃
┃   "name": "get_weather",                                                   ┃
┃   "description": "Get current weather for a location",                     ┃
┃   "input_schema": {                                                        ┃
┃     "type": "object",                                                      ┃
┃     "properties": {                                                        ┃
┃       "location": {                                                        ┃
┃         "type": "string"                                                   ┃
┃       }                                                                    ┃
┃     },                                                                     ┃
┃     "required": [                                                          ┃
┃       "location"                                                           ┃
┃     ]                                                                      ┃
┃   }                                                                        ┃
┃ }                                                                          ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                           Tool Use Request: get_weather                           
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Parameter    ┃ Value                                                        ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ location     │ Paris                                                        │
└──────────────┴──────────────────────────────────────────────────────────────┘

                       Simulated Weather Data for Paris                        
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric       ┃ Value                                                        ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Temperature  │ 72                                                           │
│ Condition    │ Sunny                                                        │
│ Humidity     │ 45%                                                          │
└──────────────┴──────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Tool Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Sending weather data for Paris to Claude...                                ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Final Response ━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Currently in Paris, the weather is sunny with a temperature of 72°F        ┃
┃ (22°C) and humidity at 45%. It's a beautiful day to explore the city!      ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./simple_tool_use.py)

### Simple Structured Output

Shows how to get structured JSON output from Claude 3.7 Sonnet.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/simple_structured_output.py --prompt "Analyze this customer feedback: 'I've been a loyal user for 3 years, but the recent UI update is a disaster.'" --max_tokens 1000
```

**Rich Features:**
- Green panel for request information
- Status spinner during API call
- Syntax highlighting for JSON output
- Tables for sentiment and action items
- Yellow panel for invalid JSON (if applicable)

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: Analyze this customer feedback: 'I've been a loyal user for 3      ┃
┃ years, but the recent UI update is a disaster.'                            ┃
┃ Max Tokens: 1000                                                           ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                       Customer Feedback Analysis                        
┏━━━━━━━━━━━━━━┓
┃ Sentiment    ┃
┡━━━━━━━━━━━━━━┩
│ negative     │
└──────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━ Structured JSON Response ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ {                                                                          ┃
┃   "sentiment": "negative",                                                 ┃
┃   "key_issues": [                                                          ┃
┃     "Poor UI/UX in recent update",                                         ┃
┃     "Difficulty finding basic features",                                   ┃
┃     "Perceived high pricing (new 'premium' tier)"                          ┃
┃   ],                                                                       ┃
┃   "action_items": [                                                        ┃
┃     {                                                                      ┃
┃       "team": "Product",                                                   ┃
┃       "task": "Conduct usability testing and iterate on UI based on        ┃
┃ findings"                                                                  ┃
┃     },                                                                     ┃
┃     {                                                                      ┃
┃       "team": "UX",                                                        ┃
┃       "task": "Create a feature discovery guide or onboarding flow"        ┃
┃     },                                                                     ┃
┃     {                                                                      ┃
┃       "team": "Marketing",                                                 ┃
┃       "task": "Review pricing strategy and communicate value proposition"  ┃
┃     }                                                                      ┃
┃   ]                                                                        ┃
┃ }                                                                          ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                             Action Items                              
┏━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Team       ┃ Task                                                         ┃
┡━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Product    │ Conduct usability testing and iterate on UI based on         │
│            │ findings                                                     │
│ UX         │ Create a feature discovery guide or onboarding flow          │
│ Marketing  │ Review pricing strategy and communicate value proposition    │
└────────────┴─────────────────────────────────────────────────────────────┘
```

[View Code](./simple_structured_output.py)

### Prompt with Extended Thinking

Demonstrates basic extended thinking capabilities.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/prompt_with_extended_thinking.py --prompt "Explain quantum computing to me" --max_tokens 2000 --thinking_budget_tokens 8000
```

**Rich Features:**
- Green panel for request information
- Status spinner during API call
- Cyan panel with syntax highlighting for Claude's thinking process
- Blue panel for Claude's response

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: Explain quantum computing to me                                    ┃
┃ Max Tokens: 2000                                                           ┃
┃ Thinking Budget: 8000 tokens                                               ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Thinking Process ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ I need to explain quantum computing in a clear, accessible way. I'll       ┃
┃ structure my explanation to cover:                                         ┃
┃                                                                            ┃
┃ 1. What quantum computing is and how it differs from classical computing   ┃
┃ 2. Key concepts: qubits, superposition, entanglement, quantum gates        ┃
┃ 3. Potential applications and advantages                                   ┃
┃ 4. Current state and challenges                                            ┃
┃                                                                            ┃
┃ Let me start with the fundamental differences between classical and        ┃
┃ quantum computing...                                                       ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━ Claude's Response ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ # Quantum Computing Explained                                              ┃
┃                                                                            ┃
┃ Quantum computing is a revolutionary approach to computation that          ┃
┃ leverages the principles of quantum mechanics to process information in    ┃
┃ ways that classical computers cannot.                                      ┃
┃                                                                            ┃
┃ ## Classical vs. Quantum Computing                                         ┃
┃                                                                            ┃
┃ In classical computing, information is processed using bits, which can     ┃
┃ exist in one of two states: 0 or 1. Quantum computing uses quantum bits   ┃
┃ or "qubits," which can exist in multiple states simultaneously thanks to   ┃
┃ quantum mechanical properties.                                             ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./prompt_with_extended_thinking.py)

### Prompt with Extended Thinking and Streaming

Shows how to stream extended thinking responses.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/prompt_with_extended_thinking_and_streaming.py --prompt "What is 27 * 453?" --max_tokens 2000 --thinking_budget_tokens 4000
```

**Rich Features:**
- Green panel for request information
- Live display for streaming content
- Cyan panel with syntax highlighting for Claude's thinking process (updates in real-time)
- Blue panel for Claude's response (updates in real-time)
- Magenta panel for block start/stop events

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: What is 27 * 453?                                                  ┃
┃ Max Tokens: 2000                                                           ┃
┃ Thinking Budget: 4000 tokens                                               ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Block Start: thinking ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Starting thinking block...                                                 ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Thinking Process ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ To calculate 27 * 453, I'll multiply these numbers step by step.           ┃
┃                                                                            ┃
┃ First, I'll break it down:                                                 ┃
┃ 27 * 453 = (20 + 7) * 453                                                  ┃
┃ = 20 * 453 + 7 * 453                                                       ┃
┃                                                                            ┃
┃ Let's calculate 20 * 453:                                                  ┃
┃ 20 * 453 = 2 * 10 * 453 = 2 * 4530 = 9060                                  ┃
┃                                                                            ┃
┃ Now let's calculate 7 * 453:                                               ┃
┃ 7 * 453 = 7 * 400 + 7 * 50 + 7 * 3                                         ┃
┃ = 2800 + 350 + 21                                                          ┃
┃ = 3171                                                                     ┃
┃                                                                            ┃
┃ Finally, we add the results:                                               ┃
┃ 27 * 453 = 9060 + 3171 = 12231                                             ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Block Complete: thinking ━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ thinking block complete                                                    ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━ Claude's Response ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ 27 × 453 = 12,231                                                          ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./prompt_with_extended_thinking_and_streaming.py)

### Prompt with Extended Output, Extended Thinking, and Streaming

Demonstrates how to use extended output (128k tokens) with extended thinking and streaming.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/prompt_with_extended_output_and_extended_thinking_and_streaming.py --prompt "Generate a comprehensive analysis of renewable energy technologies" --max_tokens 32000 --thinking_budget_tokens 16000 --enable_extended_output
```

**Rich Features:**
- Green panel for request information with extended output mode highlighted
- Live display for streaming content with real-time updates
- Magenta panels for block start/stop events
- Cyan panel with syntax highlighting for Claude's thinking process (updates in real-time)
- Blue panel for Claude's response (updates in real-time)
- Token usage summary table with color-coded columns

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: Generate a comprehensive analysis of renewable energy technologies ┃
┃ Max Tokens: 32000                                                          ┃
┃ Thinking Budget: 16000 tokens                                              ┃
┃ Output Mode: Extended output (128k tokens)                                 ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Block Start: thinking ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Starting thinking block...                                                 ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Thinking Process ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ I need to create a comprehensive analysis of renewable energy              ┃
┃ technologies. I'll structure this analysis to cover:                       ┃
┃                                                                            ┃
┃ 1. Introduction to renewable energy                                        ┃
┃ 2. Major renewable energy technologies:                                    ┃
┃    - Solar (photovoltaic and concentrated solar power)                     ┃
┃    - Wind (onshore and offshore)                                           ┃
┃    - Hydroelectric                                                         ┃
┃    - Geothermal                                                            ┃
┃    - Biomass and biofuels                                                  ┃
┃    - Tidal/wave energy                                                     ┃
┃    - Emerging technologies                                                 ┃
┃ 3. Comparative analysis (efficiency, cost, scalability, etc.)              ┃
┃ 4. Integration challenges and solutions                                    ┃
┃ 5. Environmental impacts                                                   ┃
┃ 6. Economic considerations                                                 ┃
┃ 7. Policy and regulatory frameworks                                        ┃
┃ 8. Future outlook and innovations                                          ┃
┃ 9. Conclusion                                                              ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━ Claude's Response ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ # Comprehensive Analysis of Renewable Energy Technologies                  ┃
┃                                                                            ┃
┃ ## 1. Introduction                                                         ┃
┃                                                                            ┃
┃ Renewable energy technologies harness natural processes to generate        ┃
┃ electricity, heat, and fuel while producing minimal greenhouse gas         ┃
┃ emissions. Unlike fossil fuels, renewable energy sources replenish         ┃
┃ naturally over short time scales and provide a sustainable alternative     ┃
┃ to conventional energy production methods.                                 ┃
┃                                                                            ┃
┃ The global transition to renewable energy has accelerated in recent        ┃
┃ years due to:                                                              ┃
┃                                                                            ┃
┃ - Declining costs of renewable technologies                                ┃
┃ - Growing concerns about climate change                                    ┃
┃ - Energy security considerations                                           ┃
┃ - Supportive policy frameworks                                             ┃
┃ - Corporate sustainability commitments                                     ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                           Token Usage Summary                            
┏━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Type             ┃ Count                                                ┃
┡━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Thinking Tokens  │ 12453                                                │
│ Response Tokens  │ 28764                                                │
│ Total Tokens     │ 41217                                                │
└──────────────────┴──────────────────────────────────────────────────────┘
```

[View Code](./prompt_with_extended_output_and_extended_thinking_and_streaming.py)

### Prompt with Extended Thinking and Tool Use

Shows how to combine extended thinking with tool use.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/prompt_with_extended_thinking_tool_use.py --prompt "What's the weather in New York and what should I wear?" --max_tokens 2000 --thinking_budget_tokens 8000
```

**Rich Features:**
- Magenta panels with syntax highlighting for tool definitions
- Green panel for request information
- Status spinner during API calls
- Cyan panel with syntax highlighting for Claude's thinking process
- Tables for tool inputs and outputs
- Green panels for tool results
- Blue panel for Claude's final response

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━ Weather Tool Definition ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ {                                                                          ┃
┃   "name": "get_weather",                                                   ┃
┃   "description": "Get current weather for a location",                     ┃
┃   "input_schema": {                                                        ┃
┃     "type": "object",                                                      ┃
┃     "properties": {                                                        ┃
┃       "location": {                                                        ┃
┃         "type": "string"                                                   ┃
┃       }                                                                    ┃
┃     },                                                                     ┃
┃     "required": [                                                          ┃
┃       "location"                                                           ┃
┃     ]                                                                      ┃
┃   }                                                                        ┃
┃ }                                                                          ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Thinking Process ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ I need to help the user find out the weather in New York and recommend     ┃
┃ what they should wear. I'll need to:                                       ┃
┃                                                                            ┃
┃ 1. Use the get_weather tool to check the current weather in New York       ┃
┃ 2. Based on the weather data, use the get_clothing_recommendation tool     ┃
┃ 3. Provide a helpful response combining both pieces of information         ┃
┃                                                                            ┃
┃ Let me start by requesting the weather information for New York.           ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                           Tool Use Request: get_weather                           
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Parameter    ┃ Value                                                        ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ location     │ New York                                                     │
└──────────────┴──────────────────────────────────────────────────────────────┘

                      Simulated Weather Data for New York                       
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric       ┃ Value                                                        ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Temperature  │ 68                                                           │
│ Conditions   │ Partly Cloudy                                                │
└──────────────┴──────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Tool Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Sending weather data for New York to Claude...                             ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                Tool Use Request: get_clothing_recommendation                 
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Parameter    ┃ Value                                                        ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ temperature  │ 68                                                           │
│ conditions   │ Partly Cloudy                                                │
└──────────────┴──────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━ Clothing Recommendation ━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Medium layers: light jacket, pants, and a light sweater                    ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Final Response ━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Currently in New York, it's 68°F (20°C) and partly cloudy. For this        ┃
┃ weather, I'd recommend wearing medium layers:                              ┃
┃                                                                            ┃
┃ - A light jacket or cardigan                                               ┃
┃ - Pants or jeans                                                           ┃
┃ - A light sweater or long-sleeve shirt                                     ┃
┃                                                                            ┃
┃ This outfit will keep you comfortable throughout the day as temperatures   ┃
┃ are mild but not too warm. You might want to bring sunglasses for when     ┃
┃ the sun comes out between clouds.                                          ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./prompt_with_extended_thinking_tool_use.py)

### Agent with Bash and Editor Tools

A complete agent that can execute bash commands and edit files with extended thinking.

```bash
uv run examples/claude-3-7-sonnet-starter-pack/agent_bash_and_editor_with_extended_thinking.py --prompt "Create a new file called hello.txt with 'Hello World!' in it"
```

**Rich Features:**
- Green panel for request information
- Cyan panel with syntax highlighting for Claude's thinking process
- Magenta panels for tool definitions
- Blue panels for Claude's responses
- Yellow panels for tool execution results
- Tables for command execution details
- Progress bars for long-running operations
- Status indicators for different agent states

**Example Output:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━ Request to Claude 3.7 Sonnet ━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Prompt: Create a new file called hello.txt with 'Hello World!' in it       ┃
┃ Max Tokens: 4000                                                           ┃
┃ Thinking Budget: 16000 tokens                                              ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━ Claude's Thinking Process ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ I need to create a new file called hello.txt with the content 'Hello       ┃
┃ World!' in it. I can do this using either:                                 ┃
┃                                                                            ┃
┃ 1. The bash tool to run a command like `echo 'Hello World!' > hello.txt`   ┃
┃ 2. The editor tool to create a new file directly                           ┃
┃                                                                            ┃
┃ Since this is a simple task, I'll use the bash tool to create the file     ┃
┃ with a single command.                                                     ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                              Bash Command Execution                              
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Command: echo 'Hello World!' > hello.txt                                      ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Exit Code: 0                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━ Tool Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ Command executed successfully                                              ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

                              File Verification                              
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Command: cat hello.txt                                                        ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Output: Hello World!                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━ Claude's Response ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┃ I've created a new file called `hello.txt` with the content 'Hello         ┃
┃ World!' in it.                                                             ┃
┃                                                                            ┃
┃ The file was created successfully in your current directory. You can       ┃
┃ verify its contents by running:                                            ┃
┃                                                                            ┃
┃ ```                                                                        ┃
┃ cat hello.txt                                                              ┃
┃ ```                                                                        ┃
┃                                                                            ┃
┃ Which will display: Hello World!                                           ┃
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

[View Code](./agent_bash_and_editor_with_extended_thinking.py)

## Documentation

For more information on Claude 3.7 Sonnet and extended thinking, check out these resources:

- [Extended Thinking Tips for Complex STEM Problems](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips#complex-stem-problems)
- [Extended Thinking Documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
