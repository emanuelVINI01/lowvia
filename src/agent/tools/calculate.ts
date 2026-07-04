import { AITool } from '../tools';
import { z } from 'zod';
import { evaluate } from 'mathjs';

export const calculate: AITool = {
  name: 'calculate',
  description: 'Evaluates a mathematical expression and returns the result. Use this for ANY math problem to avoid hallucinations.',
  parameters: {
    expression: {
      type: 'string',
      description: 'The math expression to evaluate (e.g. "2 + 2", "Math.sqrt(16)", "Math.PI * 2").',
      required: true
    }
  },
  schema: z.object({
    expression: z.string().describe("The mathematical expression to evaluate")
  }),
  execute: async (args: Record<string, any>) => {
    try {
      // Safe math evaluation using mathjs instead of eval/Function
      const result = evaluate(args.expression);
      return `Result: ${result}`;
    } catch (e: any) {
      return `Error evaluating expression: ${e.message}`;
    }
  }
};
