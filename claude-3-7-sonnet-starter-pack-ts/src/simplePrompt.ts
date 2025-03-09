#!/usr/bin/env ts-node

/**
 * Simple Prompt Example for Claude 3.7 Sonnet
 *
 * This script demonstrates basic usage of Claude 3.7 Sonnet without extended thinking.
 *
 * Usage:
 *    npm run start:simple-prompt -- --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?"
 *    npm run start:simple-prompt -- --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?" --max-tokens 1000
 */

import * as dotenv from 'dotenv';
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

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
    .description('Simple Claude 3.7 Sonnet prompt example')
    .requiredOption('--prompt <prompt>', 'The prompt to send to Claude')
    .option('--max-tokens <tokens>', 'Maximum number of tokens in the response', '1000');

  program.parse(process.argv);
  const options = program.opts<{
    prompt: string;
    maxTokens: string;
  }>();

  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(chalk.bold.red('Error:'), 'ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
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
      `${chalk.bold('Max Tokens:')} ${options.maxTokens}\n`
    );

    // Create a message with Claude 3.7 Sonnet
    const spinner = ora('Sending request to Claude 3.7 Sonnet...').start();
    
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: parseInt(options.maxTokens, 10),
      messages: [{ role: 'user', content: options.prompt }],
    });
    
    spinner.stop();

    // Display the response
    const textContent = response.content[0] as TextBlock;
    console.log(
      chalk.blue.bold('\n===== Claude 3.7 Sonnet Response =====\n') +
      `${textContent.text}\n`
    );

    // Calculate approximate token usage
    // This is a rough approximation. For accurate token counting, use a tokenizer
    const estimateTokens = (text: string): number => {
      // A better approximation than just splitting by spaces
      return Math.ceil(text.length / 4);
    };
    
    const promptTokens = estimateTokens(options.prompt);
    const responseTokens = estimateTokens(textContent.text);
    const totalTokens = promptTokens + responseTokens;

    // Calculate approximate costs (Claude 3.7 Sonnet pricing)
    const inputCost = promptTokens * (3.0 / 1000000);  // $3.00 per million tokens
    const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
    const totalCost = inputCost + outputCost;

    // Display token usage summary
    const tokenTable = new Table({
      head: [chalk.cyan('Type'), chalk.magenta('Count'), chalk.green('Cost ($)')],
      title: 'Token Usage Summary'
    });

    tokenTable.push(
      ['Input Tokens', promptTokens.toString(), `$${inputCost.toFixed(6)}`],
      ['Output Tokens', responseTokens.toString(), `$${outputCost.toFixed(6)}`],
      ['Total', totalTokens.toString(), `$${totalCost.toFixed(6)}`]
    );

    console.log(tokenTable.toString());

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();