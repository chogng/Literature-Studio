import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { Article, DocxExportResult } from '../types.js';
import { defaultDocxExportConfig } from './docx-config.js';
import { appError } from '../utils/app-error.js';
import { resolveDocxExportCopy, type SupportedLocale } from '../utils/locale-copy.js';
import { cleanText } from '../utils/text.js';

type ZipEntry = {
  name: string;
  data: Buffer;
};

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

const docxConfig = defaultDocxExportConfig;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeLines(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function formatDocxLocale(locale: SupportedLocale) {
  return locale === 'en' ? 'en-US' : 'zh-CN';
}

function formatDateValue(value: string | null | undefined, locale: SupportedLocale) {
  const cleaned = cleanText(value);
  if (!cleaned) return resolveDocxExportCopy(locale).unknown;

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return cleaned;
  }

  return parsed.toLocaleString(formatDocxLocale(locale));
}

function formatPublishedValue(value: string | null | undefined, locale: SupportedLocale) {
  const cleaned = cleanText(value);
  return cleaned || resolveDocxExportCopy(locale).unknown;
}

function paragraphXml(
  text: string,
  options: {
    bold?: boolean;
    fontSize?: number;
    spacingBefore?: number;
    spacingAfter?: number;
  } = {},
) {
  const paragraphProperties: string[] = [];
  if (options.spacingBefore || options.spacingAfter) {
    const before = options.spacingBefore ?? 0;
    const after = options.spacingAfter ?? 0;
    paragraphProperties.push(`<w:spacing w:before="${before}" w:after="${after}"/>`);
  }

  const runProperties: string[] = [];
  if (options.bold) {
    runProperties.push('<w:b/>');
  }
  if (options.fontSize) {
    runProperties.push(`<w:sz w:val="${options.fontSize}"/>`);
  }

  return [
    '<w:p>',
    paragraphProperties.length > 0 ? `<w:pPr>${paragraphProperties.join('')}</w:pPr>` : '',
    '<w:r>',
    runProperties.length > 0 ? `<w:rPr>${runProperties.join('')}</w:rPr>` : '',
    `<w:t>${escapeXml(text)}</w:t>`,
    '</w:r>',
    '</w:p>',
  ].join('');
}

function emptyParagraphXml() {
  return '<w:p/>';
}

function pageBreakXml() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

type JournalArticleGroup = {
  journalTitle: string;
  articles: Article[];
};

function resolveJournalTitle(article: Article, locale: SupportedLocale) {
  const explicitTitle = cleanText(article.journalTitle);
  if (explicitTitle) return explicitTitle;

  const sourceId = cleanText(article.sourceId);
  if (sourceId) return sourceId;

  const sourceUrl = cleanText(article.sourceUrl);
  if (sourceUrl) {
    try {
      const hostname = cleanText(new URL(sourceUrl).hostname.replace(/^www\./i, ''));
      if (hostname) return hostname;
    } catch {
      // Ignore malformed URL and fall back to uncategorized label.
    }
  }

  return resolveDocxExportCopy(locale).uncategorizedJournal;
}

function groupArticlesByJournal(articles: Article[], locale: SupportedLocale): JournalArticleGroup[] {
  const groups: JournalArticleGroup[] = [];
  const groupIndexByTitle = new Map<string, number>();

  for (const article of articles) {
    const journalTitle = resolveJournalTitle(article, locale);
    const normalizedKey = journalTitle.toLowerCase();
    const existingIndex = groupIndexByTitle.get(normalizedKey);

    if (existingIndex === undefined) {
      groups.push({ journalTitle, articles: [article] });
      groupIndexByTitle.set(normalizedKey, groups.length - 1);
      continue;
    }

    groups[existingIndex].articles.push(article);
  }

  return groups;
}

function articleParagraphsXml(article: Article, indexInJournal: number, locale: SupportedLocale) {
  const copy = resolveDocxExportCopy(locale);
  const title = cleanText(article.title) || copy.untitled;
  const authors = article.authors.map((author) => cleanText(author)).filter(Boolean).join(', ') || copy.unknown;
  const abstractLines = normalizeLines(article.abstractText);
  const abstractValue = abstractLines.length > 0 ? abstractLines : [copy.unknown];

  const paragraphs = [
    paragraphXml(`${indexInJournal + 1}. ${title}`, {
      bold: true,
      fontSize: docxConfig.article.titleFontSize,
      spacingBefore: indexInJournal === 0 ? 0 : docxConfig.article.titleSpacingBefore,
      spacingAfter: docxConfig.article.titleSpacingAfter,
    }),
    paragraphXml(`${copy.authors}: ${authors}`, {
      spacingAfter: docxConfig.article.metadataSpacingAfter,
    }),
    paragraphXml(`${copy.doi}: ${cleanText(article.doi) || copy.unknown}`, {
      spacingAfter: docxConfig.article.metadataSpacingAfter,
    }),
    paragraphXml(`${copy.publishedAt}: ${formatPublishedValue(article.publishedAt, locale)}`, {
      spacingAfter: docxConfig.article.metadataSpacingAfter,
    }),
    paragraphXml(`${copy.source}: ${cleanText(article.sourceUrl) || copy.unknown}`, {
      spacingAfter: docxConfig.article.metadataSpacingAfter,
    }),
    paragraphXml(`${copy.fetchedAt}: ${formatDateValue(article.fetchedAt, locale)}`, {
      spacingAfter: docxConfig.article.fetchedAtSpacingAfter,
    }),
    paragraphXml(copy.abstract, {
      bold: true,
      spacingAfter: docxConfig.article.abstractLabelSpacingAfter,
    }),
    ...abstractValue.map((line, lineIndex) =>
      paragraphXml(line, {
        spacingAfter:
          lineIndex === abstractValue.length - 1 ? 0 : docxConfig.article.abstractLineSpacingAfter,
      }),
    ),
  ];

  return paragraphs.join('');
}

function buildDocumentXml(articles: Article[], locale: SupportedLocale, exportedAt: Date) {
  const copy = resolveDocxExportCopy(locale);
  const page = docxConfig.page;
  const journalGroups = groupArticlesByJournal(articles, locale);
  const bodyParts: string[] = [
    paragraphXml(copy.documentTitle, {
      bold: true,
      fontSize: docxConfig.document.titleFontSize,
      spacingAfter: docxConfig.document.titleSpacingAfter,
    }),
    paragraphXml(`${copy.articleCount}: ${articles.length}`, {
      spacingAfter: docxConfig.document.articleCountSpacingAfter,
    }),
    paragraphXml(`${copy.exportedAt}: ${formatDateValue(exportedAt.toISOString(), locale)}`, {
      spacingAfter: docxConfig.document.exportedAtSpacingAfter,
    }),
    emptyParagraphXml(),
  ];

  journalGroups.forEach((group, groupIndex) => {
    bodyParts.push(
      paragraphXml(group.journalTitle, {
        bold: true,
        fontSize: docxConfig.journal.titleFontSize,
        spacingBefore: groupIndex === 0 ? 0 : docxConfig.journal.titleSpacingBefore,
        spacingAfter: docxConfig.journal.titleSpacingAfter,
      }),
    );

    group.articles.forEach((article, articleIndex) => {
      bodyParts.push(articleParagraphsXml(article, articleIndex, locale));
      if (articleIndex < group.articles.length - 1) {
        bodyParts.push(emptyParagraphXml());
      }
    });

    if (groupIndex < journalGroups.length - 1) {
      bodyParts.push(pageBreakXml());
    }
  });

  bodyParts.push(
    '<w:sectPr>' +
      `<w:pgSz w:w="${page.width}" w:h="${page.height}"/>` +
      `<w:pgMar w:top="${page.marginTop}" w:right="${page.marginRight}" w:bottom="${page.marginBottom}" w:left="${page.marginLeft}" w:header="${page.marginHeader}" w:footer="${page.marginFooter}" w:gutter="${page.marginGutter}"/>` +
      '</w:sectPr>',
  );

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    bodyParts.join(''),
    '</w:body>',
    '</w:document>',
  ].join('');
}

function buildContentTypesXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join('');
}

function buildRootRelationshipsXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildAppPropertiesXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
    '<Application>Literature Studio</Application>',
    '</Properties>',
  ].join('');
}

function buildCorePropertiesXml(exportedAt: Date) {
  const timestamp = escapeXml(exportedAt.toISOString());
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    '<dc:title>Literature Studio Batch Export</dc:title>',
    '<dc:creator>Literature Studio</dc:creator>',
    '<cp:lastModifiedBy>Literature Studio</cp:lastModifiedBy>',
    `<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>`,
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>`,
    '</cp:coreProperties>',
  ].join('');
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  };
}

function buildZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const timestamp = toDosDateTime(new Date());
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name.replace(/\\/g, '/'));
    const dataBuffer = entry.data;
    const entryCrc = crc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(timestamp.time, 10);
    localHeader.writeUInt16LE(timestamp.date, 12);
    localHeader.writeUInt32LE(entryCrc, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(timestamp.time, 12);
    centralHeader.writeUInt16LE(timestamp.date, 14);
    centralHeader.writeUInt32LE(entryCrc, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endOfCentralDirectory]);
}

function buildDocxBuffer(articles: Article[], locale: SupportedLocale) {
  const exportedAt = new Date();
  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(buildContentTypesXml(), 'utf8'),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(buildRootRelationshipsXml(), 'utf8'),
    },
    {
      name: 'docProps/app.xml',
      data: Buffer.from(buildAppPropertiesXml(), 'utf8'),
    },
    {
      name: 'docProps/core.xml',
      data: Buffer.from(buildCorePropertiesXml(exportedAt), 'utf8'),
    },
    {
      name: 'word/document.xml',
      data: Buffer.from(buildDocumentXml(articles, locale, exportedAt), 'utf8'),
    },
  ];

  return buildZip(entries);
}

function normalizeDocxPath(filePath: string) {
  return filePath.toLowerCase().endsWith('.docx') ? filePath : `${filePath}.docx`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function buildBatchDocxFileName(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = pad(referenceDate.getMonth() + 1);
  const day = pad(referenceDate.getDate());
  const hours = pad(referenceDate.getHours());
  const minutes = pad(referenceDate.getMinutes());
  const seconds = pad(referenceDate.getSeconds());

  return `${docxConfig.fileNamePrefix}-${year}${month}${day}-${hours}${minutes}${seconds}.docx`;
}

export async function exportArticlesToDocxFile({
  articles,
  filePath,
  locale = 'zh',
}: {
  articles: Article[];
  filePath: string;
  locale?: SupportedLocale;
}): Promise<DocxExportResult> {
  if (articles.length === 0) {
    throw appError('DOCX_EXPORT_NO_ARTICLES');
  }

  const outputPath = normalizeDocxPath(filePath);

  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buildDocxBuffer(articles, locale));
  } catch (error) {
    throw appError('DOCX_EXPORT_FAILED', {
      filePath: outputPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    filePath: outputPath,
    articleCount: articles.length,
  };
}
