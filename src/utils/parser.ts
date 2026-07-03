export interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Extracts JSON blocks from inside multiple <tool_call> tags and attempts to parse them resiliently.
 */
export const extractToolCalls = (text: string): ParsedToolCall[] => {
  const regex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  const matches = [...text.matchAll(regex)];
  
  if (matches.length === 0) return [];

  const parsedCalls: ParsedToolCall[] = [];

  for (const match of matches) {
    let jsonStr = match[1].trim();

    try {
      // Attempt standard parse first
      const parsed = JSON.parse(jsonStr) as ParsedToolCall;
      if (parsed.name && typeof parsed.arguments === 'object') {
        parsedCalls.push(parsed);
        continue;
      }
    } catch (e) {
      // Heuristic repair for common LLM JSON errors (like trailing commas or missing quotes)
      try {
        jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1'); // Remove trailing commas
        jsonStr = jsonStr.replace(/'/g, '"'); // Replace single quotes with double quotes
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.name && typeof parsed.arguments === 'object') {
          parsedCalls.push(parsed as ParsedToolCall);
        }
      } catch (err: any) {
        // Do not skip! Feed the syntax error back so the LLM can correct it
        parsedCalls.push({
          name: '_syntax_error',
          arguments: { error: `Failed to parse JSON: ${err.message}` }
        });
      }
    }
  }

  return parsedCalls;
};
