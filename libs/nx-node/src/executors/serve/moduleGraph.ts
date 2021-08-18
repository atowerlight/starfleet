import { TransformResult } from './transformRequest';

export class ModuleNode {
  /**
   * Public served url path, starts with /
   */
  url: string;
  importers = new Set<ModuleNode>();
  importedModules = new Set<ModuleNode>();
  ssrTransformResult: TransformResult | null = null;
  ssrModule: Record<string, unknown> | null = null;

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

  async getModuleByUrl(url: string): Promise<ModuleNode | undefined> {
    return this.urlToModuleMap.get(url);
  }
}

export const moduleGraph = new ModuleGraph();
