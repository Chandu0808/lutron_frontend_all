import { buildChartApiParams } from '../../export/buildChartApiParams';
import { resolveSpaceExportThunks } from '../../export/spaceExportActionMap';
import {
  getExportErrorMessage,
  isExportActionFulfilled,
  isExportPayloadError,
} from '../../export/chartExportResults';

export function buildSpaceExportApiParams(selection = {}) {
  const customRange = selection.customDateRange || {};
  return buildChartApiParams({
    selectedAreas: selection.selectedAreas,
    selectedFloorIds: selection.selectedFloorIds,
    selectedGroupIds: selection.selectedGroupIds,
    timeRange: selection.selectedDuration,
    startDate: customRange.startDate ?? selection.customStartDate,
    endDate: customRange.endDate ?? selection.customEndDate,
    isNavigating: selection.isNavigating,
  });
}

export function resolveSpaceExportActions({ showChartsTab, dropdownKey, chartTitle }, thunks) {
  return resolveSpaceExportThunks({ showChartsTab, dropdownKey, chartTitle }, thunks);
}

export function resolveSpaceEmailExportOutcome(result) {
  if (!isExportActionFulfilled(result)) {
    return {
      ok: false,
      errorMessage: getExportErrorMessage(result),
      snackbarSeverity: 'error',
      snackbarPrefix: 'Email sending failed. Following is the error: ',
    };
  }

  if (isExportPayloadError(result.payload)) {
    return {
      ok: false,
      errorMessage: getExportErrorMessage(result),
      snackbarSeverity: 'error',
      snackbarPrefix: 'Email sending failed. Following is the error: ',
    };
  }

  return { ok: true };
}

export function resolveSpaceDownloadExportOutcome(result, { rejectedFallback } = {}) {
  if (isExportActionFulfilled(result)) {
    return { ok: true };
  }

  return {
    ok: false,
    errorMessage: result?.payload || rejectedFallback || 'Failed to download report. Please try again.',
    snackbarSeverity: 'error',
  };
}

export const SPACE_EXPORT_MESSAGE_PRESETS = {
  basic: {
    emailSuccess: (chartTitle) => `${chartTitle} report sent successfully!`,
    downloadSuccess: (chartTitle) => `${chartTitle} report downloaded successfully!`,
    downloadRejected: 'Failed to download report. Please try again.',
    downloadCatch: 'Failed to download report. Please try again.',
  },
  advanced: {
    emailSuccess: () => 'Email sent successfully!',
    downloadSuccess: () => 'Download started successfully!',
    downloadRejected: 'Failed to start download. Please try again.',
    downloadCatch: 'Failed to start download. Please try again.',
  },
  customized: {
    emailSuccess: () => 'Email sent successfully!',
    downloadSuccess: () => 'Download started successfully!',
    downloadRejected: 'Failed to start download. Please try again.',
    downloadCatch: 'Failed to start download. Please try again.',
  },
};

export function resolveSpaceExportMessages(preset = 'basic') {
  return SPACE_EXPORT_MESSAGE_PRESETS[preset] || SPACE_EXPORT_MESSAGE_PRESETS.basic;
}

export async function runSpaceEmailExport({
  dispatch,
  emailThunk,
  toEmail,
  apiParams,
  showSnackbar,
  successMessage,
}) {
  if (!emailThunk) {
    return { ok: false };
  }

  const result = await dispatch(emailThunk({ toEmail, ...apiParams }));
  const outcome = resolveSpaceEmailExportOutcome(result);

  if (outcome.ok) {
    showSnackbar(successMessage, 'success');
    return { ok: true, result };
  }

  showSnackbar(`${outcome.snackbarPrefix}${outcome.errorMessage}`, outcome.snackbarSeverity);
  return { ok: false, result };
}

export async function runSpaceDownloadExport({
  dispatch,
  downloadThunk,
  apiParams,
  showSnackbar,
  successMessage,
  rejectedFallback,
  catchMessage,
}) {
  if (!downloadThunk) {
    return { ok: false };
  }

  try {
    const result = await dispatch(downloadThunk(apiParams));
    const outcome = resolveSpaceDownloadExportOutcome(result, { rejectedFallback });

    if (outcome.ok) {
      showSnackbar(successMessage, 'success');
      return { ok: true, result };
    }

    showSnackbar(outcome.errorMessage, outcome.snackbarSeverity);
    return { ok: false, result };
  } catch (error) {
    showSnackbar(catchMessage, 'error');
    return { ok: false, error };
  }
}
