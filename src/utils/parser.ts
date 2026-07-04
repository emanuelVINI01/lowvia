export interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Extracts JSON blocks from inside multiple <tool_call> tags and attempts to parse them resiliently.
 */
export const extractToolCalls = (text: string): ParsedToolCall[] => {
  // Ultra-resilient regex: accepts JSON or XML inside tool_call
  const regex = /<(?:tool_call|tool)>\s*([\s\S]*?)(?:\s*<\/(?:tool_call|tool)>|\s*<\/?tool_result>|$)/g;
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
        // --- Generic XML Parsing Fallback ---
        // Match <tool_name> ... </tool_name> anywhere in the block
        const xmlMatch = jsonStr.match(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/);
        if (xmlMatch) {
          const toolName = xmlMatch[1];
          const innerArgs = xmlMatch[2];
          
          const args: Record<string, any> = {};
          
          // Match top-level <key>value</key> pairs, handling missing closing tags for truncated generations
          const openTagRegex = /<([a-zA-Z0-9_]+)>/g;
          let openMatch;
          while ((openMatch = openTagRegex.exec(innerArgs)) !== null) {
            const key = openMatch[1];
            const closeTag = `</${key}>`;
            const closeIndex = innerArgs.indexOf(closeTag, openTagRegex.lastIndex);
            
            let val: any = '';
            if (closeIndex !== -1) {
              val = innerArgs.substring(openTagRegex.lastIndex, closeIndex).trim();
              openTagRegex.lastIndex = closeIndex + closeTag.length; // Advance index
            } else {
              // Missing closing tag! Assume it goes until the end of innerArgs
              val = innerArgs.substring(openTagRegex.lastIndex).trim();
              openTagRegex.lastIndex = innerArgs.length; // Advance index to end
            }
            
            // Auto-parse arrays or nested objects if they look like JSON
            if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
              try { val = JSON.parse(val); } catch {}
            } else if (val === 'true') {
              val = true;
            } else if (val === 'false') {
              val = false;
            }
            
            args[key] = val;
          }
          
          if (Object.keys(args).length > 0) {
            parsedCalls.push({ name: toolName, arguments: args });
            continue;
          }
        }
        // ------------------------------------

        let enhancedError = err.message;
        const posMatch = err.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const before = jsonStr.substring(Math.max(0, pos - 40), pos);
          const after = jsonStr.substring(pos, pos + 40);
          
          const linesBefore = jsonStr.substring(0, pos).split('\n');
          const line = linesBefore.length;
          const col = linesBefore[linesBefore.length - 1].length;

          enhancedError = `${err.message} (Line ${line}, Column ${col})\nSnippet at error location:\n...${before} [ERROR HERE] ${after}...`;
        }

        // Do not skip! Feed the syntax error back so the LLM can correct it
        let finalErrorMsg = `Failed to parse JSON: ${enhancedError}`;
        if (jsonStr.startsWith('<')) {
          finalErrorMsg = `CRITICAL XML FORMAT ERROR: Your tool call was not recognized. You MUST use child tags for arguments (e.g. <tool><arg>value</arg></tool>). DO NOT use XML attributes (e.g. <tool arg="value"/>). If you use attributes, the parser will fail.`;
        }

        parsedCalls.push({
          name: '_syntax_error',
          arguments: { error: finalErrorMsg }
        });
      }
    }
  }

  return parsedCalls;
};
