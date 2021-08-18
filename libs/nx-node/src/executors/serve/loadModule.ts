import { moduleGraph } from './moduleGraph';
import { transformRequest } from './transformRequest';
import path from 'path';
import {
  ssrDynamicImportKey,
  ssrExportAllKey,
  ssrImportKey,
  ssrImportMetaKey,
  ssrModuleExportsKey,
} from './requireTransform';

type SSRModule = Record<string, unknown>;
interface SSRContext {
  global: NodeJS.Global;
}

const pendingModules = new Map<string, Promise<SSRModule>>();

// 自动转换代码
export async function LoadModule(
  url: string,
  context: SSRContext = { global },
  urlStack: string[] = []
): Promise<SSRModule> {
  if (urlStack.includes(url)) {
    console.warn(`Circular dependency: ${urlStack.join(' -> ')} -> ${url}`);
    return {};
  }

  // 防止重复
  const pending = pendingModules.get(url);
  if (pending) {
    return pending;
  }

  const modulePromise = instantiateModule(url, context, urlStack);
  pendingModules.set(url, modulePromise);
  // 吃掉错误
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  modulePromise.catch(() => {}).then(() => pendingModules.delete(url));
  return modulePromise;
}

async function instantiateModule(
  url: string,
  // server: ViteDevServer,
  context: SSRContext = { global },
  urlStack: string[] = []
): Promise<SSRModule> {
  const mod = await moduleGraph.ensureEntryFromUrl(url);

  if (mod.ssrModule) {
    return mod.ssrModule;
  }

  const result = mod.ssrTransformResult || (await transformRequest(url));

  if (!result) {
    throw new Error(`failed to load module: ${url}`);
  }

  const isExternal = (dep: string) => dep[0] !== '.' && dep[0] !== '/';

  // 必须先将依赖准备好
  await Promise.all(
    // 只有静态分析的 deps，动态 import 需要在运行时进行
    // 使用 map 达到最大并发
    result.deps!.map((dep) => {
      // 去掉依赖，依赖用 nodejs 自己的 require
      if (!isExternal(dep)) {
        // 递归
        return LoadModule(dep, context, urlStack.concat(url));
      }
    })
  );

  // 模仿 commonjs 产物
  // 注意：下面可以认为是运行时代码
  const ssrModule = {
    [Symbol.toStringTag]: 'Module',
  };

  Object.defineProperty(ssrModule, '__esModule', { value: true });

  const ssrImportMeta = { url };

  const ssrImport = (dep: string) => {
    if (isExternal(dep)) {
      // 这里不能使用万能的 import(${dep}).default 因为其是异步代码，与 require 语义不同
      return nodeRequire(dep, mod.url);
    } else {
      // 静态分析完成并准备好了
      return moduleGraph.urlToModuleMap.get(dep)?.ssrModule;
    }
  };

  const ssrDynamicImport = (dep: string) => {
    if (isExternal(dep)) {
      return Promise.resolve(nodeRequire(dep, mod.url));
    } else {
      if (dep.startsWith('.')) {
        dep = path.posix.resolve(path.dirname(url), dep);
      }
      // 动态 import 并没有处理，需要在运行时编译
      return LoadModule(dep, context, urlStack.concat(url));
    }
  };

  function ssrExportAll(sourceModule: any) {
    for (const key in sourceModule) {
      if (key !== 'default') {
        Object.defineProperty(ssrModule, key, {
          enumerable: true,
          configurable: true,
          get() {
            return sourceModule[key];
          },
        });
      }
    }
  }

  // eslint-disable-next-line no-useless-catch
  try {
    new Function(
      `global`,
      ssrModuleExportsKey,
      ssrImportMetaKey,
      ssrImportKey,
      ssrDynamicImportKey,
      ssrExportAllKey,
      result.code + `\n//# sourceURL=${mod.url}`
    )(
      context.global,
      ssrModule,
      ssrImportMeta,
      ssrImport,
      ssrDynamicImport,
      ssrExportAll
    );
  } catch (e) {
    // const stacktrace = ssrRewriteStacktrace(e.stack, moduleGraph);
    // rebindErrorStacktrace(e, stacktrace);
    // server.config.logger.error(
    //   `Error when evaluating SSR module ${url}:\n${stacktrace}`,
    //   {
    //     timestamp: true,
    //     clear: server.config.clearScreen,
    //   }
    // );
    throw e;
  }

  mod.ssrModule = Object.freeze(ssrModule);
  return ssrModule;
}

function nodeRequire(id: string, importer: string) {
  // TODO: 自己控制 resolve
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(require.resolve(id, {
    paths: [importer, process.cwd()],
  }));

  const defaultExport = mod.__esModule ? mod.default : mod;
  // rollup-style default import interop for cjs
  return new Proxy(mod, {
    get(mod, prop) {
      if (prop === 'default') return defaultExport;
      return mod[prop];
    },
  });
}
