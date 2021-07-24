import { build } from 'esbuild';
import { BuildExecutorSchema } from './schema';
import { FsTree } from '@nrwl/tao/src/shared/tree';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';
import esbuildTransform from '@chialab/esbuild-plugin-transform';
import esbuildSwc from '@chialab/esbuild-plugin-swc';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  if (!context.projectName) {
    throw new Error('No projectName');
  }
  const tree = new FsTree(context.cwd, context.isVerbose);
  await build({
    entryPoints: options.entryPoints.map((i) => tree.root + '/' + i),
    bundle: true,
    platform: 'node',
    outdir: tree.root + '/' + options.outputPath,
    keepNames: true,
    sourcemap: true,
    logLevel: 'debug',
    plugins: [
      esbuildTransform([
        (await import('@chialab/esbuild-plugin-swc')).default(),
      ]),
    ],
  });

  return {
    success: true,
  };
}
