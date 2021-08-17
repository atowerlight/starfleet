import { esbuildPluginAutoExternal } from './esbuild-plugin-auto-external';

describe('esbuildPluginAutoExternal', () => {
  it('should work', () => {
    expect(esbuildPluginAutoExternal()).toEqual('esbuild-plugin-auto-external');
  });
});
