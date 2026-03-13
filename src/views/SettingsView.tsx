import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import './SettingsView.css';
import type { SettingsViewProps } from './types';

export default function SettingsView({
  labels,
  isSettingsLoading,
  locale,
  onLocaleChange,
  batchSources,
  onBatchSourceUrlChange,
  onBatchSourceJournalTitleChange,
  onAddBatchSource,
  onRemoveBatchSource,
  batchLimit,
  onBatchLimitChange,
  sameDomainOnly,
  onSameDomainOnlyChange,
  pdfDownloadDir,
  onPdfDownloadDirChange,
  onChoosePdfDownloadDir,
  desktopRuntime,
  configPath,
  isSettingsSaving,
  onResetDownloadDir,
  onSaveSettings,
}: SettingsViewProps) {
  return (
    <main className="settings-page">
      <section className="panel settings-card">
        <div className="panel-title settings-header">
          <span>{labels.settingsTitle}</span>
          <Button
            type="button"
            mode="text"
            variant="primary"
            textMode="with"
            iconMode="without"
            onClick={onSaveSettings}
            disabled={isSettingsLoading || isSettingsSaving}
          >
            {isSettingsSaving ? labels.saving : labels.saveSettings}
          </Button>
        </div>
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

          <div className="settings-field">
            <span>{labels.settingsHomepageUrl}</span>
            <div className="settings-url-list">
              {batchSources.map((source, index) => (
                <div key={source.id || `settings-batch-url-${index}`} className="settings-url-row">
                  <Input
                    className="settings-input-control"
                    size="sm"
                    type="text"
                    inputMode="url"
                    value={source.url}
                    onChange={(event) => onBatchSourceUrlChange(index, event.target.value)}
                    placeholder={labels.homepageUrlPlaceholder}
                    aria-label={`${labels.settingsHomepageUrl} ${index + 1}`}
                  />
                  <Input
                    className="settings-journal-control"
                    size="sm"
                    type="text"
                    value={source.journalTitle}
                    onChange={(event) => onBatchSourceJournalTitleChange(index, event.target.value)}
                    placeholder={labels.batchJournalTitlePlaceholder}
                    aria-label={`${labels.settingsBatchJournalTitle} ${index + 1}`}
                  />
                  <Button
                    type="button"
                    mode="icon"
                    variant="danger"
                    size="sm"
                    iconMode="with"
                    textMode="without"
                    onClick={() => onRemoveBatchSource(index)}
                    disabled={batchSources.length === 1 || isSettingsSaving}
                    title={labels.removeBatchUrl}
                    aria-label={labels.removeBatchUrl}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                mode="text"
                variant="outline"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={onAddBatchSource}
                disabled={isSettingsSaving}
              >
                {labels.addBatchUrl}
              </Button>
            </div>
            <p className="settings-hint">{labels.settingsHomepageUrlHint}</p>
          </div>

          <div className="settings-field">
            <span>{labels.settingsBatchOptions}</span>
            <div className="settings-batch-options">
              <label className="inline-field" htmlFor="settings-batch-limit">
                {labels.batchCount}
                <div className="settings-limit-input-wrap">
                  <Input
                    id="settings-batch-limit"
                    className="settings-limit-input"
                    size="sm"
                    type="number"
                    min={1}
                    max={20}
                    value={batchLimit}
                    onChange={(event) => onBatchLimitChange(event.target.value)}
                  />
                </div>
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
              <Input
                className="settings-input-control"
                size="sm"
                type="text"
                value={pdfDownloadDir}
                onChange={(event) => onPdfDownloadDirChange(event.target.value)}
                placeholder={labels.downloadDirPlaceholder}
              />
              <Button
                type="button"
                mode="icon"
                variant="secondary"
                size="sm"
                iconMode="with"
                textMode="without"
                onClick={onChoosePdfDownloadDir}
                disabled={!desktopRuntime || isSettingsSaving}
                title={labels.chooseDirectory}
                aria-label={labels.chooseDirectory}
              >
                <FolderOpen size={16} />
              </Button>
            </div>
          </label>

          <div className="settings-actions">
            <Button
              type="button"
              mode="text"
              variant="secondary"
              textMode="with"
              iconMode="without"
              onClick={onResetDownloadDir}
              disabled={!pdfDownloadDir.trim() || isSettingsSaving}
            >
              {labels.resetDefault}
            </Button>
          </div>

          <p className="settings-hint">{labels.settingsHintPath}</p>
          {configPath ? (
            <p className="settings-hint">
              {labels.settingsConfigPath}
              {configPath}
            </p>
          ) : null}
          <p className="settings-hint">
            {labels.currentDir}
            {pdfDownloadDir.trim() ? pdfDownloadDir.trim() : labels.systemDownloads}
          </p>
        </div>
      </section>
    </main>
  );
}

