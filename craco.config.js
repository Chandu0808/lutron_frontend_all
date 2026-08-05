const path = require('path');

module.exports = {
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