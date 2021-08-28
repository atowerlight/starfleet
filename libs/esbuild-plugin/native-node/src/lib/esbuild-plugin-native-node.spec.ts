import { esbuildPluginNativeNode } from './esbuild-plugin-native-node';

describe('esbuildPluginNativeNode', () => {
  it('should work', () => {
    expect(esbuildPluginNativeNode()).toEqual('esbuild-plugin-native-node');
  });
});
