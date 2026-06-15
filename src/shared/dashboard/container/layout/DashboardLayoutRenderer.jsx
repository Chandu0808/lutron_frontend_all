import React, { memo } from 'react';
import DashboardTabRenderer from './DashboardTabRenderer';
import {
  resolveDashboardSectionContent,
  resolveDashboardSectionKey,
  resolveDashboardSectionProps,
} from './dashboardLayoutResolvers';
import { dashboardLayoutRendererPropsAreEqual } from './dashboardLayoutMemoCompare';

function DashboardLayoutRendererInner({ activeTab, variant, sections, adapter }) {
  const sectionKey = resolveDashboardSectionKey(activeTab, adapter);
  if (!sectionKey) return null;

  const content = resolveDashboardSectionContent(activeTab, sections, adapter);
  if (content == null) return null;

  const sectionProps = resolveDashboardSectionProps(activeTab, adapter);

  return (
    <DashboardTabRenderer tabId={sectionKey} sectionProps={sectionProps}>
      {content}
    </DashboardTabRenderer>
  );
}

const DashboardLayoutRenderer = memo(
  DashboardLayoutRendererInner,
  dashboardLayoutRendererPropsAreEqual
);
DashboardLayoutRenderer.displayName = 'DashboardLayoutRenderer';

export default DashboardLayoutRenderer;
