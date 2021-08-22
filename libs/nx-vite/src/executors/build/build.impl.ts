import { BuildExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';
import { FsTree } from '@nrwl/tao/src/shared/tree';

import { build } from 'vite';
import { calcAlias } from '../../utils/calcAlias';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  if (!context.projectName) {
    throw new Error('No projectName');
  }
  const tree = new FsTree(context.cwd, context.isVerbose);
  const appRoot = context.workspace.projects[context.projectName].root;

  await build({
    configFile: tree.root + '/' + appRoot + '/vite.config.ts',
    resolve: {
      alias: calcAlias(tree, appRoot),
    },
    root: tree.root + '/' + appRoot,
    build: {
      emptyOutDir: true,
      outDir: tree.root + '/' + options.outputPath,
    },
  });

  return {
    success: true,
  };
}
