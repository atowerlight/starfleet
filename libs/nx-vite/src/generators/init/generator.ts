import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { setDefaultCollection } from '@nrwl/workspace/src/utilities/set-default-collection';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { InitGeneratorSchema } from './schema';
import { nxVersion, viteVersion } from '../../utils/versions';

function updateDependencies(tree: Tree) {
  // 先删除了再添加
  updateJson(tree, 'package.json', (json) => {
    delete json.dependencies['@starfleet/nx-vite'];
    return json;
  });

  return addDependenciesToPackageJson(
    tree,
    {
      react: '^17.0.0',
      'react-dom': '^17.0.0',
    },
    {
      '@types/react': '^17.0.0',
      '@types/react-dom': '^17.0.0',
      '@vitejs/plugin-react-refresh': '^1.3.1',
      vite: viteVersion,
      '@starfleet/nx-vite': nxVersion,
    }
  );
}

/**
 * 添加 @starfleet/nx-vite 依赖
 * @param tree
 * @param schema
 */
export async function viteInitGenerator(
  tree: Tree,
  schema: InitGeneratorSchema
) {
  const tasks: GeneratorCallback[] = [];

  setDefaultCollection(tree, '@starfleet/nx-vite');

  // 暂时去掉 jest vite 官方还没计划
  // if (!schema.unitTestRunner || schema.unitTestRunner === 'jest') {
  //   const jestTask = jestInitGenerator(tree, {});
  //   tasks.push(jestTask);
  // }
  const installTask = updateDependencies(tree);
  tasks.push(installTask);
  if (!schema.skipFormat) {
    // 使用 Prettier 进行格式化
    await formatFiles(tree);
  }
  return runTasksInSerial(...tasks);
}

export default viteInitGenerator;
