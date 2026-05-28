import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {PluginOptions as OpenApiPluginOptions} from 'docusaurus-plugin-openapi-docs';
import type {ThemeConfig as OpenApiThemeConfig} from 'docusaurus-theme-openapi-docs';

const config: Config = {
  title: 'TaskTuner Docs',
  tagline: 'Documentación interna — Los Papois',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'http://localhost',
  baseUrl: '/',

  organizationName: 'LosPapois',
  projectName: 'LosPapois_TaskTuner',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    localeConfigs: {
      es: {label: 'Español', direction: 'ltr'},
      en: {label: 'English', direction: 'ltr'},
    },
  },

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          tasktuner: {
            specPath: 'api-specs/openapi.json',
            outputDir: 'docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
          } satisfies OpenApiPluginOptions,
        },
      } satisfies OpenApiPluginOptions,
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          docItemComponent: '@theme/ApiItem',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'TaskTuner',
      logo: {
        alt: 'TaskTuner Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'devSidebar',
          position: 'left',
          label: 'Documentación',
        },
        {
          to: '/docs/api',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/LosPapois/LosPapois_TaskTuner',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Introducción', to: '/docs/intro'},
            {label: 'API Reference', to: '/docs/api'},
          ],
        },
        {
          title: 'Equipo',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/LosPapois/LosPapois_TaskTuner',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Los Papois.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'bash', 'sql', 'yaml', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
