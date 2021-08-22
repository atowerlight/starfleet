import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';

describe('nx-vite e2e', () => {
  it('should create nx-vite', async () => {
    const plugin = uniq('nx-vite');
    ensureNxProject('@starfleet/nx-vite', 'dist/libs/nx-vite');
    await runNxCommandAsync(
      `generate @starfleet/nx-vite:application ${plugin}`
    );

    // const result = await runNxCommandAsync(`build ${plugin}`);
    // expect(result.stdout).toContain('Executor ran');
  }, 30000);

  it('should create nx-vite lib', async () => {
    const plugin = uniq('nx-vite');
    ensureNxProject('@starfleet/nx-vite', 'dist/libs/nx-vite');
    await runNxCommandAsync(
      `generate @starfleet/nx-vite:lib ${plugin} --importPath @st/test`
    );

    // const result = await runNxCommandAsync(`build ${plugin}`);
    // expect(result.stdout).toContain('Executor ran');
  }, 300000);

  describe('--directory', () => {
    it('should create src in the specified directory', async () => {
      const plugin = uniq('nx-vite');
      ensureNxProject('@starfleet/nx-vite', 'dist/libs/nx-vite');
      await runNxCommandAsync(
        `generate @starfleet/nx-vite:application ${plugin} --directory subdir`
      );
      expect(() =>
        checkFilesExist(`libs/subdir/${plugin}/src/index.ts`)
      ).not.toThrow();
    }, 30000);
  });

  describe('--tags', () => {
    it('should add tags to nx.json', async () => {
      const plugin = uniq('nx-vite');
      ensureNxProject('@starfleet/nx-vite', 'dist/libs/nx-vite');
      await runNxCommandAsync(
        `generate @starfleet/nx-vite:nx-vite ${plugin} --tags e2etag,e2ePackage`
      );
      const nxJson = readJson('nx.json');
      expect(nxJson.projects[plugin].tags).toEqual(['e2etag', 'e2ePackage']);
    }, 30000);
  });
});
