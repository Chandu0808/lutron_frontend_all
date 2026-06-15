import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getUiVariant } from './utils/uiVariant';
import { loadVariantModules } from './variantLoader';
import { installGlobalAuthHandlers } from './installGlobalAuthHandlers';

const variant = getUiVariant();
if (variant === 'advanced') {
  require('./variants/advanced/index.css');
} else if (variant === 'customized') {
  require('./variants/customized/index.css');
} else {
  require('./variants/basic/index.css');
}

function VariantRoot() {
  const [modules, setModules] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadVariantModules()
      .then((loaded) => {
        if (cancelled) return;
        installGlobalAuthHandlers(loaded.redirectToLogin, loaded.redirectFlagKey);
        setModules(loaded);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        Failed to load UI ({variant}). {String(loadError?.message || loadError)}
      </Box>
    );
  }

  if (!modules) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const { App, store, ThemeProviderCustom, ErrorBoundary } = modules;

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Provider store={store}>
          <ThemeProviderCustom>
            <App />
          </ThemeProviderCustom>
        </Provider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Suspense
    fallback={
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    }
  >
    <VariantRoot />
  </Suspense>
);
