import React from 'react';
import ExportMenuPanel from './ExportMenuPanel';
import { buildEmailDownloadExportActions } from './ExportMenuActions';
import { EXPORT_MENU_COPY } from './exportMenuTheme';

export default function EnergyExportMenu({
  menuKey,
  isOpen,
  exportLoading,
  onEmail,
  onDownload,
  innerRef = null,
  preset,
  className,
  emailLabel,
  downloadLabel,
}) {
  if (!isOpen) return null;

  const actions = buildEmailDownloadExportActions({
    onEmail,
    onDownload,
    emailLoading: exportLoading[`${menuKey}_email`],
    downloadLoading: exportLoading[`${menuKey}_download`],
    emailLabel: emailLabel ?? EXPORT_MENU_COPY.email,
    downloadLabel: downloadLabel ?? EXPORT_MENU_COPY.download,
  });

  return (
    <ExportMenuPanel
      innerRef={innerRef}
      className={className}
      panelStyle={preset.panel}
      panelDataAttribute={preset.panelDataAttribute}
      actions={actions}
      itemDefaults={preset.item}
      useEmoji={preset.useEmoji}
    />
  );
}
