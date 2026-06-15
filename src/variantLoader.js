import { getUiVariant } from './utils/uiVariant';

/**
 * Load the active variant's App, Redux store, theme provider, and error boundary.
 * Webpack needs static import paths — one branch per variant.
 */
export async function loadVariantModules() {
  const variant = getUiVariant();

  if (variant === 'advanced') {
    const [appMod, storeMod, themeMod, errMod] = await Promise.all([
      import('./variants/advanced/App'),
      import('./variants/advanced/redux/store'),
      import('./variants/advanced/screens/settings/theme/ThemeContext'),
      import('./variants/advanced/components/ErrorBoundary'),
    ]);
    return {
      App: appMod.default,
      store: storeMod.store,
      ThemeProviderCustom: themeMod.ThemeProviderCustom,
      ErrorBoundary: errMod.default,
      redirectToLogin: errMod.redirectToLogin,
      redirectFlagKey: errMod.redirectFlagKey,
    };
  }

  if (variant === 'customized') {
    const [appMod, storeMod, themeMod, errMod] = await Promise.all([
      import('./variants/customized/App'),
      import('./variants/customized/redux/store'),
      import('./variants/customized/screens/settings/theme/ThemeContext'),
      import('./variants/customized/components/ErrorBoundary'),
    ]);
    return {
      App: appMod.default,
      store: storeMod.store,
      ThemeProviderCustom: themeMod.ThemeProviderCustom,
      ErrorBoundary: errMod.default,
      redirectToLogin: errMod.redirectToLogin,
      redirectFlagKey: errMod.redirectFlagKey,
    };
  }

  const [appMod, storeMod, themeMod, errMod] = await Promise.all([
    import('./variants/basic/App'),
    import('./variants/basic/redux/store'),
    import('./variants/basic/screens/settings/theme/ThemeContext'),
    import('./variants/basic/components/ErrorBoundary'),
  ]);
  return {
    App: appMod.default,
    store: storeMod.store,
    ThemeProviderCustom: themeMod.ThemeProviderCustom,
    ErrorBoundary: errMod.default,
    redirectToLogin: errMod.redirectToLogin,
    redirectFlagKey: errMod.redirectFlagKey,
  };
}
