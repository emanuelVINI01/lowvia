import { ICommand, CommandContext, CommandResult } from '../ICommand';

export class DeepResearchCommand implements ICommand {
  aliases = ['/pesquisa-profunda', '/deep-research'];

  execute(userText: string, context: CommandContext): CommandResult {
    const isPt = userText.startsWith('/pesquisa-profunda');
    const commandUsed = isPt ? '/pesquisa-profunda' : '/deep-research';
    
    const displayUserText = userText.replace(commandUsed, '').trim() || 
      (isPt ? 'Inicie uma pesquisa profunda sobre as notícias de hoje.' : 'Start a deep research about today\'s news.');
    
    const hiddenContext = `[DIRETIVA DE SISTEMA PARA ESTE TURNO]: Esta é uma PESQUISA PROFUNDA iniciada pelo usuário. Você ESTÁ ESTRITAMENTE PROIBIDO de responder imediatamente usando apenas o seu conhecimento paramétrico.
Passos obrigatórios:
1. Formule múltiplas queries e use a ferramenta \`search_web\` para encontrar links promissores.
2. AGUARDE os resultados. Não emita outras ferramentas ainda.
3. Dos resultados da busca, analise os URLs mais relevantes.
4. Utilize a ferramenta \`read_url\` passando o URL exato para fazer o scraping completo e ler o conteúdo denso da página. Pode ler mais do que uma se necessário.
5. APENAS APÓS ingerir o conteúdo com o \`read_url\`, elabore a sua resposta final ultra-detalhada com citações inline do link original.`;

    return {
      displayUserText,
      hiddenContext
    };
  }
}
