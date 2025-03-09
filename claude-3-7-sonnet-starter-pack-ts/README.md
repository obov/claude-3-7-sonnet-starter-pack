# Claude 3.7 Sonnet Starter Pack (TypeScript)

This is a TypeScript version of the Claude 3.7 Sonnet Starter Pack, designed to help you quickly get started with building applications using Claude 3.7 Sonnet.

## Features

- Simple prompt examples
- Structured output examples
- Tool use with real-world weather API integration
- Extended thinking capabilities
- Streaming API support
- Extended output (128k tokens) support
- Token usage and cost calculation

## Prerequisites

- Node.js 16+
- TypeScript 5.0+
- Anthropic API Key

## Setup

1. Clone this repository:

```bash
git clone https://your-repo-url/claude-3-7-sonnet-starter-pack-ts.git
cd claude-3-7-sonnet-starter-pack-ts
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your Anthropic API key:

```bash
cp .env.example .env
# Then edit .env and add your API key
```

## Examples

### Simple Prompt

A basic example of sending a prompt to Claude 3.7 Sonnet and receiving a response.

```bash
npm run start:simple-prompt -- --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?"
```

Optional parameters:
- `--max-tokens <number>` (default: 1000)

### Structured Output

Get structured JSON output from Claude 3.7 Sonnet for customer feedback analysis.

```bash
npm run start:simple-structured-output -- --prompt "Analyze this customer feedback: Great buy, I'm happy with my purchase."
```

Optional parameters:
- `--max-tokens <number>` (default: 1000)

### Tool Use

Example showing how to use Claude 3.7 Sonnet with tools, in this case a weather API.

```bash
npm run start:simple-tool-use -- --prompt "What's the weather in Paris?"
```

Optional parameters:
- `--max-tokens <number>` (default: 1000)

### Extended Thinking

Use Claude's extended thinking capabilities for better reasoning on complex tasks.

```bash
npm run start:prompt-with-extended-thinking -- --prompt "Explain quantum computing to me" --max-tokens 2048 --thinking-budget-tokens 1024
```

Optional parameters:
- `--max-tokens <number>` (default: 2000)
- `--thinking-budget-tokens <number>` (default: 8000)

### Extended Thinking with Streaming

Stream Claude's extended thinking responses in real-time as they are generated.

```bash
npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "What is the expected number of coin flips needed to get 3 heads in a row?" --max-tokens 3000 --thinking-budget-tokens 2000
```

Optional parameters:
- `--max-tokens <number>` (default: 2000)
- `--thinking-budget-tokens <number>` (default: 4000)

### Extended Thinking with Tool Use

Combine extended thinking with tool use for Claude to reason through weather-related tasks.

```bash
npm run start:prompt-with-extended-thinking-tool-use -- --prompt "What's the weather in New York and what should I wear?" --max-tokens 2000 --thinking-budget-tokens 1024
```

Optional parameters:
- `--max-tokens <number>` (default: 2000)
- `--thinking-budget-tokens <number>` (default: 8000)

### Extended Output with Extended Thinking and Streaming

Generate very long, detailed responses with comprehensive metrics tracking throughout the generation process.

```bash
npm run start:prompt-with-extended-output -- --prompt "Generate a 10,000 word comprehensive analysis of renewable energy technologies" --max-tokens 32000 --thinking-budget-tokens 8000 --enable-extended-output
```

Optional parameters:
- `--max-tokens <number>` (default: 32000)
- `--thinking-budget-tokens <number>` (default: 16000)
- `--enable-extended-output` (flag to enable 128k token output support)

## Cost Information

These examples include token usage calculations and estimated costs based on current Claude 3.7 Sonnet pricing:
- Input tokens: $3.00 per million tokens
- Output tokens: $15.00 per million tokens
- Thinking tokens: $15.00 per million tokens (billed as output)

## Working with TypeScript

This project uses:
- TypeScript for static type checking
- `ts-node` for running TypeScript files directly
- Commander.js for command-line argument parsing
- dotenv for environment variable management
- chalk and cli-table3 for terminal formatting

## Migrated from Python

This starter pack is a TypeScript version of the original [Claude 3.7 Sonnet Python Starter Pack](https://github.com/anthropics/claude-3-7-sonnet-examples). Most examples have been fully migrated, with some advanced examples like agent support and MCP server integration requiring further adaptation due to specialized requirements.

## License

[MIT License](LICENSE)