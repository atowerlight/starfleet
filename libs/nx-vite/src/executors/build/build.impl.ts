import { BuildExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';
import { FsTree } from '@nrwl/tao/src/shared/tree';
import { build } from 'vite';

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
    root: tree.root + '/' + appRoot,
    build: {
      outDir: tree.root + '/' + options.outputPath,
    },
  });

  return {
    success: true,
  };
}
