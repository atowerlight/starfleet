import { addDependenciesToPackageJson, readJson, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { nxVersion } from '../../utils/versions';

import viteInitGenerator from './generator';

describe('init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add nx-vite dependencies', async () => {
    const existing = 'existing';
    const existingVersion = '1.0.0';
    addDependenciesToPackageJson(
      tree,
      {
        '@starfleet/nx-vite': nxVersion,
        [existing]: existingVersion,
      },
      {
        [existing]: existingVersion,
      }
    );
    await viteInitGenerator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies['@starfleet/nx-vite']).toBeDefined();
    expect(packageJson.devDependencies[existing]).toBeDefined();
    expect(packageJson.dependencies['@starfleet/nx-vite']).toBeUndefined();
    expect(packageJson.dependencies[existing]).toBeDefined();
  });

  describe('defaultCollection', () => {
    it('should be set if none was set before', async () => {
      await viteInitGenerator(tree, {});
      const workspaceJson = readJson(tree, 'workspace.json');
      expect(workspaceJson.cli.defaultCollection).toEqual('@starfleet/nx-vite');
    });
  });

  // it('should not add jest config if unitTestRunner is none', async () => {
  //   await viteInitGenerator(tree, {
  //     unitTestRunner: 'none',
  //   });
  //   expect(tree.exists('jest.config.js')).toBe(false);
  // });
});
