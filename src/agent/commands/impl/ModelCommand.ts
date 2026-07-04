import { ICommand, CommandContext, CommandResult } from '../ICommand';

export class ModelCommand implements ICommand {
  aliases = ['/model'];

  execute(userText: string, context: CommandContext): CommandResult {
    const targetModel = userText.replace('/model', '').trim();
    
    if (targetModel) {
      context.handleGlobalModelChange(targetModel);
      
      return {
        displayUserText: userText,
        hiddenContext: '',
        preventSubmission: true, // Do not send to the AI
        uiMessage: {
          role: 'assistant',
          content: `✅ ${context.t('chat.modelChanged', 'Model changed to:')} **${targetModel}**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      };
    }
    
    // If no model specified, just act as normal text (or show error)
    return {
      displayUserText: userText,
      hiddenContext: ''
    };
  }
}
