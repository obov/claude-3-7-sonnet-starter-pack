// types.ts - Extended type definitions for Anthropic SDK

import type { MessageCreateParamsBase, TextBlock } from '@anthropic-ai/sdk/resources/messages';

// Define ThinkingBlock type
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  id?: string;
}

// Define ThinkingDelta type
export interface ThinkingDelta {
  type: 'thinking_delta';
  thinking: string;
}

// Define custom ToolUseBlock type
export interface CustomToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Extended Response type that includes thinking blocks
export interface ExtendedMessage {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<TextBlock | ThinkingBlock | CustomToolUseBlock>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string | null;
  stop_sequence: string | null;
}

// Extend the MessageCreateParamsBase type to include thinking
export interface ExtendedMessageCreateParams extends MessageCreateParamsBase {
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
  betas?: string[];
}