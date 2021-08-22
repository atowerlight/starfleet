import { FsTree } from '@nrwl/tao/src/shared/tree';
import { loadConfig } from 'tsconfig-paths';

export function calcAlias(tree: FsTree, appRoot: string) {
  const config = loadConfig(tree.root + '/' + appRoot + '/tsconfig.json');

  if (config.resultType === 'failed') {
    return {};
  } else {
    const alias: Record<string, string> = {};
    Object.entries(config.paths).forEach(([name, pathArray]) => {
      alias[name] = config.absoluteBaseUrl + '/' + pathArray[0];
    });
    return alias;
  }
}
