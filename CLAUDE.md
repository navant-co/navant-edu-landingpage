# Marketing Edu — CLAUDE.md

## Papel no Ecossistema
Landing page estática de marketing da família **Edu**, publicada via **GitHub Pages** (tem `CNAME` para domínio customizado).

## Estrutura
```
marketing-edu/
├── index.html   # Página única
├── main.js      # Interações
├── style.css    # Estilos
├── docs/        # Conteúdo adicional
└── CNAME        # Domínio do GitHub Pages
```

## Diretrizes
- Site estático puro (sem build) — manter simples; mudanças entram no ar via push para o branch do Pages
- Não duplicar com `navant-edu-frontend/apps/navant-edu-website` (Next.js) — decidir qual será o site de marketing canônico e aposentar o outro
- CTAs devem apontar para o fluxo de demo/login do produto

## Prod-Readiness
- ⚠️ **Sobreposição com `navant-edu-website`** (Next.js no monorepo edu-frontend) — consolidar
- 🔴 Sem analytics/SEO estruturado (meta tags, OG, sitemap)
