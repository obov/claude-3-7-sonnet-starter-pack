#!/usr/bin/env ts-node

/**
 * Extended Thinking with Tool Use Example for Claude 3.7 Sonnet
 *
 * This script demonstrates how to combine extended thinking with tool use in Claude 3.7 Sonnet.
 * It implements a real weather API tool and a clothing recommendation tool that uses Claude.
 *
 * The weather tool fetches real-time data from the Open-Meteo API, and the clothing tool
 * uses Claude to generate personalized recommendations based on the weather conditions.
 *
 * Usage:
 *    npm run start:prompt-with-extended-thinking-tool-use -- --prompt "What's the weather in New York and what should I wear?" --max-tokens 2000 --thinking-budget-tokens 1024
 *    
 * Examples:
 *    npm run start:prompt-with-extended-thinking-tool-use -- --prompt "What's the weather in Minneapolis and what should I wear?" --max-tokens 2048 --thinking-budget-tokens 1024
 *    npm run start:prompt-with-extended-thinking-tool-use -- --prompt "How's the weather in San Francisco and what clothes do you recommend?" --max-tokens 2048 --thinking-budget-tokens 1024
 *    npm run start:prompt-with-extended-thinking-tool-use -- --prompt "What's the current weather in Sydney, Australia and what clothing is appropriate?" --max-tokens 2048 --thinking-budget-tokens 1024
 *    npm run start:prompt-with-extended-thinking-tool-use -- --prompt "Tell me about the weather in London today and suggest what I should wear for sightseeing" --max-tokens 2048 --thinking-budget-tokens 1024
 */

import * as dotenv from 'dotenv';
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolUseBlock, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import fetch from 'node-fetch';
import { ThinkingBlock, ExtendedMessageCreateParams, ExtendedMessage, CustomToolUseBlock } from './types';

// Extend the TableConstructorOptions interface to include the title property
declare module 'cli-table3' {
  interface TableConstructorOptions {
    title?: string;
  }
}

// Load environment variables from .env file
dotenv.config();

// Weather data interface
interface WeatherData {
  temperature: string | number;
  condition: string;
  humidity: string | number;
}

// Weather API response interfaces
interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
  }>;
}

interface WeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
}

/**
 * Get current weather for a location using Open-Meteo API
 *
 * @param location City name or location
 * @returns Weather data including temperature, condition, and humidity
 */
async function getWeather(location: string): Promise<WeatherData> {
  try {
    // Get coordinates for the location using geocoding API
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geoResponse = await fetch(geocodingUrl);
    const geoData = await geoResponse.json() as GeocodingResult;

    if (!geoData.results || geoData.results.length === 0) {
      return {
        temperature: 'Unknown',
        condition: 'Location not found',
        humidity: 'Unknown',
      };
    }

    // Extract coordinates
    const lat = geoData.results[0].latitude;
    const lon = geoData.results[0].longitude;

    // Get weather data using coordinates
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json() as WeatherResponse;

    // Extract current weather information
    const current = weatherData.current || {};

    // Convert weather code to condition string
    // Based on WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    const weatherCodes: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };

    const weatherCode = current.weather_code || 0;
    const condition = weatherCodes[weatherCode] || 'Unknown';

    return {
      temperature: current.temperature_2m ?? 'Unknown',
      condition: condition,
      humidity: `${current.relative_humidity_2m ?? 'Unknown'}%`,
    };
  } catch (e) {
    console.error(`Error fetching weather data: ${e instanceof Error ? e.message : String(e)}`);
    return {
      temperature: 'Error',
      condition: 'Service unavailable',
      humidity: 'Unknown',
    };
  }
}

/**
 * Get clothing recommendations based on weather conditions using Claude
 *
 * @param temperature Temperature in Celsius
 * @param conditions Weather conditions description
 * @returns Clothing recommendation
 */
async function getClothingRecommendation(temperature: number | string, conditions: string): Promise<string> {
  try {
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return "Unable to generate clothing recommendations (API key not found)";
    }

    // Initialize the Anthropic client
    const client = new Anthropic({
      apiKey,
    });

    // Convert temperature to number if it's a string
    const tempNum = typeof temperature === 'string' ? parseFloat(temperature) || 0 : temperature;
    
    // Convert Celsius to Fahrenheit for more familiar temperature range
    const tempF = (tempNum * 9 / 5) + 32;

    // Create prompt for Claude
    const prompt = `
    Please provide a brief clothing recommendation based on the following weather:
    - Temperature: ${temperature}°C (${tempF.toFixed(1)}°F)
    - Weather conditions: ${conditions}
    
    Keep your response concise (1-2 sentences) and focus only on what to wear.
    `;

    // Get recommendation from Claude
    const response = await client.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract and return the recommendation
    const textBlock = response.content[0] as TextBlock;
    const recommendation = textBlock.text.trim();
    return recommendation;

  } catch (e) {
    console.error(`Error generating clothing recommendation: ${e instanceof Error ? e.message : String(e)}`);
    return "Unable to generate clothing recommendations at this time.";
  }
}

async function main() {
  // Parse command line arguments
  program
    .description('Claude 3.7 Sonnet extended thinking with tool use example')
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

  // Define tools
  const weatherTool = {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object' as const,
      properties: { location: { type: 'string' } },
      required: ['location'],
    },
  };

  const clothingTool = {
    name: 'get_clothing_recommendation',
    description: 'Get clothing recommendations based on temperature and weather conditions',
    input_schema: {
      type: 'object' as const,
      properties: {
        temperature: { type: 'number' },
        conditions: { type: 'string' },
      },
      required: ['temperature', 'conditions'],
    },
  };

  // Display tool definitions
  console.log(chalk.magenta.bold('\n===== Weather Tool Definition =====\n'));
  console.log(JSON.stringify(weatherTool, null, 2));
  
  console.log(chalk.magenta.bold('\n===== Clothing Tool Definition =====\n'));
  console.log(JSON.stringify(clothingTool, null, 2));

  try {
    // Display request information
    console.log(
      chalk.green.bold('\n===== Request to Claude 3.7 Sonnet =====\n') +
      `${chalk.bold('Prompt:')} ${options.prompt}\n` +
      `${chalk.bold('Max Tokens:')} ${maxTokens}\n` +
      `${chalk.bold('Thinking Budget:')} ${thinkingBudget} tokens\n`
    );

    // First request - Claude responds with thinking and tool request
    const spinner = ora(`Sending request to Claude 3.7 Sonnet with ${thinkingBudget} thinking tokens...`).start();
    
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      },
      tools: [weatherTool, clothingTool],
      messages: [{ role: 'user', content: options.prompt }],
    } as ExtendedMessageCreateParams) as unknown as ExtendedMessage;
    
    spinner.stop();

    // Log the API response
    console.log(chalk.green.bold('\n===== API Response =====\n'));
    console.log(JSON.stringify(response, null, 2));

    // Extract thinking block
    const thinkingBlock = response.content.find(
      (block): block is ThinkingBlock => block.type === 'thinking' as any
    );

    if (thinkingBlock) {
      console.log(chalk.cyan.bold('\n===== Claude\'s Thinking Process =====\n'));
      console.log(thinkingBlock.thinking);
    }

    // Extract tool use block if present
    const toolUseBlock = response.content.find(
      (block): block is CustomToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlock) {
      // Create a table for tool use request
      const toolTable = new Table({
        head: [chalk.cyan('Parameter'), chalk.green('Value')],
        title: `Tool Use Request: ${toolUseBlock.name}`
      });
      
      // Assume input is an object with string keys
      for (const [key, value] of Object.entries(toolUseBlock.input as Record<string, unknown>)) {
        toolTable.push([key, String(value)]);
      }
      
      console.log(toolTable.toString());

      // Get real weather data
      if (toolUseBlock.name === 'get_weather') {
        const toolInput = toolUseBlock.input as { location?: string };
        const location = toolInput.location || 'Unknown';
        const weatherData = await getWeather(location);

        // Create a table for weather data
        const weatherTable = new Table({
          head: [chalk.cyan('Metric'), chalk.green('Value')],
          title: `Real Weather Data for ${location}`
        });
        
        for (const [key, value] of Object.entries(weatherData)) {
          weatherTable.push([
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          ]);
        }
        
        console.log(weatherTable.toString());

        // Send the tool result back to Claude
        console.log(chalk.green.bold(`\n===== Tool Result =====\n`));
        console.log(`Sending weather data for ${location} to Claude...`);

        const processingSpinner = ora('Processing tool result...').start();
        
        const continuation = await client.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: maxTokens,
          thinking: {
            type: 'enabled',
            budget_tokens: thinkingBudget,
          },
          tools: [weatherTool, clothingTool],
          messages: [
            { role: 'user', content: options.prompt },
            // Include the thinking block in the assistant's response
            {
              role: 'assistant',
              content: thinkingBlock ? [thinkingBlock, toolUseBlock] : [toolUseBlock],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUseBlock.id,
                  content: [
                    {
                      type: 'text',
                      text: `Temperature: ${weatherData.temperature}°C, Conditions: ${weatherData.condition}, Humidity: ${weatherData.humidity}`
                    }
                  ]
                },
              ],
            },
          ],
        } as ExtendedMessageCreateParams) as unknown as ExtendedMessage;
        
        processingSpinner.stop();

        // Check if there's another tool use in the continuation
        const secondToolUse = continuation.content.find(
          (block): block is CustomToolUseBlock => block.type === 'tool_use'
        );

        if (secondToolUse && secondToolUse.name === 'get_clothing_recommendation') {
          // Create a table for second tool use request
          const secondToolTable = new Table({
            head: [chalk.cyan('Parameter'), chalk.green('Value')],
            title: `Tool Use Request: ${secondToolUse.name}`
          });
          
          for (const [key, value] of Object.entries(secondToolUse.input as Record<string, unknown>)) {
            secondToolTable.push([key, String(value)]);
          }
          
          console.log(secondToolTable.toString());

          // Get real clothing recommendation using Claude
          const secondToolInput = secondToolUse.input as { temperature: number, conditions: string };
          const temperature = secondToolInput.temperature;
          const conditions = secondToolInput.conditions;

          const clothingRec = await getClothingRecommendation(temperature, conditions);

          // Display clothing recommendation
          console.log(chalk.magenta.bold('\n===== Clothing Recommendation =====\n'));
          console.log(clothingRec);

          // Send the second tool result back to Claude
          console.log(chalk.green.bold('\n===== Second Tool Result =====\n'));
          console.log('Sending clothing recommendation to Claude...');

          const finalSpinner = ora('Processing final response...').start();
          
          const finalResponse = await client.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: maxTokens,
            thinking: {
              type: 'enabled',
              budget_tokens: thinkingBudget,
            },
            tools: [weatherTool, clothingTool],
            messages: [
              { role: 'user', content: options.prompt },
              {
                role: 'assistant',
                content: thinkingBlock ? [thinkingBlock, toolUseBlock] : [toolUseBlock],
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: toolUseBlock.id,
                    content: [
                      {
                        type: 'text',
                        text: `Temperature: ${weatherData.temperature}°C, Conditions: ${weatherData.condition}, Humidity: ${weatherData.humidity}`
                      }
                    ]
                  }
                ],
              },
              { role: 'assistant', content: continuation.content },
              {
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: secondToolUse.id,
                    content: [
                      {
                        type: 'text',
                        text: clothingRec
                      }
                    ]
                  }
                ],
              },
            ],
          } as ExtendedMessageCreateParams) as unknown as ExtendedMessage;
          
          finalSpinner.stop();

          // Display Claude's final response
          const finalTextBlocks = finalResponse.content
            .filter((block): block is TextBlock => block.type === 'text');
          
          if (finalTextBlocks.length > 0) {
            console.log(chalk.blue.bold('\n===== Claude\'s Final Response =====\n'));
            console.log(finalTextBlocks.map(block => block.text).join('\n'));

            // Calculate approximate token usage
            // This is a rough approximation. For accurate token counting, use a tokenizer
            const estimateTokens = (text: string): number => {
              return Math.ceil(text.length / 4);
            };
            
            const promptTokens = estimateTokens(options.prompt);
            const thinkingTokens = thinkingBlock ? estimateTokens(thinkingBlock.thinking) : 0;
            const toolResultTokens = estimateTokens(
              `Temperature: ${weatherData.temperature}°C, Conditions: ${weatherData.condition}, Humidity: ${weatherData.humidity}`
            ) + estimateTokens(clothingRec);
            const responseTokens = finalTextBlocks.reduce(
              (sum: number, block: TextBlock) => sum + estimateTokens(block.text), 0
            );
            const totalTokens = promptTokens + thinkingTokens + toolResultTokens + responseTokens;

            // Calculate approximate costs (Claude 3.7 Sonnet pricing)
            const inputCost = (promptTokens + toolResultTokens) * (3.0 / 1000000);  // $3.00 per million tokens
            const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
            const thinkingCost = thinkingTokens * (15.0 / 1000000);  // $15.00 per million tokens (thinking tokens are billed as output)
            const totalCost = inputCost + outputCost + thinkingCost;

            // Display token usage summary
            const tokenTable = new Table({
              head: [chalk.cyan('Type'), chalk.magenta('Count'), chalk.green('Cost ($)')],
              title: 'Token Usage Summary'
            });

            tokenTable.push(
              ['Input Tokens', (promptTokens + toolResultTokens).toString(), `$${inputCost.toFixed(6)}`],
              ['Output Tokens', responseTokens.toString(), `$${outputCost.toFixed(6)}`],
              ['Thinking Tokens', thinkingTokens.toString(), `$${thinkingCost.toFixed(6)}`],
              ['Total', totalTokens.toString(), `$${totalCost.toFixed(6)}`]
            );

            console.log(tokenTable.toString());
          }
        } else {
          // Display Claude's response after the first tool use
          const textBlocks = continuation.content
            .filter((block): block is TextBlock => block.type === 'text');
          
          if (textBlocks.length > 0) {
            console.log(chalk.blue.bold('\n===== Claude\'s Response After Weather Tool =====\n'));
            console.log(textBlocks.map(block => block.text).join('\n'));
          }
        }
      } else {
        // Handle other tool types if needed
        console.log(chalk.yellow(`\nNote: Tool ${toolUseBlock.name} not implemented in this example\n`));
      }
    } else {
      // If no tool was used, just display the response
      const textBlocks = response.content
        .filter((block): block is TextBlock => block.type === 'text');
      
      if (textBlocks.length > 0) {
        console.log(chalk.yellow.bold('\n===== Claude\'s Response (No Tool Use) =====\n'));
        console.log(textBlocks.map(block => block.text).join('\n'));
      }
    }

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();