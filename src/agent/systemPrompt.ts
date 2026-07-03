import { AITool, availableTools } from './tools';

export const generateSystemPrompt = (basePrompt: string): string => {
  if (availableTools.length === 0) return basePrompt;

  let toolDocs = '<tools>\n';
  
  for (const tool of availableTools) {
    toolDocs += `  <tool>\n`;
    toolDocs += `    <name>${tool.name}</name>\n`;
    toolDocs += `    <description>${tool.description}</description>\n`;
    toolDocs += `    <parameters>\n`;
    for (const [paramName, param] of Object.entries(tool.parameters)) {
      toolDocs += `      <parameter>\n`;
      toolDocs += `        <name>${paramName}</name>\n`;
      toolDocs += `        <type>${param.type}</type>\n`;
      toolDocs += `        <required>${param.required}</required>\n`;
      toolDocs += `        <description>${param.description}</description>\n`;
      toolDocs += `      </parameter>\n`;
    }
    toolDocs += `    </parameters>\n`;
    toolDocs += `  </tool>\n`;
  }
  
  toolDocs += '</tools>\n';

  const runtimeInfo = `
[SYSTEM INFO]
- Current Local Time: ${new Date().toString()}
- User Language: ${navigator.language}
- Operating System: ${navigator.platform}
`;

  const toolInstructions = `
You are an advanced Agentic AI. You have access to the following external tools.
To use a tool, you MUST wrap your invocation inside a <tool_call> block, formatting the arguments as a valid JSON object.
Do NOT reply with the answer directly if a tool can provide the exact information. Use the tool first.

AVAILABLE TOOLS:
${toolDocs}

TOOL CALLING FORMAT:
To call a tool, output exactly this format:
<tool_call>
{"name": "tool_name", "arguments": {"param1": "value"}}
</tool_call>

Once you emit a <tool_call>, the system will pause your generation, execute the tool, and return the result to you in a <tool_result> block. 
You must wait for the <tool_result> before answering the user.
If you don't need to use a tool, just answer normally.
`;

  return `${basePrompt}\n${runtimeInfo}\n${toolInstructions}`;
};
