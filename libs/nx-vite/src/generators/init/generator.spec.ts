import { addDependenciesToPackageJson, readJson, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { nxVersion } from '../../utils/versions';

import viteInitGenerator from './generator';

describe('init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add web dependencies', async () => {
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

  it('should not add jest config if unitTestRunner is none', async () => {
    await viteInitGenerator(tree, {
      unitTestRunner: 'none',
    });
    expect(tree.exists('jest.config.js')).toBe(false);
  });

  describe('babel config', () => {
    it('should create babel config if not present', async () => {
      await viteInitGenerator(tree, {
        unitTestRunner: 'none',
      });
      expect(tree.exists('babel.config.json')).toBe(true);
    });

    it('should not overwrite existing babel config', async () => {
      tree.write('babel.config.json', '{ "preset": ["preset-awesome"] }');

      await viteInitGenerator(tree, {
        unitTestRunner: 'none',
      });

      const existing = readJson(tree, 'babel.config.json');
      expect(existing).toEqual({ preset: ['preset-awesome'] });
    });

    it('should not overwrite existing babel config (.js)', async () => {
      tree.write('/babel.config.js', 'module.exports = () => {};');
      await viteInitGenerator(tree, {
        unitTestRunner: 'none',
      });
      expect(tree.exists('babel.config.json')).toBe(false);
    });
  });
});
