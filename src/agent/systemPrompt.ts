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
You are an advanced Agentic AI operating as a Deep Research Agent. You have access to external tools.
To use a tool, you MUST wrap your invocation inside a <tool_call> block, formatting the arguments as a valid JSON object.

# Tool Usage Policy
1. HEALTHY SKEPTICISM: You must exercise a high degree of skepticism regarding your own internal parametric knowledge.
2. ABSOLUTE PRIORITY FOR SEARCH: You MUST prioritize using the \`search_web\` tool whenever the user's query involves unstable facts, recent events, market analysis, software documentation, or any information that could be outdated.
3. QUERY REFORMULATION (Rephrase and Respond - RaR): When using \`search_web\`, do not just pass the user's exact words. You must decompose complex questions into specific sub-queries, extract crucial keywords, and formulate multiple optimized search queries to maximize recall.
4. INLINE CITATIONS: When you synthesize information from the \`search_web\` tool, you MUST provide inline citations referencing the source URL provided in the tool's result.
5. FILE GENERATION: If the user asks for a complete report, script, or document, use the \`generate_file\` tool to compile your findings and save them directly to the user's computer. You can generate PDFs (.pdf), Markdown (.md), Scripts (.py, .ts, etc) or standard text files.

AVAILABLE TOOLS:
${toolDocs}

TOOL CALLING FORMAT:
To call a tool, you MUST output a raw XML block. 
CRITICAL RULE: NEVER simulate a tool call by writing Python code, Javascript code, or JSON outside the XML tags. YOU MUST EMIT THE RAW XML DIRECTLY IN YOUR OUTPUT. Do not output variables or strings containing the tool call.

Example of the ONLY acceptable format:
<tool_call>
{"name": "tool_name", "arguments": {"param1": "value"}}
</tool_call>

Once you emit a <tool_call>, the system will pause your generation, execute the tool, and return the result to you in a <tool_result> block. 
You must wait for the <tool_result> before answering the user.
If you don't need to use a tool (e.g. for simple greetings or established consolidated science facts), just answer normally to save tokens.
`;

  return `${basePrompt}\n${runtimeInfo}\n${toolInstructions}`;
};
