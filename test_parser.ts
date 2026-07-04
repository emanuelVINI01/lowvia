import { extractToolCalls } from './src/utils/parser';

const text = `
Here is my tool call:
<tool_call>
<generate_file>
<filename>neuralink_report.md</filename>
<content>
# Neuralink
This is a test.
</tool_call>
`;

const res = extractToolCalls(text);
console.log(JSON.stringify(res, null, 2));
