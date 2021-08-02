import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type {
  BuildOptions,
  OnLoadArgs,
  OnLoadOptions,
  OnLoadResult,
  PluginBuild,
} from 'esbuild';
import {
  createPipeline,
  finalize,
  Pipeline,
} from '@starfleet/esbuild-plugin-source-map';
import { Plugin } from 'esbuild';

export const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

type Store = Map<string, Pipeline>;
type TransformOptions = { entry?: Pipeline; filter: RegExp; store: Store };
type BuildTransformOptions = BuildOptions & { transform?: TransformOptions };

export function createFilter(build: PluginBuild) {
  const options = build.initialOptions as BuildTransformOptions;
  const transformOptions = options.transform;
  if (transformOptions && transformOptions.filter) {
    return transformOptions.filter;
  }

  const loaders = options.loader || {};
  const keys = Object.keys(loaders);
  const tsxExtensions = keys.filter((key) =>
    SCRIPT_LOADERS.includes(loaders[key])
  );
  return new RegExp(
    `\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`
  );
}

export async function getEntry(
  build: PluginBuild,
  filePath: string,
  contents?: string
): Promise<Pipeline> {
  const options = (build.initialOptions as BuildTransformOptions).transform;
  const entry =
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

type LoadCallback = (args: OnLoadArgs) => OnLoadResult;

export default function (plugins: Plugin[] = []) {
  const plugin: Plugin = {
    name: 'transform',
    setup(build) {
      const store: Store = new Map();
      const options = build.initialOptions;
      const filter = createFilter(build);

      const { stdin } = options;
      const input = stdin ? stdin.sourcefile || 'stdin.js' : undefined;
      if (stdin && input) {
        const regex = new RegExp(
          input.replace(/([()[\]{}\\\-+.*?^$])/g, '\\$1')
        );
        build.onResolve({ filter: regex }, () => ({
          path: input,
          namespace: 'file',
        }));
        delete options.stdin;
        options.entryPoints = [input];
      }

      Object.defineProperty(options, 'transform', {
        enumerable: false,
        writable: false,
        value: {
          store,
          filter,
        },
      });

      const onLoad: LoadCallback[] = [];
      for (let i = 0; i < plugins.length; i++) {
        plugins[i].setup({
          initialOptions: build.initialOptions,
          onStart: build.onStart.bind(build),
          onEnd: build.onEnd.bind(build),
          onResolve: build.onResolve.bind(build),
          onLoad(options: OnLoadOptions, callback: LoadCallback) {
            if (options.namespace === 'file' && options.filter === filter) {
              onLoad.push(callback);
            } else {
              build.onLoad(options, callback);
            }
          },
        });
      }

      if (onLoad.length) {
        build.onLoad({ filter, namespace: 'file' }, async (args) => {
          let entry;
          if (args.path === input && stdin) {
            entry = await getEntry(build, args.path, stdin.contents);
          } else {
            entry = await getEntry(build, args.path);
          }

          args.pluginData = entry;

          for (let i = 0; i < onLoad.length; i++) {
            await onLoad[i](args);
          }

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
    },
  };

  return plugin;
}
