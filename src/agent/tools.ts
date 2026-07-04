import { get_current_time } from './tools/get_current_time';
import { calculate } from './tools/calculate';
import { searchWebTool } from './tools/search_web';
import { readUrlTool } from './tools/read_url';
import { generateFileTool } from './tools/generate_file';
import { z } from 'zod';

export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required: boolean;
  items?: { type: 'string' | 'number' }; // For array types
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, AIToolParameter>;
  schema?: z.ZodSchema<any>;
  execute: (args: Record<string, any>) => Promise<string> | string;
}

// Export all available tools
export const availableTools: AITool[] = [
  get_current_time,
  calculate,
  searchWebTool,
  readUrlTool,
  generateFileTool
];
