#!/usr/bin/env ts-node

/**
 * Extended Thinking Example for Claude 3.7 Sonnet
 *
 * This script demonstrates basic extended thinking capabilities of Claude 3.7 Sonnet.
 * It allows you to set a thinking budget to improve Claude's reasoning on complex tasks.
 *
 * Usage:
 *    npm run start:prompt-with-extended-thinking -- --prompt "Explain quantum computing to me" --max-tokens 2048 --thinking-budget-tokens 1024
 */

import * as dotenv from 'dotenv';
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ThinkingBlock, ExtendedMessageCreateParams, ExtendedMessage } from './types';

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
    .description('Claude 3.7 Sonnet extended thinking example')
    .requiredOption('--prompt <prompt>', 'The prompt to send to Claude')
    .option('--max-tokens <tokens>', 'Maximum number of tokens in the response', '2000')
    .option('--thinking-budget-tokens <tokens>', 'Budget for thinking tokens (minimum 1024)', '8000');

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

    // Create a message with Claude 3.7 Sonnet using extended thinking
    const spinner = ora(`Sending request to Claude 3.7 Sonnet with ${thinkingBudget} thinking tokens...`).start();
    
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      },
      messages: [{ role: 'user', content: options.prompt }],
    } as ExtendedMessageCreateParams) as unknown as ExtendedMessage;
    
    spinner.stop();

    // Log the API response
    console.log(
      chalk.green.bold('\n===== API Response =====\n') +
      JSON.stringify(response, null, 2) + '\n'
    );

    // Extract and display the thinking block if present
    const thinkingBlocks = response.content
      .filter((block): block is ThinkingBlock => block.type === 'thinking' as any);
    
    if (thinkingBlocks.length > 0) {
      console.log(
        chalk.cyan.bold('\n===== Claude\'s Thinking Process =====\n') +
        thinkingBlocks[0].thinking + '\n'
      );
    }

    // Display the text response
    const textBlocks = response.content
      .filter((block): block is TextBlock => block.type === 'text');
    
    if (textBlocks.length > 0) {
      console.log(
        chalk.blue.bold('\n===== Claude\'s Response =====\n') +
        textBlocks[0].text + '\n'
      );

      // Calculate approximate token usage
      // This is a rough approximation. For accurate token counting, use a tokenizer
      const estimateTokens = (text: string): number => {
        // A better approximation than just splitting by spaces
        return Math.ceil(text.length / 4);
      };
      
      const promptTokens = estimateTokens(options.prompt);
      const thinkingTokens = thinkingBlocks.length > 0 ? estimateTokens(thinkingBlocks[0].thinking) : 0;
      const responseTokens = estimateTokens(textBlocks[0].text);
      const totalTokens = promptTokens + thinkingTokens + responseTokens;

      // Calculate approximate costs (Claude 3.7 Sonnet pricing)
      const inputCost = promptTokens * (3.0 / 1000000);  // $3.00 per million tokens
      const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
      const thinkingCost = thinkingTokens * (15.0 / 1000000);  // $15.00 per million tokens (thinking tokens are billed as output)
      const totalCost = inputCost + outputCost + thinkingCost;

      // Display token usage summary
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

      console.log(tokenTable.toString());
    }

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();