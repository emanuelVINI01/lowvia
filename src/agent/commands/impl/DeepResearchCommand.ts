import { ICommand, CommandContext, CommandResult } from '../ICommand';

export class DeepResearchCommand implements ICommand {
  aliases = ['/pesquisa-profunda', '/deep-research'];

  execute(userText: string, context: CommandContext): CommandResult {
    const isPt = userText.startsWith('/pesquisa-profunda');
    const commandUsed = isPt ? '/pesquisa-profunda' : '/deep-research';
    
    const displayUserText = userText.replace(commandUsed, '').trim() || 
      (isPt ? 'Inicie uma pesquisa profunda sobre as notícias de hoje.' : 'Start a deep research about today\'s news.');
    
    const hiddenContext = `[DIRETIVA DE SISTEMA PARA ESTE TURNO]: Esta é uma PESQUISA PROFUNDA iniciada pelo usuário. Você ESTÁ ESTRITAMENTE PROIBIDO de responder imediatamente usando apenas o seu conhecimento paramétrico.
Sendo uma Pesquisa Profunda, espera-se que você seja extremamente EXAUSTIVO e PRÓ-ATIVO. Você não deve se contentar com apenas uma busca superficial ou um único link. 

Passos obrigatórios e Comportamento Esperado:
1. Formule MÚLTIPLAS queries de busca explorando diversas variações do tema, palavras-chave alternativas e ângulos diferentes. Use a ferramenta \`search_web\`.
2. AGUARDE os resultados. Analise os URLs criticamente. Se os resultados não forem suficientes, sinta-se livre para fazer uma NOVA busca (\`search_web\`) com novos termos.
3. Utilize a ferramenta \`read_url\` para fazer o scraping de VÁRIAS páginas diferentes. Leia conteúdo denso, cruze as informações e verifique fontes distintas.
4. O sistema irá interceptar e exigir que você leia múltiplas páginas antes de terminar (no mínimo 3, mas você deve ler quantas o usuário pedir). Continue lendo novos links emitindo novos \`<tool_call><read_url>...\` até ter certeza absoluta de que tem informações profundas e suficientes.
5. APENAS APÓS essa investigação exaustiva, utilize \`generate_file\` (ou o formato solicitado) para elaborar seu relatório final ultra-detalhado, sintetizando tudo e adicionando citações.`;

    return {
      displayUserText,
      hiddenContext
    };
  }
}
