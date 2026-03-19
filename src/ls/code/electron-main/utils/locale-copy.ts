export type SupportedLocale = 'zh' | 'en';

export type DocxExportDialogCopy = {
  title: string;
  buttonLabel: string;
};

export type DocxExportCopy = {
  documentTitle: string;
  articleCount: string;
  exportedAt: string;
  authors: string;
  doi: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  untitled: string;
  unknown: string;
  uncategorizedJournal: string;
};

const docxExportDialogCopyByLocale: Record<SupportedLocale, DocxExportDialogCopy> = {
  en: { title: 'Export DOCX', buttonLabel: 'Export' },
  zh: { title: '\u5bfc\u51fa DOCX', buttonLabel: '\u5bfc\u51fa' },
};

const docxExportCopyByLocale: Record<SupportedLocale, DocxExportCopy> = {
  zh: {
    documentTitle: '\u6279\u91cf\u5bfc\u51fa\u7684\u6587\u732e\u5361\u7247',
    articleCount: '\u6587\u7ae0\u6570\u91cf',
    exportedAt: '\u5bfc\u51fa\u65f6\u95f4',
    authors: '\u4f5c\u8005',
    doi: 'DOI',
    abstract: '\u6458\u8981',
    publishedAt: '\u53d1\u5e03\u65f6\u95f4',
    source: '\u6765\u6e90\u94fe\u63a5',
    fetchedAt: '\u6293\u53d6\u65f6\u95f4',
    untitled: '\u65e0\u6807\u9898',
    unknown: '\u672a\u8bc6\u522b',
    uncategorizedJournal: '\u672a\u5206\u7c7b\u671f\u520a',
  },
  en: {
    documentTitle: 'Batch Exported Article Cards',
    articleCount: 'Article Count',
    exportedAt: 'Exported At',
    authors: 'Authors',
    doi: 'DOI',
    abstract: 'Abstract',
    publishedAt: 'Published At',
    source: 'Source URL',
    fetchedAt: 'Fetched At',
    untitled: 'Untitled',
    unknown: 'Unknown',
    uncategorizedJournal: 'Uncategorized Journal',
  },
};

export function resolveSupportedLocale(locale?: string | null): SupportedLocale {
  return locale === 'en' ? 'en' : 'zh';
}

export function resolveDocxExportDialogCopy(locale?: string | null): DocxExportDialogCopy {
  return docxExportDialogCopyByLocale[resolveSupportedLocale(locale)];
}

export function resolveDocxExportCopy(locale?: string | null): DocxExportCopy {
  return docxExportCopyByLocale[resolveSupportedLocale(locale)];
}
