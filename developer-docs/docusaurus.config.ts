import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const repoRoot =
  'https://github.com/yc-hackathon/buildstory-agents/tree/main';

const config: Config = {
  title: 'BuildStory.Agents',
  tagline: 'Developer documentation for the autonomous landing-page agent stack',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  // Set `url` and `baseUrl` to match your deployment (e.g. GitHub Pages uses a project base path).
  url: 'https://yc-hackathon.github.io',
  baseUrl: '/',
  trailingSlash: false,

  organizationName: 'yc-hackathon',
  projectName: 'buildstory-agents',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `${repoRoot}/developer-docs/`,
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
      title: 'Developer guide',
      logo: {
        alt: 'BuildStory.Agents',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'developerSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/yc-hackathon/buildstory-agents',
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
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Getting started',
              to: '/docs/getting-started',
            },
            {
              label: 'API reference',
              to: '/docs/api',
            },
          ],
        },
        {
          title: 'Repository',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/yc-hackathon/buildstory-agents',
            },
            {
              label: 'Contributing',
              href: 'https://github.com/yc-hackathon/buildstory-agents/blob/main/CONTRIBUTING.md',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BuildStory.Agents contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'sql', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
