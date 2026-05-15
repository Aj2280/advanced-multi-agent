export interface PromptTemplate {
  id: string
  title: string
  tags: string[]
  prompt: string
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'landing',
    title: 'SaaS landing page',
    tags: ['react', 'vite', 'tailwind', 'marketing', 'landing'],
    prompt:
      'Build a polished SaaS landing page with Vite, React, TypeScript, and Tailwind. Include hero with CTA, feature grid, pricing table, testimonials, and footer.',
  },
  {
    id: 'dashboard',
    title: 'Admin dashboard',
    tags: ['react', 'dashboard', 'charts', 'sidebar', 'admin'],
    prompt:
      'Create a dark admin dashboard with sidebar navigation, KPI cards, a line chart area, and a data table. Use Vite + React + Tailwind. Mock realistic sample data.',
  },
  {
    id: 'todo',
    title: 'Todo app',
    tags: ['react', 'crud', 'localstorage', 'productivity'],
    prompt:
      'Build a todo app with add, complete, delete, filter (all/active/done), and localStorage persistence. Clean mobile-friendly UI with Tailwind.',
  },
  {
    id: 'api',
    title: 'REST API + docs',
    tags: ['python', 'fastapi', 'api', 'backend'],
    prompt:
      'Scaffold a FastAPI REST API with CRUD for a notes resource, Pydantic models, OpenAPI docs page, and pytest smoke tests.',
  },
  {
    id: 'chat',
    title: 'Chat UI',
    tags: ['react', 'chat', 'messages', 'ui'],
    prompt:
      'Build a modern chat interface with message list, typing indicator, user avatars, and a composer bar. Use React and Tailwind with smooth scroll.',
  },
  {
    id: 'ecommerce',
    title: 'Product catalog',
    tags: ['ecommerce', 'shop', 'grid', 'cart'],
    prompt:
      'Create a product catalog page with search filter, category chips, product cards with price/rating, and a slide-out cart drawer.',
  },
  {
    id: 'blog',
    title: 'Blog site',
    tags: ['blog', 'markdown', 'content', 'seo'],
    prompt:
      'Generate a minimal blog with home, post list, and post detail pages. Include markdown rendering, tags, and responsive typography.',
  },
  {
    id: 'game',
    title: 'Browser game',
    tags: ['canvas', 'game', 'javascript', 'fun'],
    prompt:
      'Build a simple canvas arcade game (snake or breakout) with score, restart, and keyboard controls. Single HTML file is fine.',
  },
  {
    id: 'portfolio',
    title: 'Developer portfolio',
    tags: ['portfolio', 'personal', 'resume', 'projects'],
    prompt:
      'Create a developer portfolio with hero, skills, project cards with links, timeline, and contact form. Modern gradient aesthetic.',
  },
  {
    id: 'debate',
    title: 'Architecture debate',
    tags: ['swarm', 'debate', 'architecture', 'design'],
    prompt:
      'Debate the best architecture for a real-time collaborative editor: CRDT vs OT, WebSocket vs SSE, and monolith vs microservices. Produce a recommendation.',
  },
]

export function filterTemplates(query: string): PromptTemplate[] {
  const q = query.trim().toLowerCase()
  if (!q) return PROMPT_TEMPLATES
  return PROMPT_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.prompt.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)),
  )
}
