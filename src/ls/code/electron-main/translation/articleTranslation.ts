import type { Article } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { cleanText } from '../../../base/common/strings.js';
import type { StorageService } from '../../../platform/storage/common/storage.js';
import { translateTextsToChinese } from './translationRouter.js';

export type TranslatableArticleField = 'descriptionText' | 'abstractText';

export type PreferredArticleTranslationContent = {
  field: TranslatableArticleField;
  text: string;
};

export function resolvePreferredArticleTranslationContent(
  article: Article,
): PreferredArticleTranslationContent | null {
  const description = cleanText(article.descriptionText);
  if (description) {
    return {
      field: 'descriptionText',
      text: description,
    };
  }

  const abstract = cleanText(article.abstractText);
  if (abstract) {
    return {
      field: 'abstractText',
      text: abstract,
    };
  }

  return null;
}

export async function translateArticlesToChinese(
  articles: Article[],
  storage: StorageService,
): Promise<Article[]> {
  const selectedContent = articles
    .map((article, index) => {
      const preferredContent = resolvePreferredArticleTranslationContent(article);
      return preferredContent ? { index, ...preferredContent } : null;
    })
    .filter((item): item is { index: number; field: TranslatableArticleField; text: string } => Boolean(item));

  if (selectedContent.length === 0) {
    return articles;
  }

  const settings = await storage.loadSettings();
  const translatedTexts = await translateTextsToChinese(
    selectedContent.map((item) => item.text),
    settings.llm,
    settings.translation,
    storage,
  );
  const translatedArticles = [...articles];

  selectedContent.forEach((item, index) => {
    translatedArticles[item.index] = {
      ...translatedArticles[item.index],
      [item.field]: translatedTexts[index],
    };
  });

  return translatedArticles;
}
