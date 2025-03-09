#!/usr/bin/env ts-node

/**
 * Extended Thinking with Streaming Example for Claude 3.7 Sonnet
 *
 * This script demonstrates how to stream extended thinking responses from Claude 3.7 Sonnet.
 * It allows you to see Claude's thinking process in real-time as it happens, and displays the 
 * complete thinking process for reference after the streaming is complete.
 *
 * Usage:
 *    (answer is 489.24)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "What is 27 * 453 / 5 * 0.2?" --max-tokens 4000 --thinking-budget-tokens 2000
 *
 *    # (Answer: B is telling the truth)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "Solve this logic puzzle: A says that B is lying. B says that C is lying. C says that A and B are both lying. Who is telling the truth?" --max-tokens 3000 --thinking-budget-tokens 2000
 *    
 *    # (Answer: 5 cats)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "If 5 cats can catch 5 mice in 5 minutes, how many cats would be needed to catch 100 mice in 100 minutes?" --max-tokens 3000 --thinking-budget-tokens 2000
 *    
 *    # (Answer: approximately 5.2 units)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "Imagine a square with side length 10. If you randomly select two points inside the square, what is the expected value of the distance between them?" --max-tokens 3000 --thinking-budget-tokens 2000
 *    
 *    # (Answer: 40,320 ways, which is 8!)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "In how many ways can 8 rooks be placed on an 8×8 chessboard so that no two rooks attack each other?" --max-tokens 3000 --thinking-budget-tokens 2000
 *    
 *    # (Answer: 14 flips on average)
 *    npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "What is the expected number of coin flips needed to get 3 heads in a row?" --max-tokens 3000 --thinking-budget-tokens 2000
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

async function main() {
  // Parse command line arguments
  program
    .description('Claude 3.7 Sonnet extended thinking with streaming example')
    .requiredOption('--prompt <prompt>', 'The prompt to send to Claude')
    .option('--max-tokens <tokens>', 'Maximum number of tokens in the response', '2000')
    .option('--thinking-budget-tokens <tokens>', 'Budget for thinking tokens (minimum 1024)', '4000');

  program.parse(process.argv);
  const options = program.opts<{
    prompt: string;
    maxTokens: string;
    thinkingBudgetTokens: string;
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

  // Ensure max_tokens is greater than thinking_budget_tokens
  if (maxTokens <= thinkingBudget) {
    const newMaxTokens = thinkingBudget + 1000;
    console.warn(chalk.bold.yellow('Warning:'), `max-tokens must be greater than thinking-budget-tokens. Setting max-tokens to ${newMaxTokens}.`);
    maxTokens = newMaxTokens;
  }

  // Initialize the Anthropic client
  const client = new Anthropic({
    apiKey,
  });

  try {
    // Display request information
    console.log(
      chalk.green.bold('\n===== Request to Claude 3.7 Sonnet =====\n') +
      `${chalk.bold('Prompt:')} ${options.prompt}\n` +
      `${chalk.bold('Max Tokens:')} ${maxTokens}\n` +
      `${chalk.bold('Thinking Budget:')} ${thinkingBudget} tokens\n`
    );

    // Initialize content storage
    let thinkingContent = '';
    let responseContent = '';
    let currentBlockType: string | null = null;
    let thinkingTokens = 0;
    let responseTokens = 0;

    console.log(chalk.yellow('Streaming response from Claude 3.7 Sonnet...'));
    
    // Stream a message with Claude 3.7 Sonnet using extended thinking
    const stream = await client.messages.stream({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      },
      messages: [{ role: 'user', content: options.prompt }],
    } as ExtendedMessageCreateParams);

    // Process the streaming response
    for await (const event of stream) {
      // Log event type
      console.log(chalk.dim(`Event type: ${event.type}`));
      
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
          // Rough token count estimation
          thinkingTokens += Math.ceil(thinkingDelta.thinking.length / 4);
          // Update the display with thinking content
          process.stdout.write(chalk.cyan(thinkingDelta.thinking));
        } 
        else if (deltaEvent.delta.type === 'text_delta') {
          responseContent += deltaEvent.delta.text;
          // Rough token count estimation
          responseTokens += Math.ceil(deltaEvent.delta.text.length / 4);
          // Update the display with response content
          process.stdout.write(chalk.blue(deltaEvent.delta.text));
        }
      } 
      else if (event.type === 'content_block_stop') {
        const stopEvent = event as ContentBlockStopEvent;
        console.log(chalk.green.bold(`\n\n===== Block Complete: ${currentBlockType} =====\n`));
        console.log(`${chalk.bold(currentBlockType)} block complete\n`);
      }
    }

    // Calculate approximate token usage
    const estimateTokens = (text: string): number => {
      return Math.ceil(text.length / 4);
    };
    
    const promptTokens = estimateTokens(options.prompt);
    const totalTokens = promptTokens + thinkingTokens + responseTokens;

    // Calculate approximate costs (Claude 3.7 Sonnet pricing)
    const inputCost = promptTokens * (3.0 / 1000000);  // $3.00 per million tokens
    const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
    const thinkingCost = thinkingTokens * (15.0 / 1000000);  // $15.00 per million tokens (thinking tokens are billed as output)
    const totalCost = inputCost + outputCost + thinkingCost;

    // After streaming completes, show the complete thinking block
    if (thinkingContent) {
      console.log(chalk.cyan.bold('\n\n===== Complete Thinking Process =====\n'));
      console.log(thinkingContent);
    }

    // Display final response
    if (responseContent) {
      console.log(chalk.blue.bold('\n\n===== Claude\'s Final Response =====\n'));
      console.log(responseContent);
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

    console.log('\n' + tokenTable.toString());

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();