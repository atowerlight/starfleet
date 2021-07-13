import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
describe('application e2e', () => {
  it('should create nx-node', async () => {
    const plugin = uniq('nx-node');
    ensureNxProject('@starfleet/nx-node', 'dist/libs/nx-node');
    await runNxCommandAsync(
      `generate @starfleet/nx-node:application ${plugin}`
    );

    // const result = await runNxCommandAsync(`build ${plugin}`);
    // expect(result.stdout).toContain('Executor ran');
  }, 120000);

  describe('--directory', () => {
    it('should create src in the specified directory', async () => {
      const plugin = uniq('application');
      ensureNxProject('@starfleet/nx-node', 'dist/libs/nx-node');
      await runNxCommandAsync(
        `generate @starfleet/nx-node:application ${plugin} --directory subdir`
      );
      expect(() =>
        checkFilesExist(`libs/subdir/${plugin}/src/index.ts`)
      ).not.toThrow();
    }, 120000);
  });

  describe('--tags', () => {
    it('should add tags to nx.json', async () => {
      const plugin = uniq('application');
      ensureNxProject('@starfleet/nx-node', 'dist/libs/nx-node');
      await runNxCommandAsync(
        `generate @starfleet/nx-node:application ${plugin} --tags e2etag,e2ePackage`
      );
      const nxJson = readJson('nx.json');
      expect(nxJson.projects[plugin].tags).toEqual(['e2etag', 'e2ePackage']);
    }, 120000);
  });
});
