import { registerHooks } from 'node:module';

const TYPESCRIPT_MODULE = 'module-typescript';

// Node's type stripping needs explicit extensions, and the app sources use extensionless imports for the Angular bundler.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = resolveWithTypeScriptFallback(specifier, context, nextResolve);
    return resolved.url.endsWith('.ts') ? { ...resolved, format: TYPESCRIPT_MODULE } : resolved;
  },
});

function resolveWithTypeScriptFallback(specifier, context, nextResolve) {
  try {
    return nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !relative) throw error;
    return nextResolve(`${specifier}.ts`, context);
  }
}
