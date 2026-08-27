const path = require('path');

module.exports = {
  // Skip ESLintWebpackPlugin during `craco start` / `craco build`.
  // Does not change bundled JS, variants, or runtime behavior — only removes
  // compile-time linting (saves RAM/CPU). Use `npm run lint` when you want ESLint.
  eslint: {
    enable: false,
  },
  webpack: {
    alias: {
      'pdfjs-dist': path.resolve(__dirname, 'node_modules/pdfjs-dist'),
    },
    configure: (webpackConfig, { env }) => {
      // No source maps: avoids react-datepicker warnings in dev, and keeps
      // production DevTools from mapping back to original src/ files.
      // App runtime behavior is unchanged; also set GENERATE_SOURCEMAP=false.
      if (env === 'development' || env === 'production') {
        webpackConfig.devtool = false;
      }

      // Add ignoreWarnings as backup
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Failed to parse source map/,
        /react-datepicker/,
        /ENOENT: no such file or directory/,
      ];

      return webpackConfig;
    },
  },
};
