#!/usr/bin/env ts-node

/**
 * Simple Tool Use Example for Claude 3.7 Sonnet
 *
 * This script demonstrates how to use Claude 3.7 Sonnet with tool calling.
 * It implements a real weather tool that uses the Open-Meteo API to fetch current weather data.
 *
 * Usage:
 *    npm run start:simple-tool-use -- --prompt "What's the weather in Paris?"
 *    
 * Examples:
 *    npm run start:simple-tool-use -- --prompt "What's the weather in Minneapolis?"
 *    npm run start:simple-tool-use -- --prompt "What's the weather in San Francisco?"
 *    npm run start:simple-tool-use -- --prompt "What's the weather in New York?"
 *    npm run start:simple-tool-use -- --prompt "What's the weather in Chicago?"
 */

import * as dotenv from 'dotenv';
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolUseBlock, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import fetch from 'node-fetch';

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

async function main() {
  // Parse command line arguments
  program
    .description('Claude 3.7 Sonnet tool use example')
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

  // Define a simple weather tool
  const weatherTool = {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: "object" as const,
      properties: { location: { type: 'string' } },
      required: ['location'],
    },
  };

  // Display tool definition
  console.log(
    chalk.magenta.bold('\n===== Weather Tool Definition =====\n') +
    JSON.stringify(weatherTool, null, 2) + '\n'
  );

  try {
    // Display request information
    console.log(
      chalk.green.bold('\n===== Request to Claude 3.7 Sonnet =====\n') +
      `${chalk.bold('Prompt:')} ${options.prompt}\n` +
      `${chalk.bold('Max Tokens:')} ${options.maxTokens}\n`
    );

    // First request - Claude responds with tool request
    const spinner = ora('Sending initial request to Claude 3.7 Sonnet...').start();
    
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: parseInt(options.maxTokens, 10),
      tools: [weatherTool],
      messages: [{ role: 'user', content: options.prompt }],
    });
    
    spinner.stop();

    // Check if there's a tool use in the response
    const toolUseBlocks = response.content
      .filter((block): block is ToolUseBlock => block.type === 'tool_use');

    if (toolUseBlocks.length > 0) {
      const toolUse = toolUseBlocks[0];

      // Create a table for tool use request
      const toolTable = new Table({
        head: [chalk.cyan('Tool Name'), chalk.green('Input Parameters')],
        title: 'Tool Use Request'
      });
      
      toolTable.push([
        toolUse.name, 
        JSON.stringify(toolUse.input, null, 2)
      ]);
      
      console.log(toolTable.toString());

      // Get real weather data
      const toolInput = toolUse.input as { location?: string };
      const location = toolInput && toolInput.location ? toolInput.location : 'Unknown';
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
      console.log(chalk.green.bold('\n===== Tool Result =====\n') +
                  'Sending tool result back to Claude...\n');

      const processingSpinner = ora('Processing tool result...').start();
      
      const continuation = await client.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: parseInt(options.maxTokens, 10),
        tools: [weatherTool],
        messages: [
          { role: 'user', content: options.prompt },
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: [
                  {
                    type: 'text',
                    text: `Temperature: ${weatherData.temperature}°C, Condition: ${weatherData.condition}, Humidity: ${weatherData.humidity}`
                  }
                ]
              },
            ],
          },
        ],
      });
      
      processingSpinner.stop();

      // Display Claude's final response
      const textBlocks = continuation.content
        .filter((block): block is { type: 'text', text: string } => 
          block.type === 'text' && 'text' in block)
        .map(block => block.text);
      
      if (textBlocks.length > 0) {
        console.log(
          chalk.blue.bold('\n===== Claude\'s Final Response =====\n') +
          textBlocks.join('\n') + '\n'
        );

        // Calculate approximate token usage
        // This is a rough approximation. For accurate token counting, use a tokenizer
        const estimateTokens = (text: string): number => {
          // A better approximation than just splitting by spaces
          return Math.ceil(text.length / 4);
        };
        
        const promptTokens = estimateTokens(options.prompt);
        const toolResultTokens = estimateTokens(
          `Temperature: ${weatherData.temperature}°C, Condition: ${weatherData.condition}, Humidity: ${weatherData.humidity}`
        );
        const responseTokens = estimateTokens(textBlocks.join(' '));
        const totalTokens = promptTokens + toolResultTokens + responseTokens;

        // Calculate approximate costs (Claude 3.7 Sonnet pricing)
        const inputCost = (promptTokens + toolResultTokens) * (3.0 / 1000000);  // $3.00 per million tokens
        const outputCost = responseTokens * (15.0 / 1000000);  // $15.00 per million tokens
        const totalCost = inputCost + outputCost;

        // Display token usage summary
        const tokenTable = new Table({
          head: [chalk.cyan('Type'), chalk.magenta('Count'), chalk.green('Cost ($)')],
          title: 'Token Usage Summary'
        });

        tokenTable.push(
          ['Input Tokens', (promptTokens + toolResultTokens).toString(), `$${inputCost.toFixed(6)}`],
          ['Output Tokens', responseTokens.toString(), `$${outputCost.toFixed(6)}`],
          ['Total', totalTokens.toString(), `$${totalCost.toFixed(6)}`]
        );

        console.log(tokenTable.toString());
      }
    } else {
      // If no tool was used, just display the response
      const textBlocks = response.content
        .filter((block): block is { type: 'text', text: string } => 
          block.type === 'text' && 'text' in block)
        .map(block => block.text);
      
      if (textBlocks.length > 0) {
        console.log(
          chalk.yellow.bold('\n===== Claude\'s Response (No Tool Use) =====\n') +
          textBlocks.join('\n') + '\n'
        );

        // Calculate approximate token usage
        // This is a rough approximation. For accurate token counting, use a tokenizer
        const estimateTokens = (text: string): number => {
          // A better approximation than just splitting by spaces
          return Math.ceil(text.length / 4);
        };
        
        const promptTokens = estimateTokens(options.prompt);
        const responseTokens = estimateTokens(textBlocks.join(' '));
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
    }

  } catch (error) {
    console.error(chalk.bold.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();