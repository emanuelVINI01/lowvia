import { ICommand, CommandContext, CommandResult } from '../ICommand';

export class CodeCommand implements ICommand {
  aliases = ['/codigo', '/code'];

  execute(userText: string, context: CommandContext): CommandResult {
    const isPt = userText.startsWith('/codigo');
    const commandUsed = isPt ? '/codigo' : '/code';
    
    const displayUserText = userText.replace(commandUsed, '').trim() || 
      (isPt ? 'Me ajude com um problema de código.' : 'Help me with a coding problem.');
      
    const hiddenContext = `[DIRETIVA DE SISTEMA PARA ESTE TURNO]: MODO DESENVOLVEDOR SÊNIOR ATIVADO.
1. Concentre-se estritamente na qualidade do código, arquitetura limpa, e performance.
2. Se necessário, pesquise na web a documentação mais recente sobre a linguagem/framework.
3. Se for gerar ficheiros completos, USE ESTRITAMENTE a ferramenta \`generate_file\`. NUNCA coloque código truncado.`;

    return {
      displayUserText,
      hiddenContext
    };
  }
}
