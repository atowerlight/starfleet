import path from 'path';
import { readFile } from 'fs/promises';
import type {
  BuildOptions,
  OnLoadOptions,
  OnLoadResult,
  PluginBuild,
} from 'esbuild';
import { Plugin } from 'esbuild';
import {
  createPipeline,
  finalize,
  Pipeline,
} from '@starfleet/esbuild-plugin-source-map';

type Store = Map<string, Pipeline>;
type TransformOptions = { entry?: Pipeline; store: Store };
type BuildTransformOptions = BuildOptions & { transform?: TransformOptions };

export async function getEntry(
  build: PluginBuild,
  filePath: string,
  contents?: string
): Promise<Pipeline> {
  const options = (build.initialOptions as BuildTransformOptions).transform;
  const entry =
    // 做兼容即使不在环境下面也能用
    options?.store.get(filePath) ||
    (await createPipeline(contents || (await readFile(filePath, 'utf-8')), {
      source: filePath,
    }));
  options?.store.set(filePath, entry);
  return entry;
}

export async function finalizeEntry(
  build: PluginBuild,
  filePath: string
): Promise<OnLoadResult | undefined> {
  const options = (build.initialOptions as BuildTransformOptions).transform;
  // 如果在环境里面那么就交给环境来合并 sourcemap
  if (options) {
    return;
  }

  const entry = await getEntry(build, filePath);
  const { code, loader } = await finalize(entry, {
    sourcemap: 'inline',
    source: path.basename(filePath),
    sourcesContent: build.initialOptions.sourcesContent,
  });

  return {
    contents: code,
    loader,
  };
}

type LoadCallbackOrigin = Parameters<PluginBuild['onLoad']>[1];

interface LoadCallback extends LoadCallbackOrigin {
  options: OnLoadOptions;
}

export default function (plugins: Plugin[] = []) {
  const plugin: Plugin = {
    name: 'transform',
    setup: (build) => {
      const store: Store = new Map();
      const options = build.initialOptions;

      Object.defineProperty(options, 'transform', {
        enumerable: false,
        writable: false,
        value: {
          store,
        },
      });

      const onLoadList: LoadCallback[] = [];

      // 下面都是同步代码能保证顺序
      for (let i = 0; i < plugins.length; i++) {
        plugins[i].setup({
          initialOptions: build.initialOptions,
          onStart: build.onStart.bind(build),
          onEnd: build.onEnd.bind(build),
          onResolve: build.onResolve.bind(build),
          onLoad(options, callback: LoadCallback) {
            callback.options = options;
            onLoadList.push(callback);
          },
        });
      }

      if (onLoadList.length) {
        for (let i = 0; i < onLoadList.length; i++) {
          const onLoad = onLoadList[i];
          build.onLoad(onLoad.options, async (args) => {
            const entry = await getEntry(build, args.path);

            await onLoad(args);
            if (entry.code === entry.contents) {
              return {
                contents: entry.code,
                loader: entry.loader,
              };
            }

            const { code, loader } = await finalize(entry, {
              sourcemap: 'inline',
              source: path.basename(args.path),
              sourcesContent: options.sourcesContent,
            });

            return {
              contents: code,
              loader,
            };
          });
        }
      }
    },
  };

  return plugin;
}
