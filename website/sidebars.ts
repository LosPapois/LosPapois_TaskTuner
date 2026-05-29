import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  devSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introducción',
    },
    {
      type: 'category',
      label: 'Arquitectura',
      items: [
        'architecture/tech-stack',
        'architecture/components',
        'architecture/database',
      ],
    },
    {
      type: 'category',
      label: 'Desarrollo',
      items: ['dev/setup', 'dev/cicd'],
    },
    {
      type: 'category',
      label: 'Flujos',
      items: [
        'flows/web',
        'flows/bot',
        'flows/rag',
        'flows/document-indexing',
      ],
    },
    {
      type: 'category',
      label: 'RAG — Decisiones de Diseño',
      items: [
        'rag/overview',
        'rag/chunking',
        'rag/vector-search',
        'rag/query-expansion',
        'rag/reranking',
        'rag/oracle-ddl',
      ],
    },
    {
      type: 'category',
      label: 'Características',
      items: [
        'features/projects',
        'features/sprints',
        'features/tasks',
        'features/ai-assistant',
      ],
    },
  ],
};

export default sidebars;
