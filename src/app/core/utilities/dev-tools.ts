export function isDevToolsEnabled(search: string, production: boolean): boolean {
  return new URLSearchParams(search).get('dev') === '1' || !production;
}
