import { ServeExecutorSchema } from './schema';
import { FsTree } from '@nrwl/tao/src/shared/tree';
import { ExecutorContext } from '@nrwl/tao/src/shared/workspace';
import { createServer } from 'vite';
import { calcAlias } from '../../utils/calcAlias';

export default async function* runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  const tree = new FsTree(context.cwd, context.isVerbose);
  const appRoot = context.workspace.projects[context.projectName].root;

  try {
    const server = await createServer({
      root: tree.root + '/' + appRoot,
      resolve: {
        alias: calcAlias(tree, appRoot),
      },
    });

    await server.listen();

    yield {
      success: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await new Promise(() => {});
  } catch (e) {
    throw new Error(`Could not start production server.`);
  }
}
