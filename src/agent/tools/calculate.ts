import { AITool } from '../tools';
import { evaluate } from 'mathjs';

export const calculate: AITool = {
  name: 'calculate',
  description: 'Evaluates a mathematical expression and returns the result. Use this for ANY math problem to avoid hallucinations.',
  parameters: {
    expression: {
      type: 'string',
      description: 'The mathematical expression to evaluate (e.g. "245 * 892").',
      required: true,
    }
  },
  execute: (args) => {
    try {
      // Safe math evaluation using mathjs instead of eval/Function
      const result = evaluate(args.expression);
      return `Result: ${result}`;
    } catch (e: any) {
      return `Error evaluating expression: ${e.message}`;
    }
  }
};
