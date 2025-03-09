import { Anthropic } from '@anthropic-ai/sdk';
// Use any types to avoid SDK incompatibilities
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Initialize the Anthropic client
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

// Global variable for bash environment
let currentBashEnv = { ...process.env };

// Root path to replace with current working directory
const rootPathToReplaceWithCwd = '/repo';

// Agent prompt template
const AGENT_PROMPT = `<purpose>
    You are an expert integration assistant that can both edit files and execute bash commands.
</purpose>

<instructions>
    <instruction>Use the tools provided to accomplish file editing and bash command execution as needed.</instruction>
    <instruction>When you have completed the user's task, call complete_task to finalize the process.</instruction>
    <instruction>Provide reasoning with every tool call.</instruction>
    <instruction>When constructing paths use /repo to start from the root of the repository. We'll replace it with the current working directory.</instruction>
</instructions>

<tools>
    <tool>
        <n>view_file</n>
        <description>View the content of a file</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Why you are viewing the file</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>path</n>
                <type>string</type>
                <description>Path of the file to view</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>create_file</n>
        <description>Create a new file with given content</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Why the file is being created</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>path</n>
                <type>string</type>
                <description>Path where to create the file</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>file_text</n>
                <type>string</type>
                <description>Content for the new file</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>str_replace</n>
        <description>Replace text in a file</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Explain why the replacement is needed</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>path</n>
                <type>string</type>
                <description>File path</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>old_str</n>
                <type>string</type>
                <description>The string to be replaced</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>new_str</n>
                <type>string</type>
                <description>The replacement string</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>insert_line</n>
        <description>Insert text at a specific line in a file</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Reason for inserting the text</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>path</n>
                <type>string</type>
                <description>File path</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>insert_line</n>
                <type>integer</type>
                <description>Line number for insertion</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>new_str</n>
                <type>string</type>
                <description>The text to insert</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>execute_bash</n>
        <description>Execute a bash command</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Explain why this command should be executed</description>
                <required>true</required>
            </parameter>
            <parameter>
                <n>command</n>
                <type>string</type>
                <description>The bash command to run</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>restart_bash</n>
        <description>Restart the bash session with a fresh environment</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Explain why the session is being reset</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>

    <tool>
        <n>complete_task</n>
        <description>Finalize the task and exit the agent loop</description>
        <parameters>
            <parameter>
                <n>reasoning</n>
                <type>string</type>
                <description>Explain why the task is complete</description>
                <required>true</required>
            </parameter>
        </parameters>
    </tool>
</tools>

<user-request>
    {{user_request}}
</user-request>`;

// Tool implementation functions
interface ToolResult {
  result?: string;
  error?: string;
}

interface ViewFileInput {
  reasoning: string;
  path: string;
}

function toolViewFile(toolInput: ViewFileInput): ToolResult {
  try {
    const { reasoning, path } = toolInput;
    const resolvedPath = path?.replace(rootPathToReplaceWithCwd, process.cwd());

    if (!resolvedPath || !resolvedPath.trim()) {
      const errorMessage = "Invalid file path provided: path is empty.";
      console.log(`[tool_view_file] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_view_file] reasoning: ${reasoning}, path: ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
      const errorMessage = `File ${resolvedPath} does not exist`;
      console.log(`[tool_view_file] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return { result: content };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_view_file] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface CreateFileInput {
  reasoning: string;
  path: string;
  file_text: string;
}

function toolCreateFile(toolInput: CreateFileInput): ToolResult {
  try {
    const { reasoning, path, file_text } = toolInput;
    const resolvedPath = path?.replace(rootPathToReplaceWithCwd, process.cwd());

    console.log(`[tool_create_file] reasoning: ${reasoning}, path: ${resolvedPath}`);

    if (!resolvedPath || !resolvedPath.trim()) {
      const errorMessage = "Invalid file path provided: path is empty.";
      console.log(`[tool_create_file] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    const dirname = path.split('/').slice(0, -1).join('/');
    if (!dirname) {
      const errorMessage = "Invalid file path provided: directory part of the path is empty.";
      console.log(`[tool_create_file] Error: ${errorMessage}`);
      return { error: errorMessage };
    } else {
      fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
    }

    fs.writeFileSync(resolvedPath, file_text || "");
    return { result: `File created at ${resolvedPath}` };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_create_file] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface StrReplaceInput {
  reasoning: string;
  path: string;
  old_str: string;
  new_str: string;
}

function toolStrReplace(toolInput: StrReplaceInput): ToolResult {
  try {
    const { reasoning, path, old_str, new_str } = toolInput;
    const resolvedPath = path?.replace(rootPathToReplaceWithCwd, process.cwd());

    if (!resolvedPath || !resolvedPath.trim()) {
      const errorMessage = "Invalid file path provided: path is empty.";
      console.log(`[tool_str_replace] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    if (!old_str) {
      const errorMessage = "No text to replace specified: old_str is empty.";
      console.log(`[tool_str_replace] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_str_replace] reasoning: ${reasoning}, path: ${resolvedPath}, old_str: ${old_str}, new_str: ${new_str}`);

    if (!fs.existsSync(resolvedPath)) {
      const errorMessage = `File ${resolvedPath} does not exist`;
      console.log(`[tool_str_replace] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');

    if (!content.includes(old_str)) {
      const errorMessage = `'${old_str}' not found in ${resolvedPath}`;
      console.log(`[tool_str_replace] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    const newContent = content.replace(old_str, new_str || "");
    fs.writeFileSync(resolvedPath, newContent);
    return { result: "Text replaced successfully" };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_str_replace] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface InsertLineInput {
  reasoning: string;
  path: string;
  insert_line: number;
  new_str: string;
}

function toolInsertLine(toolInput: InsertLineInput): ToolResult {
  try {
    const { reasoning, path, insert_line, new_str } = toolInput;
    const resolvedPath = path?.replace(rootPathToReplaceWithCwd, process.cwd());

    if (!resolvedPath || !resolvedPath.trim()) {
      const errorMessage = "Invalid file path provided: path is empty.";
      console.log(`[tool_insert_line] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    if (insert_line === undefined || insert_line === null) {
      const errorMessage = "No line number specified: insert_line is missing.";
      console.log(`[tool_insert_line] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    if (!new_str) {
      const errorMessage = "No text to insert specified: new_str is empty.";
      console.log(`[tool_insert_line] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_insert_line] reasoning: ${reasoning}, path: ${resolvedPath}, insert_line: ${insert_line}, new_str: ${new_str}`);

    if (!fs.existsSync(resolvedPath)) {
      const errorMessage = `File ${resolvedPath} does not exist`;
      console.log(`[tool_insert_line] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    const lines = fs.readFileSync(resolvedPath, 'utf-8').split('\n');

    if (insert_line < 0 || insert_line > lines.length) {
      const errorMessage = `Insert line number ${insert_line} out of range (0-${lines.length}).`;
      console.log(`[tool_insert_line] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    lines.splice(insert_line, 0, new_str);
    fs.writeFileSync(resolvedPath, lines.join('\n'));
    return { result: "Line inserted successfully" };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_insert_line] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface ExecuteBashInput {
  reasoning: string;
  command: string;
}

function toolExecuteBash(toolInput: ExecuteBashInput): ToolResult {
  try {
    const { reasoning, command } = toolInput;
    const resolvedCommand = command?.replace(rootPathToReplaceWithCwd, process.cwd());

    if (!resolvedCommand || !resolvedCommand.trim()) {
      const errorMessage = "No command specified: command is empty.";
      console.log(`[tool_execute_bash] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_execute_bash] reasoning: ${reasoning}, command: ${resolvedCommand}`);

    try {
      const result = execSync(resolvedCommand, { 
        env: currentBashEnv, 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      return { result: result.trim() };
    } catch (execError: any) {
      const errorMessage = execError.stderr?.trim() || "Command execution failed with non-zero exit code.";
      console.log(`[tool_execute_bash] Error: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_execute_bash] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface RestartBashInput {
  reasoning: string;
}

function toolRestartBash(toolInput: RestartBashInput): ToolResult {
  try {
    const { reasoning } = toolInput;

    if (!reasoning) {
      const errorMessage = "No reasoning provided for restarting bash session.";
      console.log(`[tool_restart_bash] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_restart_bash] reasoning: ${reasoning}`);
    currentBashEnv = { ...process.env };
    return { result: "Bash session restarted." };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_restart_bash] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

interface CompleteTaskInput {
  reasoning: string;
}

function toolCompleteTask(toolInput: CompleteTaskInput): ToolResult {
  try {
    const { reasoning } = toolInput;

    if (!reasoning) {
      const errorMessage = "No reasoning provided for task completion.";
      console.log(`[tool_complete_task] Error: ${errorMessage}`);
      return { error: errorMessage };
    }

    console.log(`[tool_complete_task] reasoning: ${reasoning}`);
    return { result: "Task completed" };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`[tool_complete_task] Error: ${errorMessage}`);
    console.log(e);
    return { error: errorMessage };
  }
}

// Tool definitions for Claude API
const tools: any[] = [
  {
    name: "view_file",
    description: "View the content of a file",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Why view the file",
        },
        path: { type: "string", description: "File path" },
      },
      required: ["reasoning", "path"],
    },
  },
  {
    name: "create_file",
    description: "Create a new file with given content",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Why create the file",
        },
        path: { type: "string", description: "File path" },
        file_text: {
          type: "string",
          description: "Content for the file",
        },
      },
      required: ["reasoning", "path", "file_text"],
    },
  },
  {
    name: "str_replace",
    description: "Replace text in a file",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Reason for replacement",
        },
        path: { type: "string", description: "File path" },
        old_str: {
          type: "string",
          description: "Text to replace",
        },
        new_str: {
          type: "string",
          description: "Replacement text",
        },
      },
      required: ["reasoning", "path", "old_str", "new_str"],
    },
  },
  {
    name: "insert_line",
    description: "Insert text at a specific line in a file",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Reason for insertion",
        },
        path: { type: "string", description: "File path" },
        insert_line: {
          type: "integer",
          description: "Line number",
        },
        new_str: {
          type: "string",
          description: "Text to insert",
        },
      },
      required: ["reasoning", "path", "insert_line", "new_str"],
    },
  },
  {
    name: "execute_bash",
    description: "Execute a bash command",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Reason for command execution",
        },
        command: {
          type: "string",
          description: "Bash command",
        },
      },
      required: ["reasoning", "command"],
    },
  },
  {
    name: "restart_bash",
    description: "Restart the bash session with fresh environment",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Why to restart bash",
        }
      },
      required: ["reasoning"],
    },
  },
  {
    name: "complete_task",
    description: "Complete the task and exit the agent loop",
    input_schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Why the task is complete",
        }
      },
      required: ["reasoning"],
    },
  },
];

async function runAgent(prompt: string, maxComputeLoops: number = 10, thinkingBudget: number = 1024, maxTokens: number = 4000) {
  // Validate thinking budget (minimum 1024 tokens)
  if (thinkingBudget < 1024) {
    console.log("Warning: Minimum thinking budget is 1024 tokens. Setting to 1024.");
    thinkingBudget = 1024;
  }

  // Prepare the initial message using the detailed prompt
  const initialMessage = AGENT_PROMPT.replace("{{user_request}}", prompt);
  const messages: any[] = [{ role: "user", content: initialMessage }];

  let computeIterations = 0;
  let isTaskComplete = false;

  // Tool function mapping
  const toolFunctions: Record<string, (input: any) => ToolResult> = {
    view_file: toolViewFile,
    create_file: toolCreateFile,
    str_replace: toolStrReplace,
    insert_line: toolInsertLine,
    execute_bash: toolExecuteBash,
    restart_bash: toolRestartBash,
    complete_task: toolCompleteTask,
  };

  // Begin the agent loop
  while (computeIterations < maxComputeLoops && !isTaskComplete) {
    computeIterations++;
    console.log(`\n${'='.repeat(40)}\nAgent Loop ${computeIterations}/${maxComputeLoops}\n${'='.repeat(40)}\n`);

    try {
      // @ts-ignore - Anthropic SDK typing issue for thinking parameter
      const response = await client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        thinking: {
          type: "enabled",
          budget_tokens: thinkingBudget,
        },
        messages,
        tools,
      });

      // Log the API response
      console.log("API Response:", JSON.stringify(response, null, 2));

      // Extract and print thinking blocks if present
      // @ts-ignore - SDK incompatibility
      const thinkingBlocks = response.content.filter(block => 
        block.type === 'thinking'
      );
      
      if (thinkingBlocks.length > 0) {
        console.log("\nClaude's Thinking Process:");
        console.log("-".repeat(50));
        // @ts-ignore - Anthropic SDK typing issue
        console.log(thinkingBlocks[0].thinking);
        console.log("-".repeat(50));
      }

      // Extract tool calls
      // @ts-ignore - SDK incompatibility
      const toolCalls = response.content.filter(block => 
        block.type === 'tool_use'
      );

      if (toolCalls.length > 0) {
        // Add the assistant's response to messages
        messages.push({ role: "assistant", content: response.content });

        for (const tool of toolCalls) {
          console.log(`Tool Call: ${tool.name}(${JSON.stringify(tool.input)})`);
          
          const func = toolFunctions[tool.name];
          if (func) {
            const output = func(tool.input);
            const resultText = output.error || output.result || "";
            console.log(`Tool Result: ${resultText}`);

            // Format the tool result message according to Claude API requirements
            const toolResultMessage: any = {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: resultText,
                }
              ],
            };
            messages.push(toolResultMessage);
            
            if (tool.name === "complete_task") {
              console.log("\nTask completed. Exiting agent loop.");
              isTaskComplete = true;
              break;
            }
          } else {
            throw new Error(`Unknown tool: ${tool.name}`);
          }
        }
      } else {
        // If no tool calls, add the response to messages and exit loop
        messages.push({ role: "assistant", content: response.content });
        console.log("\nNo tool calls in response. Exiting agent loop.");
        break;
      }
    } catch (error) {
      console.error("Error in API call:", error);
      break;
    }
  }

  if (computeIterations >= maxComputeLoops && !isTaskComplete) {
    console.log("\nReached compute limit without completing task.");
  }

  // Calculate approximate token usage (simplified estimation)
  const promptTokens = initialMessage.split(/\s+/).length;
  let thinkingTokens = 0;
  let responseTokens = 0;
  let toolResultTokens = 0;

  for (const message of messages) {
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "thinking") {
          // @ts-ignore - Anthropic SDK typing issue
          thinkingTokens += block.thinking.split(/\s+/).length;
        } else if (block.type === "text") {
          // @ts-ignore - Anthropic SDK typing issue
          responseTokens += block.text.split(/\s+/).length;
        }
      }
    } else if (message.role === "user" && Array.isArray(message.content)) {
      for (const contentItem of message.content) {
        if (contentItem.type === "tool_result") {
          // @ts-ignore - Anthropic SDK typing issue
          toolResultTokens += String(contentItem.content).split(/\s+/).length;
        }
      }
    }
  }

  const totalInputTokens = promptTokens + toolResultTokens;
  const totalOutputTokens = responseTokens;
  const totalTokens = totalInputTokens + totalOutputTokens + thinkingTokens;

  // Calculate approximate costs (Claude 3.7 Sonnet pricing)
  const inputCost = totalInputTokens * (3.0 / 1000000);  // $3.00 per million tokens
  const outputCost = totalOutputTokens * (15.0 / 1000000);  // $15.00 per million tokens
  const thinkingCost = thinkingTokens * (15.0 / 1000000);  // $15.00 per million tokens
  const totalCost = inputCost + outputCost + thinkingCost;

  // Display token usage summary
  console.log("\nToken Usage Summary:");
  console.log("-".repeat(50));
  console.log(`Input Tokens:     ${totalInputTokens} ($${inputCost.toFixed(6)})`);
  console.log(`Output Tokens:    ${totalOutputTokens} ($${outputCost.toFixed(6)})`);
  console.log(`Thinking Tokens:  ${thinkingTokens} ($${thinkingCost.toFixed(6)})`);
  console.log(`Total:            ${totalTokens} ($${totalCost.toFixed(6)})`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "";
  let compute = 10;
  let thinkingBudget = 1024;
  let maxTokens = 4000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-p" || args[i] === "--prompt") {
      prompt = args[i + 1];
      i++;
    } else if (args[i] === "-c" || args[i] === "--compute") {
      compute = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--thinking_budget_tokens") {
      thinkingBudget = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--max_tokens") {
      maxTokens = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!prompt) {
    console.error("Error: --prompt argument is required");
    process.exit(1);
  }

  return { prompt, compute, thinkingBudget, maxTokens };
}

// Main function
async function main() {
  const { prompt, compute, thinkingBudget, maxTokens } = parseArgs();
  
  try {
    await runAgent(prompt, compute, thinkingBudget, maxTokens);
  } catch (error) {
    console.error("Error running agent:", error);
    process.exit(1);
  }
}

main().catch(console.error);