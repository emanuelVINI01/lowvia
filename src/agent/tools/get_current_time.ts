import { AITool } from '../tools';
import { z } from 'zod';

export const get_current_time: AITool = {
  name: 'get_current_time',
  description: 'Returns the current local date and time. Use this when the user asks for the current time or date.',
  parameters: {
    timezone: {
      type: 'string',
      description: 'Optional timezone (e.g. America/Sao_Paulo). If omitted, uses local system time.',
      required: false,
    }
  },
  schema: z.object({
    timezone: z.string().optional(),
  }),
  execute: (args) => {
    try {
      const options: Intl.DateTimeFormatOptions = { 
        timeStyle: 'long', 
        dateStyle: 'full',
        timeZone: args.timezone || undefined
      };
      return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
    } catch {
      return new Date().toString();
    }
  }
};
