import { ICommand } from './ICommand';
import { CodeCommand } from './impl/CodeCommand';
import { ModelCommand } from './impl/ModelCommand';

export class CommandFactory {
  private static commands: ICommand[] = [
    new CodeCommand(),
    new ModelCommand()
  ];

  /**
   * Identifies if the user text starts with any registered command alias
   * and returns the corresponding command instance.
   */
  public static getCommand(userText: string): ICommand | null {
    const text = userText.trim();
    for (const command of this.commands) {
      for (const alias of command.aliases) {
        if (text.startsWith(alias)) {
          return command;
        }
      }
    }
    return null;
  }
}
