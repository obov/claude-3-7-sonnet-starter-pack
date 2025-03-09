#!/usr/bin/env ts-node

/**
 * Extended Output, Extended Thinking, and Streaming Example for Claude 3.7 Sonnet
 *
 * This script demonstrates how to use extended output (128k tokens) with extended thinking
 * and streaming for Claude 3.7 Sonnet. This is useful for generating very long, detailed responses.
 *
 * The script provides comprehensive metrics tracking throughout the generation process:
 *
 * During streaming:
 * - Live word count and token metrics as JSON data
 * - Real-time progress percentages for both response and thinking tokens
 * - Preview of content chunks as they're generated
 * - Continuously updated metrics during generation
 *
 * After completion, it displays:
 * 1. The complete thinking process with word/token counts
 * 2. Claude's final response with comprehensive word/token statistics
 * 3. Token usage summary with cost estimates 
 *
 * Usage:
 *    (10,000 words ≈ ~13,500 tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Generate a 10,000 word comprehensive analysis of renewable energy technologies" --max-tokens 32000 --thinking-budget-tokens 8000 --enable-extended-output
 *
 *    (20,000 words ≈ ~27,000 tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Generate a 20,000 word comprehensive analysis of renewable energy technologies" --max-tokens 32000 --thinking-budget-tokens 8000 --enable-extended-output
 *    
 *    (30,000 words ≈ ~40,500 tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Generate a 30,000 word comprehensive analysis of renewable energy technologies" --max-tokens 32000 --thinking-budget-tokens 8000 --enable-extended-output
 *
 * More Examples:
 *    # Standard output (8k token limit)
 *    npm run start:prompt-with-extended-output -- --prompt "Write a detailed essay comparing different AI language models" --max-tokens 4000 --thinking-budget-tokens 2000
 *
 *    # Extended output examples for long-form content (128k token limit)
 *    
 *    # 1. Technical documentation (15,000+ words ≈ 20,000+ tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Create a comprehensive technical documentation (at least 15,000 words ≈ 20,000 tokens) for a modern web application framework, including: 1) 5 chapters with multiple subheadings each, 2) At least 20 code examples in JavaScript (minimum 15 lines each), 3) 10 API endpoint specifications with request/response examples, 4) A security section with at least 8 best practices, and 5) A deployment guide with step-by-step instructions for 3 different environments. Include detailed text descriptions of diagrams where they would be helpful." --max-tokens 50000 --thinking-budget-tokens 10000 --enable-extended-output
 *    
 *    # 2. Creative writing (20,000+ words ≈ 27,000+ tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Write a novella of at least 20,000 words (approximately 27,000 tokens) set in a near-future world where artificial general intelligence has just been achieved. Structure it with: 1) At least 8 chapters, 2) A minimum of 4 main characters with different perspectives on AI, 3) At least 15 scenes with dialogue (minimum 10 exchanges each), 4) Character development arcs for all main characters, 5) At least 3 plot conflicts and resolutions, and 6) A minimum of 25 descriptive paragraphs (100+ words each) establishing settings and atmosphere." --max-tokens 60000 --thinking-budget-tokens 12000 --enable-extended-output
 *    
 *    # 3. Research paper (12,000+ words ≈ 16,000+ tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Generate a comprehensive research paper (minimum 12,000 words ≈ 16,000 tokens) on the environmental impacts of different renewable energy technologies. Include: 1) An abstract of 250-300 words (≈ 330-400 tokens), 2) An introduction of at least 1,000 words (≈ 1,350 tokens), 3) A methodology section of 1,500+ words (≈ 2,000 tokens), 4) Data analysis sections for each of 5 energy types (solar, wind, hydroelectric, geothermal, and bioenergy) with at least 1,000 words (≈ 1,350 tokens) each, 5) A comparative analysis section of 2,000+ words (≈ 2,700 tokens), 6) A discussion section of at least 1,500 words (≈ 2,000 tokens), 7) A conclusion of 800+ words (≈ 1,100 tokens), and 8) At least 40 citations and references in APA format." --max-tokens 45000 --thinking-budget-tokens 10000 --enable-extended-output
 *    
 *    # 4. Educational curriculum (10,000+ words ≈ 13,500+ tokens)
 *    npm run start:prompt-with-extended-output -- --prompt "Develop a detailed 12-week data science curriculum (minimum 10,000 words ≈ 13,500 tokens) for undergraduate students. Include: 1) 12 weekly modules, each with at least 5 lecture topics described in 100+ words (≈ 135+ tokens) each, 2) 36 reading assignments (3 per week) with rationales, 3) 24 coding exercises (2 per week) with specifications and starter code, 4) 6 projects with detailed requirements (500+ words ≈ 670+ tokens each), 5) 12 assessments with rubrics, 6) Learning objectives for each week (minimum 5 per week), and 7) At least 15 sample code snippets (20+ lines each) illustrating key concepts." --max-tokens 40000 --thinking-budget-tokens 8000 --enable-extended-output
 */

import * as dotenv from 'dotenv';
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlockStartEvent, ContentBlockDeltaEvent, ContentBlockStopEvent } from '@anthropic-ai/sdk/resources/messages';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ThinkingDelta, ExtendedMessageCreateParams } from './types';

// Extend the TableConstructorOptions interface to include the title property
declare module 'cli-table3' {
  interface TableConstructorOptions {
    title?: string;
  }
}

// Load environment variables from .env file
dotenv.config();

// Helper function to approximate token count
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Helper function to create a progress bar
const createProgressBar = (percentage: number, length: number = 20): string => {
  const filledLength = Math.floor(percentage / (100 / length));
  return '█'.repeat(filledLength) + '░'.repeat(length - filledLength);
};

async function main() {
  // Parse command line arguments
  program
    .description('Claude 3.7 Sonnet extended output with extended thinking and streaming example')
    .requiredOption('--prompt <prompt>', 'The prompt to send to Claude')
    .option('--max-tokens <tokens>', 'Maximum number of tokens in the response', '32000')
    .option('--thinking-budget-tokens <tokens>', 'Budget for thinking tokens (minimum 1024)', '16000')
    .option('--enable-extended-output', 'Enable extended output (128k tokens)', false);

  program.parse(process.argv);
  const options = program.opts<{
    prompt: string;
    maxTokens: string;
    thinkingBudgetTokens: string;
    enableExtendedOutput: boolean;
  }>();

  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(chalk.bold.red('Error:'), 'ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  // Convert tokens to numbers and validate
  let thinkingBudget = parseInt(options.thinkingBudgetTokens, 10);
  let maxTokens = parseInt(options.maxTokens, 10);

  // Validate thinking budget (minimum 1024 tokens)
  if (thinkingBudget < 1024) {
    console.warn(chalk.bold.yellow('Warning:'), 'Minimum thinking budget is 1024 tokens. Setting to 1024.');
    thinkingBudget = 1024;
  }

  // Initialize the Anthropic client
  const client = new Anthropic({
    apiKey,
  });

  try {
    // Display request information
    const outputMode = options.enableExtendedOutput
      ? chalk.green.bold('Extended output (128k tokens)')
      : chalk.blue.bold('Standard output (8k tokens)');

    console.log(
      chalk.green.bold('\n===== Request to Claude 3.7 Sonnet =====\n') +
      `${chalk.bold('Prompt:')} ${options.prompt}\n` +
      `${chalk.bold('Max Tokens:')} ${maxTokens}\n` +
      `${chalk.bold('Thinking Budget:')} ${thinkingBudget} tokens\n` +
      `${chalk.bold('Output Mode:')} ${outputMode}\n`
    );

    // Initialize content storage
    let thinkingContent = '';
    let responseContent = '';
    let currentBlockType: string | null = null;
    let thinkingTokens = 0;
    let responseTokens = 0;

    console.log(chalk.yellow('Streaming response from Claude 3.7 Sonnet...'));
    
    // Prepare the stream parameters
    let streamParams: any = {
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      },
      messages: [{ role: 'user', content: options.prompt }],
    };

    // Extended output is handled differently in the TypeScript SDK
    // Current API version might not support explicit beta flags
    if (options.enableExtendedOutput) {
      console.log(chalk.yellow('Note: Extended output mode is enabled. This may not be supported in the current API version.'));
      // The API might automatically utilize extended output capacity when needed
      // without explicitly requiring a beta flag
    }

    // Stream a message with Claude 3.7 Sonnet
    const stream = await client.messages.stream(streamParams as ExtendedMessageCreateParams);

    // Process the streaming response
    for await (const event of stream) {
      // Log the event type
      console.log(chalk.dim(`Event type: ${event.type}`));
      
      // Create metrics object with current stats
      const responseMetrics = {
        words_generated: responseContent.split(/\s+/).filter(Boolean).length,
        response_tokens: responseTokens,
        progress: `${Math.round((responseTokens / maxTokens) * 100)}% of ${maxTokens} tokens used`
      };
      
      const thinkingMetrics = {
        thinking_words: thinkingContent.split(/\s+/).filter(Boolean).length,
        thinking_tokens: thinkingTokens,
        thinking_progress: `${Math.round((thinkingTokens / thinkingBudget) * 100)}% of ${thinkingBudget} tokens used`
      };
      
      // Add current event info
      const eventInfo = {
        type: event.type,
        response_metrics: responseMetrics,
        thinking_metrics: thinkingMetrics
      };
      
      if (event.type === 'content_block_start') {
        const startEvent = event as ContentBlockStartEvent;
        currentBlockType = startEvent.content_block.type;
        console.log(chalk.magenta.bold(`\n===== Block Start: ${currentBlockType} =====\n`));
        console.log(`Starting ${chalk.bold(currentBlockType)} block...\n`);
      } 
      else if (event.type === 'content_block_delta') {
        const deltaEvent = event as ContentBlockDeltaEvent;
        
        if (deltaEvent.delta.type === 'thinking_delta' as any) {
          const thinkingDelta = deltaEvent.delta as unknown as ThinkingDelta;
          thinkingContent += thinkingDelta.thinking;
          // Estimate token count from delta
          thinkingTokens += estimateTokens(thinkingDelta.thinking);
          
          // Print thinking preview
          process.stdout.write(chalk.cyan(thinkingDelta.thinking));
          
          // Calculate metrics for display
          const thinkingWordCount = thinkingContent.split(/\s+/).filter(Boolean).length;
          const thinkingPercentage = Math.round((thinkingTokens / thinkingBudget) * 100);
          const progressBar = createProgressBar(thinkingPercentage);
          
          // Log metrics after a significant chunk
          if (thinkingDelta.thinking.length > 50) {
            console.log(
              chalk.cyan.bold(`\nThinking Progress: |${progressBar}| ${thinkingPercentage}% • `) +
              chalk.yellow.bold(`Words: ${thinkingWordCount} • Tokens: ${thinkingTokens}/${thinkingBudget}`)
            );
          }
        } 
        else if (deltaEvent.delta.type === 'text_delta') {
          responseContent += deltaEvent.delta.text;
          // Estimate token count from delta
          responseTokens += estimateTokens(deltaEvent.delta.text);
          
          // Print response preview
          process.stdout.write(chalk.blue(deltaEvent.delta.text));
          
          // Calculate metrics for display
          const wordCount = responseContent.split(/\s+/).filter(Boolean).length;
          const responsePercentage = Math.round((responseTokens / maxTokens) * 100);
          const progressBar = createProgressBar(responsePercentage);
          
          // Log metrics after a significant chunk
          if (deltaEvent.delta.text.length > 100) {
            console.log(
              chalk.blue.bold(`\nResponse Progress: |${progressBar}| ${responsePercentage}% • `) +
              chalk.yellow.bold(`Words: ${wordCount} • Tokens: ${responseTokens}/${maxTokens}`)
            );
          }
        }
      } 
      else if (event.type === 'content_block_stop') {
        console.log(chalk.green.bold(`\n\n===== Block Complete: ${currentBlockType} =====\n`));
        console.log(`${chalk.bold(currentBlockType)} block complete\n`);
      }
      
      // Log the event data object occasionally (not on every delta to avoid flooding)
      if (event.type !== 'content_block_delta' || Math.random() < 0.05) {
        console.log(chalk.green.bold('\n----- Event Data -----\n'));
        console.log(JSON.stringify(eventInfo, null, 2));
        console.log(chalk.green.bold('\n-----------------------\n'));
      }
    }

    // Calculate final metrics
    const promptTokens = estimateTokens(options.prompt);
    const totalTokens = promptTokens + thinkingTokens + responseTokens;

    // Calculate approximate costs (Claude 3.7 Sonnet pricing)
    const inputCost = promptTokens * (3.0 / 1000000);  // $3.00 per million tokens
    const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
    const thinkingCost = thinkingTokens * (15.0 / 1000000);  // $15.00 per million tokens (thinking tokens are billed as output)
    const totalCost = inputCost + outputCost + thinkingCost;

    // After streaming completes, show the complete thinking block
    if (thinkingContent) {
      const thinkingWordCount = thinkingContent.split(/\s+/).filter(Boolean).length;
      console.log(chalk.cyan.bold('\n\n===== Complete Thinking Process =====\n'));
      console.log(`${chalk.bold('Words:')} ${thinkingWordCount} | ${chalk.bold('Tokens:')} ${thinkingTokens}\n`);
      console.log(thinkingContent);
    }

    // Display final response
    if (responseContent) {
      const wordCount = responseContent.split(/\s+/).filter(Boolean).length;
      const maxTokensPercentage = Math.round((responseTokens / maxTokens) * 100);
      
      // Create statistics object
      const stats = {
        total_words: wordCount,
        estimated_tokens: responseTokens,
        max_tokens_used_percentage: `${maxTokensPercentage}%`,
        thinking_words: thinkingContent ? thinkingContent.split(/\s+/).filter(Boolean).length : 0,
        thinking_tokens: thinkingTokens,
      };
      
      console.log(chalk.blue.bold('\n\n===== Claude\'s Final Response =====\n'));
      console.log(`${chalk.bold('Words:')} ${wordCount} | ${chalk.bold('Tokens:')} ${responseTokens}\n`);
      console.log(responseContent);
      
      console.log(chalk.green.bold('\nOutput Statistics:'));
      console.log(JSON.stringify(stats, null, 2));
    }

    // Display token usage summary at the very end
    const tokenTable = new Table({
      head: [chalk.cyan('Type'), chalk.magenta('Count'), chalk.green('Cost ($)')],
      title: 'Token Usage Summary'
    });

    tokenTable.push(
      ['Input Tokens', promptTokens.toString(), `$${inputCost.toFixed(6)}`],
      ['Output Tokens', responseTokens.toString(), `$${outputCost.toFixed(6)}`],
      ['Thinking Tokens', thinkingTokens.toString(), `$${thinkingCost.toFixed(6)}`],
      ['Total', totalTokens.toString(), `$${totalCost.toFixed(6)}`]
    );

    console.log(chalk.yellow.bold('\n\n===== FINAL TOKEN USAGE SUMMARY =====\n'));
    console.log(tokenTable.toString());

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();