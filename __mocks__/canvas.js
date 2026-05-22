/**
 * Jest auto-mock for the native `canvas` package.
 *
 * On dev boxes (e.g. Windows without the MSVC build chain) the pre-built
 * `canvas.node` binary is often compiled against a different Node ABI than
 * the one currently installed, which crashes jsdom's optional canvas
 * integration at test bootstrap.
 *
 * jsdom does a `require('canvas')` inside a try/catch and falls back to a
 * no-op when canvas isn't available, so substituting it with an empty module
 * lets the rest of the JS test suite run without affecting production code.
 *
 * This mock is intentionally minimal — it only exists to keep node-gyp / ABI
 * issues from breaking unrelated tests. Tests that need real <canvas>
 * functionality should not rely on this stub.
 */
module.exports = {};
module.exports.default = {};
