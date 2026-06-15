import React, { memo, useMemo } from 'react';
import { DashboardLayoutRenderer } from './layout';
import { dashboardContainerPropsAreEqual } from './dashboardContainerMemoCompare';

function DashboardContainerInner({ variant, adapter, activeTab, runtime, orchestration }) {
  const sections = useMemo(
    () => adapter.buildSections({ orchestration, runtime, activeTab }),
    [adapter, orchestration, runtime, activeTab]
  );

  return (
    <DashboardLayoutRenderer
      activeTab={activeTab}
      variant={variant}
      adapter={adapter.layoutAdapter}
      sections={sections}
    />
  );
}

const DashboardContainer = memo(DashboardContainerInner, dashboardContainerPropsAreEqual);
DashboardContainer.displayName = 'DashboardContainer';

export default DashboardContainer;
