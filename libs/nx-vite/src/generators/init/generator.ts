import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  Tree,
  updateJson,
  writeJson,
} from '@nrwl/devkit';
import { setDefaultCollection } from '@nrwl/workspace/src/utilities/set-default-collection';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { InitGeneratorSchema } from './schema';
import { nxVersion } from '../../utils/versions';
import { jestInitGenerator } from '@nrwl/jest';

function updateDependencies(tree: Tree) {
  updateJson(tree, 'package.json', (json) => {
    delete json.dependencies['@starfleet/nx-vite'];
    return json;
  });

  return addDependenciesToPackageJson(
    tree,
    {
      // tslib: '^2.0.0',
    },
    {
      '@starfleet/nx-vite': nxVersion,
    }
  );
}

function initRootBabelConfig(tree: Tree) {
  if (tree.exists('/babel.config.json') || tree.exists('/babel.config.js')) {
    return;
  }

  writeJson(tree, '/babel.config.json', {
    babelrcRoots: ['*'], // Make sure .babelrc files other than root can be loaded in a monorepo
  });
}

export async function viteInitGenerator(
  tree: Tree,
  schema: InitGeneratorSchema
) {
  const tasks: GeneratorCallback[] = [];

  setDefaultCollection(tree, '@starfleet/nx-vite');

  if (!schema.unitTestRunner || schema.unitTestRunner === 'jest') {
    const jestTask = jestInitGenerator(tree, {});
    tasks.push(jestTask);
  }
  const installTask = updateDependencies(tree);
  tasks.push(installTask);
  initRootBabelConfig(tree);
  if (!schema.skipFormat) {
    await formatFiles(tree);
  }
  return runTasksInSerial(...tasks);
}

export default viteInitGenerator;
