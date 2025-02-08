import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.js'],
    format: ['esm'],
    outDir: 'dist',
    dts: false,
    splitting: false,
    minify: false,
    bundle: true,
    target: 'esnext',

    // esbuildOptions(options) {
    //     options.outExtension = { ".js": ".js" }; // Preserve .js extension in imports
    // },
});
