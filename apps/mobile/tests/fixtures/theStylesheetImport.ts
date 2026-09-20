/**
 * What `import '../../global.css'` resolves to under the runner.
 *
 * The bundler turns that import into the compiled stylesheet and hands it to NativeWind. The
 * runner has no bundler, so the import resolves here and comes to nothing, and a test that needs
 * the theme compiles it for itself through `theTheme.ts`.
 */
export {};
