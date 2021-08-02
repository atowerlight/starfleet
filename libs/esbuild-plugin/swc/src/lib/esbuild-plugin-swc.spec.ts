import { esbuildPluginSwc } from './esbuild-plugin-swc';

describe('esbuildPluginSwc', () => {
  it('should work', () => {
    expect(esbuildPluginSwc()).toEqual('esbuild-plugin-swc');
  });
});
