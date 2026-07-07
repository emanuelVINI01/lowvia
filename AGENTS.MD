<!-- BEGIN:nextjs-agent-rules -->
# Template Rules

- Next 16 App Router: confira `node_modules/next/dist/docs/` antes de assumir APIs antigas.
- Reutilize primeiro o que ja existe em `src/components/ui`, `src/components/layout`, `src/components/states` e `src/components/navigation`.
- `app/` compoe rotas; logica de negocio, formatacao, mapeamento, fetch e integracao ficam em `src/services`, `src/utils`, `src/hooks`, `src/lib` ou `src/mappers` quando existir.
- Single Responsibility sempre:
  pagina compoe;
  componente renderiza;
  hook controla estado/efeitos/integracao;
  util e puro;
  service fala com auth, API ou banco;
  mapper transforma dado para UI.
- Refatore de verdade, nao cosmeticamente: quebre componentes, hooks e funcoes quando estiverem misturando responsabilidades ou levando mais de 3 segundos para entender.
- Se um componente tiver JSX poluido, condicionais empilhadas, handlers inline complexos, props demais ou regra visual espalhada, extraia subcomponentes, utils ou hooks menores.
- Se um `useEffect`, `useMemo` ou `useCallback` estiver mascarando bagunca, simplifique a modelagem antes de memoizar.
- Prefira composicao a condicionais gigantes. Se uma condicao muda muito a UI, crie outro componente.
- Centralize repeticoes reais: cards, headers, estados `loading/empty/error/success`, tabelas, linhas, badges, formatadores, cores, status e arrays de configuracao.
- Todo texto de UI deve passar por i18n desde o inicio, em todos os projetos derivados. Nao hardcode labels, CTAs, placeholders, aria-labels, empty/error/loading states, metadata textual ou textos de toast em paginas/componentes; coloque em dicionarios tipados e passe por props/hook/provider.
- Mantenha `src/i18n` como base padrao para linguagens, dicionarios e tipos. Ao criar nova tela/componente, atualize primeiro o contrato de i18n e depois consuma as chaves na UI.
- Nao deixe fetch dentro de componente visual quando isso puder morar em hook ou service.
- Pages e layouts devem ser finos. Respeite Server vs Client Components e nao transforme tudo em client sem necessidade.
- Mantenha a hierarquia visual do template: `AppHeader` -> `main` -> `PageSection` -> cards/listas/formularios.
- Navbar padrao:
  mantenha um unico array/factory de itens (`href`, `label`, `mobileLabel` quando precisar, `icon` lucide) em `src/lib` ou arquivo dedicado `nav-items`;
  labels devem vir de i18n/dicionario, nao hardcoded no componente;
  use a mesma fonte para desktop e mobile para evitar rotas divergentes;
  `AppHeader` controla brand, sessao/auth, idioma/status e composicao da nav, mas nao deve conter regra de negocio;
  se o header crescer, separe em `BrandLink`, `DesktopNav`, `MobileBottomNav` e `HeaderActions`;
  desktop nav fica no topo com `Link`, `aria-current`, estado ativo por `pathname`, texto curto e uppercase;
  mobile deve ser bottom nav fixa, `z-50`, `safe-area-inset-bottom`, icone acima do label, label truncado e grid baseado na quantidade de itens;
  use `framer-motion` apenas para entrada/indicador ativo, mantendo `layoutId` unico por projeto;
  auth deve mostrar login quando deslogado e nome/avatar/logout quando logado, sem duplicar `signIn/signOut` fora dos componentes de auth;
  preserve tokens Yaru Purple (yaru-bg, yaru-panel, yaru-surface, yaru-purple, yaru-lavender, yaru-muted) e nao crie estilos paralelos de navbar.
- Preserve o tema Yaru Purple (Dark Purple). Use tokens e superficies de src/index.css; nao invente paleta paralela.
- Prisma, Auth.js e clients compartilhados sao singleton/config central. Nao recrie client, adapter ou auth config em pagina, hook ou route handler.
- Remova codigo morto, imports inuteis, helpers abandonados e assets padrao da Vercel. Evite abstracao teatral, micro-abstracao e camada extra sem ganho real.
- Preserve comportamento atual. Nao mude regra de negocio sem necessidade.
- Fluxo esperado em toda refatoracao:
  revisar arquitetura;
  achar arquivos inchados e responsabilidades misturadas;
  refatorar incrementalmente;
  padronizar limites entre pagina, componente, hook, util e service;
  validar com lint, typecheck e build/testes.
<!-- END:nextjs-agent-rules -->

# Development Server Rules

- You can start next dev, but if you are through a error of port,
you can presume the server is already running at that port.
- Do not remove Next.js dev-server lock files to force a server start.

# Configurable UI Rules

- When creating or changing any reusable UI component, page text, modal, alert, navigation item, logo/brand surface, or visible user-facing label, update the admin configuration model in `config/admin/` and the matching provider/API/UI under `src/lib/config`, `app/api/admin/settings`, and `src/components/admin/settings`.
- New visible text must be represented in the language settings so Portuguese and English can be edited from `/admin/settings/language`; do not leave new user-facing copy as an untracked hardcoded-only string.
- New reusable visual components must be represented in the appearance settings so classes, removals, page scope, preview, modal/alert behavior, and theme impact can be edited from the admin panel.
- New brand/logo usage must read from the brand/business configuration or expose a clear fallback; do not create another hardcoded logo path or brand mark without adding it to the admin configuration.
- Configuration changes must follow the existing flow: edit in memory in the admin UI, save the JSON draft, and only apply runtime behavior through "Atualização geral".

# Required Checks Before Merge

- typecheck
- lint
- relevant API tests
- no secrets in logs/responses