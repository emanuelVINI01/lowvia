export interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Extracts a JSON block from inside <tool_call> tags and attempts to parse it resiliently.
 */
export const extractToolCall = (text: string): ParsedToolCall | null => {
  const match = text.match(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/);
  if (!match) return null;

  let jsonStr = match[1].trim();

  try {
    // Attempt standard parse first
    return JSON.parse(jsonStr) as ParsedToolCall;
  } catch (e) {
    // Heuristic repair for common LLM JSON errors (like trailing commas or missing quotes)
    try {
      jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1'); // Remove trailing commas
      jsonStr = jsonStr.replace(/'/g, '"'); // Replace single quotes with double quotes
      
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && typeof parsed.arguments === 'object') {
        return parsed as ParsedToolCall;
      }
    } catch {
      // Return null if all parsing heuristics fail
      return null;
    }
  }

  return null;
};
