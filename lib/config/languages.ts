export interface Language {
  id: string;
  name: string;
  monacoLanguage: string;
  commentLine?: string;
  commentBlock?: [string, string];
}

export const LANGUAGES: Language[] = [
  {
    id: 'c',
    name: 'C',
    monacoLanguage: 'c',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLanguage: 'cpp',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'java',
    name: 'Java',
    monacoLanguage: 'java',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'python',
    name: 'Python',
    monacoLanguage: 'python',
    commentLine: '#',
    commentBlock: ['"""', '"""'],
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoLanguage: 'javascript',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'go',
    name: 'Go',
    monacoLanguage: 'go',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoLanguage: 'rust',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'csharp',
    name: 'C#',
    monacoLanguage: 'csharp',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    monacoLanguage: 'kotlin',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
  {
    id: 'php',
    name: 'PHP',
    monacoLanguage: 'php',
    commentLine: '//',
    commentBlock: ['/*', '*/'],
  },
];
