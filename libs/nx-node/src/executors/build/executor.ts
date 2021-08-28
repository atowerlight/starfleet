import { build } from 'esbuild';
import { BuildExecutorSchema } from './schema';
import { FsTree } from '@nrwl/tao/src/shared/tree';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';

import auto from '@starfleet/esbuild-plugin-auto-external';
import transform from '@starfleet/esbuild-plugin-transform';
import swc from '@starfleet/esbuild-plugin-swc';
import node from '@starfleet/esbuild-plugin-native-node';

import * as fs from 'fs';

export default async function* runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  if (!context.projectName) {
    throw new Error('No projectName');
  }
  const tree = new FsTree(context.cwd, context.isVerbose);
  const r = await build({
    entryPoints: options.entryPoints.map((i) => tree.root + '/' + i),
    bundle: true,
    metafile: true,
    platform: 'node',
    outdir: tree.root + '/' + options.outputPath,
    keepNames: true,
    sourcemap: true,
    logLevel: 'debug',
    plugins: [auto(), node(), transform([swc()])],
  });

  fs.writeFileSync(
    tree.root + '/' + options.outputPath + '/meta.json',
    JSON.stringify(r.metafile)
  );

  yield {
    success: true,
  };
}
