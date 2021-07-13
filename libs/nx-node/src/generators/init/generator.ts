import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { nxNodeVersions } from '../../utils/versions';
import { InitGeneratorSchema } from './schema';
import { setDefaultCollection } from '@nrwl/workspace/src/utilities/set-default-collection';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';

function updateDependencies(tree: Tree) {
  updateJson(tree, 'package.json', (json) => {
    delete json.dependencies['@nrwl/node'];
    return json;
  });

  return addDependenciesToPackageJson(
    tree,
    {},
    { '@starfleet/nx-node': nxNodeVersions }
  );
}

export async function initGenerator(tree: Tree, schema: InitGeneratorSchema) {
  const tasks: GeneratorCallback[] = [];
  setDefaultCollection(tree, '@nrwl/node');

  const installTask = updateDependencies(tree);
  tasks.push(installTask);
  if (!schema.skipFormat) {
    // 使用 Prettier 进行格式化
    await formatFiles(tree);
  }
  return runTasksInSerial(...tasks);
}

export default initGenerator;
