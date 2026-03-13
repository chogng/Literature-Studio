export type DocxExportConfig = {
  fileNamePrefix: string;
  document: {
    titleFontSize: number;
    titleSpacingAfter: number;
    articleCountSpacingAfter: number;
    exportedAtSpacingAfter: number;
  };
  article: {
    titleFontSize: number;
    titleSpacingBefore: number;
    titleSpacingAfter: number;
    metadataSpacingAfter: number;
    fetchedAtSpacingAfter: number;
    abstractLabelSpacingAfter: number;
    abstractLineSpacingAfter: number;
  };
  journal: {
    titleFontSize: number;
    titleSpacingBefore: number;
    titleSpacingAfter: number;
  };
  page: {
    width: number;
    height: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    marginHeader: number;
    marginFooter: number;
    marginGutter: number;
  };
};

// Keep a single default export style so all DOCX files are consistent.
export const defaultDocxExportConfig: Readonly<DocxExportConfig> = {
  fileNamePrefix: 'literature-batch',
  document: {
    titleFontSize: 36,
    titleSpacingAfter: 200,
    articleCountSpacingAfter: 80,
    exportedAtSpacingAfter: 160,
  },
  article: {
    titleFontSize: 30,
    titleSpacingBefore: 160,
    titleSpacingAfter: 180,
    metadataSpacingAfter: 80,
    fetchedAtSpacingAfter: 120,
    abstractLabelSpacingAfter: 60,
    abstractLineSpacingAfter: 60,
  },
  journal: {
    titleFontSize: 34,
    titleSpacingBefore: 200,
    titleSpacingAfter: 120,
  },
  page: {
    width: 11906,
    height: 16838,
    marginTop: 1440,
    marginRight: 1440,
    marginBottom: 1440,
    marginLeft: 1440,
    marginHeader: 708,
    marginFooter: 708,
    marginGutter: 0,
  },
};
