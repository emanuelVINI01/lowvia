import { Message } from '../../types';

export interface CommandContext {
  isPt: boolean;
  t: (key: string, defaultText: string) => string;
  handleGlobalModelChange: (modelName: string) => void;
  activeChatId: string | null;
}

export interface CommandResult {
  displayUserText: string;
  hiddenContext: string;
  preventSubmission?: boolean;
  uiMessage?: Message;
}

export interface ICommand {
  aliases: string[];
  execute(userText: string, context: CommandContext): CommandResult;
}
