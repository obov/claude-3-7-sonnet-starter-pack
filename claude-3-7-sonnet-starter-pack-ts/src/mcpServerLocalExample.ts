import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { createServer } from 'http';
// Note: We need to properly install the mcp package for this import to work
// This is a mock implementation for demo purposes
// The actual implementation would use: import { FastMCP } from 'mcp/server/fastmcp';
class FastMCP {
  private name: string;
  private tools: any[] = [];
  private resources: any[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addTool(tool: any) {
    this.tools.push(tool);
  }

  addResource(path: string, handler: any) {
    this.resources.push({ path, handler });
  }

  listen(server: any) {
    // In a real implementation, this would set up HTTP handlers
    console.log(`MCP server ${this.name} listening`);
  }
}

// Load environment variables
dotenv.config();

/**
 * Example demonstrating a local weather MCP server using the MCP TypeScript SDK.
 * 
 * This example shows how to:
 * 1. Create an MCP server that exposes weather-related tools
 * 2. Define tools for get-alerts and get-forecast
 * 3. Use the FastMCP framework for simplified MCP server development
 * 4. Integrate with Claude 3.7 Sonnet's tool calling with thinking blocks
 * 
 * === WHAT IS MODEL CONTEXT PROTOCOL (MCP)? ===
 * 
 * Model Context Protocol (MCP) is an open protocol that enables Large Language Models (LLMs) 
 * to access external tools and data sources. It follows a client-server architecture where:
 * 
 * - MCP Hosts: Programs like Claude Code CLI that want to access data through MCP
 * - MCP Clients: Protocol clients that maintain 1:1 connections with servers
 * - MCP Servers: Lightweight programs (like this example) that expose specific capabilities through MCP
 * - Data Sources: Either local data on your computer or remote services accessible via APIs
 * 
 * === QUICK START GUIDE ===
 * 
 * Add the MCP server to Claude Code:
 * ```bash
 * claude mcp add local-weather-mcp -- ts-node mcpServerLocalExample.ts
 * ```
 * 
 * Then start Claude Code:
 * ```bash
 * claude
 * ```
 * 
 * Usage in Claude Code:
 *     What's the weather in Germany right now?
 *     What's the weather in Germany, Chicago, and San Francisco?
 *     Get the weather in Germany, Minneapolis, Boston, Hong Kong, and San Francisco and output to weather.md in a markdown table.
 *     Get the weather in the top 10 US cities and output to weather.md in a markdown table.
 *     Warmest to coolest, list the temperature of the capital of US, Germany, India, UK, Canada, and China. Output to warmest_coldest_capitals.md in a markdown table.
 * 
 * To remove the MCP server:
 * ```bash
 * claude mcp remove local-weather-mcp
 * ```
 */

// Weather code mappings
const weatherCodes: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// TypeScript interfaces
interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  }>;
}

interface WeatherApiResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
}

interface WeatherData {
  temperature: number | string;
  temperature_c?: number | string;
  condition: string;
  humidity: string;
  alerts: string[];
}

/**
 * Get current weather for a location using Open-Meteo API
 */
async function getWeather(location: string): Promise<WeatherData> {
  try {
    // Get coordinates for the location using geocoding API
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geoResponse = await fetch(geocodingUrl);
    const geoData: GeocodingResult = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return {
        temperature: "Unknown",
        condition: "Location not found",
        humidity: "Unknown",
        alerts: [],
      };
    }

    // Extract coordinates
    const { latitude: lat, longitude: lon } = geoData.results[0];

    // Get weather data using coordinates
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData: WeatherApiResponse = await weatherResponse.json();

    // Extract current weather information
    const current = weatherData.current || {};

    // Get weather condition from code
    const weatherCode = current.weather_code || 0;
    const condition = weatherCodes[weatherCode] || "Unknown";

    // Generate alerts based on weather conditions
    const alerts: string[] = [];
    if (weatherCode >= 95) {
      alerts.push("Thunderstorm Warning");
    }
    if (weatherCode === 65 || weatherCode === 67 || weatherCode === 82) {
      alerts.push("Heavy Rain Warning");
    }
    if (weatherCode === 75 || weatherCode === 86) {
      alerts.push("Heavy Snow Warning");
    }
    if ([56, 57, 66, 67].includes(weatherCode)) {
      alerts.push("Freezing Precipitation Warning");
    }

    // Get temperature in Celsius and convert to Fahrenheit
    const tempC = current.temperature_2m;
    let tempF: number | string = "Unknown";
    
    if (typeof tempC === 'number') {
      tempF = (tempC * 9 / 5) + 32;
    }

    return {
      temperature: tempF,
      temperature_c: tempC,
      condition: condition,
      humidity: `${current.relative_humidity_2m || 'Unknown'}%`,
      alerts: alerts,
    };
  } catch (error) {
    console.error(`Error fetching weather data: ${error}`);
    return {
      temperature: "Error",
      temperature_c: "Error",
      condition: "Service unavailable",
      humidity: "Unknown",
      alerts: ["Weather service unavailable"],
    };
  }
}

// Interface for forecast return type
interface ForecastResult {
  temperature: number | string;
  conditions: string;
  humidity: string;
}

/**
 * Demonstrate how a client would interact with this MCP server
 */
async function demonstrateClientUsage() {
  let hasApiKey = false;
  
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const client = new Anthropic({ apiKey });
      hasApiKey = true;
    }
  } catch (error) {
    console.log("\n┌─────────────────── SIMULATED CLIENT EXAMPLE ───────────────────┐");
    console.log("│ Note: No Anthropic API key found or client available.          │");
    console.log("│ This is a simulation of how Claude would interact with this    │");
    console.log("│ MCP server.                                                    │");
    console.log("└────────────────────────────────────────────────────────────────┘");
  }

  // Simulate client interaction
  const location = "Paris";
  console.log(`User: What's the weather in ${location}?`);

  const thinkingContent = (
    "I need to get weather information for this location.\n" +
    "I'll use the weather API tools to get the forecast and any alerts."
  );
  
  console.log("\n┌─────────────────── Claude (thinking) ───────────────────────────┐");
  console.log(`│ ${thinkingContent.replace(/\n/g, '\n│ ')}                            │`);
  console.log("└────────────────────────────────────────────────────────────────┘");

  // Get actual data from our functions for the demo
  console.log("Fetching weather data...");
  const weatherData = await getWeather(location);
  const forecast: ForecastResult = {
    temperature: weatherData.temperature,
    conditions: weatherData.condition,
    humidity: weatherData.humidity,
  };
  const alerts = weatherData.alerts;

  // Display weather table
  console.log("\n┌─────────────────── Weather Data for " + location + " ───────────────────┐");
  console.log(`│ Temperature: ${typeof forecast.temperature === 'number' ? forecast.temperature.toFixed(1) : forecast.temperature}°F ${
    typeof weatherData.temperature_c === 'number' ? `(${weatherData.temperature_c.toFixed(1)}°C)` : ''
  } │`);
  console.log(`│ Conditions:  ${forecast.conditions.padEnd(45)} │`);
  console.log(`│ Humidity:    ${forecast.humidity.padEnd(45)} │`);
  console.log(`│ Alerts:      ${alerts.length ? alerts.join(", ").padEnd(45) : "None".padEnd(45)} │`);
  console.log("└────────────────────────────────────────────────────────────────┘");

  // Claude's response
  let response = `The current weather in ${location} is ${forecast.conditions.toLowerCase()} `;
  response += `with a temperature of ${
    typeof forecast.temperature === 'number' ? forecast.temperature.toFixed(1) : forecast.temperature
  }°F and humidity of ${forecast.humidity}. `;

  if (alerts.length > 0) {
    response += `There are active weather alerts for ${location}: ${alerts.join(', ')}. `;
    response += "Please take necessary precautions if you're in the area.";
  } else {
    response += `There are no active weather alerts for ${location}.`;
  }

  console.log("\n┌─────────────────── Claude's Response ───────────────────────────┐");
  console.log(`│ ${response.replace(/(.{1,70})/g, "$1\n").trim().replace(/\n/g, '\n│ ')} │`);
  console.log("└────────────────────────────────────────────────────────────────┘");
}

/**
 * Creates and runs the MCP server
 */
function runMcpServer() {
  // Create the MCP server
  const mcp = new FastMCP("Weather API");

  // Define tools
  mcp.addTool({
    name: 'get_forecast',
    description: 'Get weather forecast for a location',
    parameters: {
      location: {
        type: 'string',
        description: 'City name or location for the forecast',
      },
    },
    async handler({ location }: { location: string }): Promise<ForecastResult> {
      console.log(`Received request: Get weather forecast for ${location}`);
      const weatherData = await getWeather(location);
      return {
        temperature: weatherData.temperature,
        conditions: weatherData.condition,
        humidity: weatherData.humidity,
      };
    },
  });

  mcp.addTool({
    name: 'get_alerts',
    description: 'Get weather alerts for a location',
    parameters: {
      location: {
        type: 'string',
        description: 'City name or location to check for weather alerts',
      },
    },
    async handler({ location }: { location: string }): Promise<string[]> {
      console.log(`Received request: Get weather alerts for ${location}`);
      const weatherData = await getWeather(location);
      return weatherData.alerts;
    },
  });

  // Define resource
  mcp.addResource('weather://{location}/current', {
    async handler({ location }: { location: string }): Promise<string> {
      console.log(`Received request: Get current weather resource for ${location}`);
      const weatherData = await getWeather(location);
      const alertsText = weatherData.alerts.length 
        ? `\nActive alerts: ${weatherData.alerts.join(', ')}` 
        : '';

      // Format temperature display with both units
      let tempDisplay: string;
      if (
        typeof weatherData.temperature_c === 'number' &&
        typeof weatherData.temperature === 'number'
      ) {
        tempDisplay = `${weatherData.temperature_c.toFixed(1)}°C (${weatherData.temperature.toFixed(1)}°F)`;
      } else {
        tempDisplay = `${weatherData.temperature}°F`;
      }

      return `
Current weather for ${location}:
Temperature: ${tempDisplay}
Conditions: ${weatherData.condition}
Humidity: ${weatherData.humidity}${alertsText}
`;
    },
  });

  // Display server info
  console.log("\n┌─────────────────── WEATHER MCP SERVER ───────────────────────────┐");
  console.log("│ Server capabilities:                                            │");
  console.log("│ - get_forecast: Get weather forecast for a location             │");
  console.log("│ - get_alerts: Get weather alerts for a location                 │");
  console.log("│ - weather://{location}/current: Resource for current weather    │");
  console.log("│                                                                 │");
  console.log("│ Quick setup:                                                    │");
  console.log("│ 1. In Claude Code: claude mcp add local-weather-mcp -- ts-node  │");
  console.log("│    mcpServerLocalExample.ts                                     │");
  console.log("│ 2. Ask about weather: \"What's the weather in Tokyo?\"            │");
  console.log("│                                                                 │");
  console.log("│ Server is running. Press Ctrl+C to stop.                        │");
  console.log("└────────────────────────────────────────────────────────────────┘");

  // Create HTTP server
  const httpServer = createServer();
  
  // Start MCP server
  mcp.listen(httpServer);
  httpServer.listen(0); // Use any available port
  
  const address = httpServer.address();
  if (address && typeof address !== 'string') {
    console.log(`Server listening on port ${address.port}`);
  }
  
  return httpServer;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const clientMode = args.includes('--client');

  if (clientMode) {
    await demonstrateClientUsage();
  } else {
    const server = runMcpServer();
    
    // Handle Ctrl+C to shut down gracefully
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    });
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { getWeather, demonstrateClientUsage };