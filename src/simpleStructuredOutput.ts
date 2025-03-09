#!/usr/bin/env ts-node

/**
 * Simple Structured Output Example for Claude 3.7 Sonnet
 *
 * This script demonstrates how to get structured JSON output from Claude 3.7 Sonnet.
 *
 * Usage:
 *    npm run start:simple-structured-output -- --prompt "Analyze this customer feedback: Great buy, I'm happy with my purchase."
 *    npm run start:simple-structured-output -- --prompt "Analyze this customer feedback: 'I've been a loyal user for 3 years, but the recent UI update is a disaster.'"
 *    npm run start:simple-structured-output -- --prompt "Analyze this customer feedback: 'I've been a loyal user for 3 years, but the recent UI update is a disaster.'" --max-tokens 1000
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

// Define the expected response structure
interface FeedbackAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  key_issues: string[];
  action_items: Array<{
    team: string;
    task: string;
  }>;
}

async function main() {
  // Parse command line arguments
  program
    .description('Claude 3.7 Sonnet structured output example')
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

  // Construct the system prompt to request JSON output
  const systemPrompt = `You're a Customer Insights AI. Analyze the user's feedback and output in JSON format with keys: 
{
    "sentiment": (positive/negative/neutral),
    "key_issues": (list),
    "action_items": (list of dicts with "team" and "task") - create action items for our team to address the key issues
}

Your response should be valid JSON only, with no additional text.`;

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
      system: systemPrompt,
      messages: [{ role: 'user', content: options.prompt }],
    });
    
    spinner.stop();

    // Get the text response
    const textBlock = response.content[0] as TextBlock;
    const textResponse = textBlock.text;

    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(textResponse);
      
      // Validate the structure matches our expected interface
      const isValidFeedbackAnalysis = (data: unknown): data is FeedbackAnalysis => {
        if (!data || typeof data !== 'object') return false;
        
        const feedback = data as Partial<FeedbackAnalysis>;
        return (
          (feedback.sentiment === 'positive' || 
           feedback.sentiment === 'negative' || 
           feedback.sentiment === 'neutral') &&
          Array.isArray(feedback.key_issues) &&
          Array.isArray(feedback.action_items) &&
          feedback.action_items.every(item => 
            typeof item === 'object' && 
            item !== null && 
            'team' in item && 
            'task' in item
          )
        );
      };
      
      if (!isValidFeedbackAnalysis(jsonResponse)) {
        throw new Error('Invalid response structure');
      }

      // Create a table to display the sentiment
      const sentimentTable = new Table({
        head: [chalk.cyan('Sentiment')],
        title: 'Customer Feedback Analysis'
      });
      
      sentimentTable.push([jsonResponse.sentiment || 'Unknown']);
      console.log(sentimentTable.toString());

      // Display the full JSON response
      console.log(
        chalk.blue.bold('\n===== Structured JSON Response =====\n') +
        `${JSON.stringify(jsonResponse, null, 2)}\n`
      );

      // Create a table for action items if present
      if (jsonResponse.action_items && jsonResponse.action_items.length > 0) {
        const actionTable = new Table({
          head: [chalk.magenta('Team'), chalk.green('Task')],
          title: 'Action Items'
        });

        for (const item of jsonResponse.action_items) {
          actionTable.push([
            item.team || 'Unknown',
            item.task || 'Unknown'
          ]);
        }

        console.log(actionTable.toString());
      }

      // Calculate approximate token usage
      // This is a rough approximation. For accurate token counting, use a tokenizer
      const estimateTokens = (text: string): number => {
        // A better approximation than just splitting by spaces
        return Math.ceil(text.length / 4);
      };
      
      const promptTokens = estimateTokens(options.prompt);
      const responseTokens = estimateTokens(textResponse);
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

    } catch (jsonError) {
      // If not valid JSON, just print the raw response
      console.log(
        chalk.yellow.bold('\n===== Raw Response (Invalid JSON) =====\n') +
        textResponse + '\n'
      );

      // Still calculate token usage even for invalid JSON
      // This is a rough approximation. For accurate token counting, use a tokenizer
      const estimateTokens = (text: string): number => {
        // A better approximation than just splitting by spaces
        return Math.ceil(text.length / 4);
      };
      
      const promptTokens = estimateTokens(options.prompt);
      const responseTokens = estimateTokens(textResponse);
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
    }

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();