import path from 'path';
import type { JscTarget, Options as SwcOptions } from '@swc/core';
import * as swc from '@swc/core';
import { parseSourcemap, pipe } from '@starfleet/esbuild-plugin-source-map';
import { finalizeEntry, getEntry } from '@starfleet/esbuild-plugin-transform';

import type { Plugin as EsbuildPlugin } from 'esbuild';

export default function (swcOptions: SwcOptions = {}) {
  const plugin: EsbuildPlugin = {
    name: 'swc',
    setup(build) {
      const esbuildOptions = build.initialOptions;
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        const entry = await getEntry(build, args.path);

        await pipe(
          entry,
          {
            source: path.basename(args.path),
            sourcesContent: esbuildOptions.sourcesContent,
          },
          async ({ code }) => {
            const config: SwcOptions = {
              filename: args.path,
              sourceFileName: args.path,
              sourceMaps: true,
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                  dynamicImport: true,
                },
                keepClassNames: true,
                // externalHelpers: true,
                target: (esbuildOptions.target as JscTarget) || 'es2020',
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                  optimizer: undefined,
                },
              },
              ...swcOptions,
            };

            const result = await swc.transform(code, config);
            const map = parseSourcemap(result.map);

            return {
              code: result.code,
              map,
            };
          }
        );

        // 如果在环境中那么会直接跳过，全部转换完成再合并 sourcemap
        return finalizeEntry(build, args.path);
      });
    },
  };

  return plugin;
}
