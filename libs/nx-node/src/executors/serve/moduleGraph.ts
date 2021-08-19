import chokidar, { FSWatcher } from 'chokidar';

import { TransformResult } from './transformRequest';
import path from 'path';
import * as os from 'os';
import { LoadModuleInside } from './loadModule';

export class ModuleNode {
  /**
   * Public served url path, starts with /
   */
  url: string;
  importers = new Set<ModuleNode>();
  importedModules = new Set<ModuleNode>();
  ssrTransformResult: TransformResult | undefined = undefined;
  ssrModule: Record<string, unknown> | undefined = undefined;

  constructor(url: string) {
    this.url = url;
  }
}

export class ModuleGraph {
  urlToModuleMap = new Map<string, ModuleNode>();

  async ensureEntryFromUrl(url: string): Promise<ModuleNode> {
    let mod = this.urlToModuleMap.get(url);
    if (!mod) {
      mod = new ModuleNode(url);
      this.urlToModuleMap.set(url, mod);
    }
    return mod;
  }

  getModuleByUrl(url: string): ModuleNode | undefined {
    return this.urlToModuleMap.get(url);
  }

  onFileChange(file: string): void {
    const mod = this.getModuleByUrl(file);
    if (mod) {
      mod.ssrTransformResult = undefined;
      mod.ssrModule = undefined;
    }
  }
}

export function slash(p: string): string {
  return p.replace(/\\/g, '/');
}

export const isWindows = os.platform() === 'win32';

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

async function* chokidarWatch(watcher: FSWatcher) {
  let resolve: (arg: string) => void;
  let promise = new Promise<string>((r) => (resolve = r));

  watcher.on('change', (file) => {
    resolve(file);
    promise = new Promise((r) => (resolve = r));
  });

  watcher.on('unlink', async (file) => {
    resolve(file);
    promise = new Promise((r) => (resolve = r));
  });

  while (true) {
    yield await promise;
  }
}

export function watch(url: string) {
  return async function* () {
    const watcher = chokidar.watch(path.resolve(process.cwd()), {
      ignored: ['**/node_modules/**', '**/.git/**'],
      ignoreInitial: true,
      ignorePermissionErrors: true,
      disableGlobbing: true,
    });

    // 第一次先 yield 出去
    yield LoadModuleInside(url);

    for await (const file of chokidarWatch(watcher)) {
      const normalizeFile = normalizePath(file);
      // 删除 file
      moduleGraph.onFileChange(normalizeFile);

      // 每次更新创建新的 promise 并 yield 出去
      yield LoadModuleInside(url);
    }
  };
}

export const moduleGraph = new ModuleGraph();
