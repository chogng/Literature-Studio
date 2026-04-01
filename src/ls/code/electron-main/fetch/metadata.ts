export {
  extractAuthors,
  extractDoi,
  extractPublishedDate,
  extractArticleType,
  extractAbstract,
  extractDescription,
  extractTitle,
  extractFigures as extractNatureFigures,
} from './normalize.js';
export { extractStructuredDataItems, type StructuredDataRecord } from './rawMetadata.js';
export {
  extractNatureFigureCaptions,
  extractNatureMainText,
  extractNatureReferenceTexts,
  extractNatureHeaderAuthors,
  extractNatureAbstract,
  isNatureArticlePage,
} from './sites/nature.js';
