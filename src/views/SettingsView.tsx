import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, FolderOpen } from 'lucide-react';
import type { SettingsViewProps } from './types';

export default function SettingsView({
  labels,
  isSettingsLoading,
  locale,
  onLocaleChange,
  homepageUrl,
  onHomepageUrlChange,
  batchLimit,
  onBatchLimitChange,
  sameDomainOnly,
  onSameDomainOnlyChange,
  pdfDownloadDir,
  onPdfDownloadDirChange,
  onChoosePdfDownloadDir,
  desktopRuntime,
  isSettingsSaving,
  onResetDownloadDir,
  onSaveSettings,
}: SettingsViewProps) {
  return (
    <main className="settings-page">
      <section className="panel settings-card">
        <div className="panel-title">{labels.settingsTitle}</div>
        <div className="settings-content">
          {isSettingsLoading ? <p className="settings-hint">{labels.settingsLoading}</p> : null}

          <div className="settings-field">
            <span>{labels.settingsLanguage}</span>
            <div className="settings-language-toggle" role="group" aria-label={labels.settingsLanguage}>
              <button
                type="button"
                className={locale === 'zh' ? 'settings-language-btn is-active' : 'settings-language-btn'}
                onClick={() => onLocaleChange('zh')}
                aria-pressed={locale === 'zh'}
              >
                {labels.languageChinese}
              </button>
              <button
                type="button"
                className={locale === 'en' ? 'settings-language-btn is-active' : 'settings-language-btn'}
                onClick={() => onLocaleChange('en')}
                aria-pressed={locale === 'en'}
              >
                {labels.languageEnglish}
              </button>
            </div>
            <p className="settings-hint">{labels.settingsLanguageHint}</p>
          </div>

          <label className="settings-field">
            {labels.settingsHomepageUrl}
            <input
              className="settings-input"
              type="text"
              value={homepageUrl}
              onChange={(event) => onHomepageUrlChange(event.target.value)}
              placeholder={labels.homepageUrlPlaceholder}
            />
          </label>

          <div className="settings-field">
            <span>{labels.settingsBatchOptions}</span>
            <div className="settings-batch-options">
              <label className="inline-field" htmlFor="settings-batch-limit">
                {labels.batchCount}
                <input
                  id="settings-batch-limit"
                  className="number-input"
                  type="number"
                  min={1}
                  max={20}
                  value={batchLimit}
                  onChange={(event) => onBatchLimitChange(event.target.value)}
                />
              </label>
              <label className="inline-field checkbox-field" htmlFor="settings-same-domain-only">
                <Checkbox.Root
                  id="settings-same-domain-only"
                  className="radix-checkbox"
                  checked={sameDomainOnly}
                  onCheckedChange={(checked: boolean | 'indeterminate') => onSameDomainOnlyChange(checked === true)}
                >
                  <Checkbox.Indicator className="radix-checkbox-indicator">
                    <Check size={12} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                {labels.sameDomainOnly}
              </label>
            </div>
            <p className="settings-hint">{labels.settingsBatchHint}</p>
          </div>

          <label className="settings-field">
            {labels.defaultPdfDir}
            <div className="settings-input-row">
              <input
                className="settings-input"
                type="text"
                value={pdfDownloadDir}
                onChange={(event) => onPdfDownloadDirChange(event.target.value)}
                placeholder={labels.downloadDirPlaceholder}
              />
              <button
                className="icon-btn"
                type="button"
                onClick={onChoosePdfDownloadDir}
                disabled={!desktopRuntime || isSettingsSaving}
                title={labels.chooseDirectory}
                aria-label={labels.chooseDirectory}
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </label>

          <div className="settings-actions">
            <button
              type="button"
              onClick={onResetDownloadDir}
              disabled={!pdfDownloadDir.trim() || isSettingsSaving}
            >
              {labels.resetDefault}
            </button>
            <button
              className="primary-btn"
              type="button"
              onClick={onSaveSettings}
              disabled={isSettingsLoading || isSettingsSaving}
            >
              {isSettingsSaving ? labels.saving : labels.saveSettings}
            </button>
          </div>

          <p className="settings-hint">{labels.settingsHintPath}</p>
          <p className="settings-hint">
            {labels.currentDir}{pdfDownloadDir.trim() ? pdfDownloadDir.trim() : labels.systemDownloads}
          </p>
        </div>
      </section>
    </main>
  );
}
