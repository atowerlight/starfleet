import { promises } from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import esbuild from 'esbuild';
import { Parser as AcornParser } from 'acorn';
import jsx from 'acorn-jsx';
import { simple as walk } from 'acorn-walk';
import SourceMapNode, { VLQMap as SourceMap } from '@parcel/source-map';

const { readFile } = promises;
const SOURCEMAP_REGEX =
  /(?:(\/\*+[\s\S]*?sourceMappingURL\s*=)([\s\S]*?)(\*\/))|(?:(\/\/.*?sourceMappingURL\s*=)(.*?)([\r\n]))/;

const Parser = AcornParser.extend(jsx());

export { walk };

export function parse(contents: string) {
  return Parser.parse(contents, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  });
}

export function getOffsetFromLocation(
  code: string,
  line: number,
  column: number
) {
  let offest = 0;

  const lines = code.split('\n');
  for (let i = 0; i < line; i++) {
    if (i === line - 1) {
      offest += column;
      return offest;
    }
    offest += lines[i].length + 1;
  }

  return -1;
}

export function parseSourcemap(map: string): SourceMap {
  return JSON.parse(map);
}

export async function loadSourcemap(code: string, filePath: string) {
  const match = code.match(SOURCEMAP_REGEX);
  if (match) {
    const mapUrl = match[2] || match[5];
    try {
      let content;
      if (mapUrl.startsWith('data:')) {
        content = Buffer.from(mapUrl.split(',')[1]).toString('base64');
        return parseSourcemap(content);
      }

      if (filePath) {
        content = await readFile(
          path.resolve(path.dirname(filePath), mapUrl),
          'utf-8'
        );
        return parseSourcemap(content);
      }
    } catch {
      //
    }
  }

  return null;
}

export async function mergeSourcemaps(sourceMaps: SourceMap[]) {
  if (sourceMaps.length === 1) {
    return {
      version: 3,
      ...sourceMaps[0],
    };
  }

  const sourceMap = sourceMaps.reduce(
    (sourceMap: SourceMapNode | null, map) => {
      const mergedMap = new SourceMapNode();
      mergedMap.addVLQMap(map);
      if (sourceMap) {
        mergedMap.extends(sourceMap.toBuffer());
      }

      return mergedMap;
    },
    null
  );

  if (!sourceMap) {
    return null;
  }

  return {
    version: 3,
    ...sourceMap.toVLQ(),
  };
}

export type TransformOptions = {
  /**
   * The source filename.
   */
  source?: string | undefined;
  /**
   * Should include sourcemap.
   */
  sourcemap?: boolean | 'inline' | undefined;
  /**
   * Should include source content in sourcemaps.
   */
  sourcesContent?: boolean | undefined;
};

export type TransformResult = {
  code?: string | undefined;
  map?: SourceMap | null | undefined;
  loader?: esbuild.Loader | undefined;
  target?: string | undefined;
};

export type TransformCallack = (
  data: {
    ast: acorn.Node;
    magicCode: MagicString;
    code: string;
  },
  options: TransformOptions
) => Promise<TransformResult | void> | TransformResult | void;

export async function transform(
  contents: string,
  options: TransformOptions,
  callback: TransformCallack
): Promise<TransformResult> {
  let magicCode: MagicString | undefined;
  let ast: acorn.Node | undefined;
  return (
    (await callback(
      {
        code: contents,
        get ast() {
          if (!ast) {
            ast = parse(contents);
          }
          return ast;
        },
        get magicCode() {
          if (!magicCode) {
            magicCode = new MagicString(contents);
          }
          return magicCode;
        },
      },
      options
    )) || {
      code: magicCode ? magicCode.toString() : undefined,
      map:
        options.sourcemap && magicCode
          ? parseSourcemap(
              magicCode
                .generateMap({
                  hires: true,
                  source: options.source,
                  includeContent: options.sourcesContent,
                })
                .toString()
            )
          : undefined,
    }
  );
}

export const TARGETS = {
  unknown: 'unknown',
  typescript: 'typescript',
  es2020: 'es2020',
  es2019: 'es2019',
  es2018: 'es2018',
  es2017: 'es2017',
  es2016: 'es2016',
  es2015: 'es2015',
  es5: 'es5',
};

export type Pipeline = {
  contents: string;
  code: string;
  sourceMaps: SourceMap[] | null;
  target: string;
  loader: import('esbuild').Loader;
};

export async function createPipeline(
  contents: string,
  { sourcemap = true, source }: { sourcemap?: boolean; source?: string } = {}
) {
  const sourceMaps = [];

  if (sourcemap) {
    const map = await loadSourcemap(contents, source);
    if (map) {
      sourceMaps.push(map);
    }
  }

  const target =
    source && source.match(/\.tsx?$/) ? TARGETS.typescript : TARGETS.unknown;
  const loader = source && source.match(/\.ts$/) ? 'ts' : 'tsx';

  return {
    contents,
    code: contents,
    sourceMaps: sourcemap ? sourceMaps : null,
    target,
    loader,
  } as Pipeline;
}

export async function pipe(
  pipeline: Pipeline,
  options: TransformOptions,
  callback: TransformCallack
) {
  const { code, map, loader, target } = await transform(
    pipeline.code,
    {
      sourcemap: !!pipeline.sourceMaps,
      ...options,
    },
    callback
  );

  if (code) {
    pipeline.code = code;
    if (pipeline.sourceMaps && map && code !== pipeline.code) {
      pipeline.sourceMaps.push(map);
    }
  }

  if (loader) {
    pipeline.loader = loader;
  }

  if (target) {
    pipeline.target = target;
  }
}

export function createTypeScriptTransform(
  config: esbuild.TransformOptions = {}
): TransformCallack {
  return async function transpileTypescript({ code }, options) {
    const { code: finalCode, map } = await esbuild.transform(code, {
      tsconfigRaw: {},
      sourcemap: true,
      format: 'esm',
      target: TARGETS.es2020,
      sourcefile: options.source,
      loader: config.loader,
      jsxFactory: config.jsxFactory,
      jsxFragment: config.jsxFragment,
    });

    return {
      code: finalCode,
      map: parseSourcemap(map),
      target: TARGETS.es2020,
      loader: 'js',
    };
  };
}

export function inlineSourcemap(code: string, sourceMap: SourceMap) {
  const match = code.match(SOURCEMAP_REGEX);
  const url = `data:application/json;base64,${Buffer.from(
    JSON.stringify(sourceMap)
  ).toString('base64')}`;
  if (!match) {
    return `${code}\n//# sourceMappingURL=${url}\n`;
  }

  return code.replace(
    SOURCEMAP_REGEX,
    (full, arg1, arg2, arg3, arg4, arg5, arg6) =>
      `${arg1 || arg4}${url}${arg3 || arg6}`
  );
}

export async function finalize(
  pipeline: Pipeline,
  { source, sourcemap = true, sourcesContent = true }: TransformOptions
): Promise<TransformResult> {
  if (
    !pipeline.sourceMaps ||
    !pipeline.sourceMaps.length ||
    pipeline.code === pipeline.contents ||
    !sourcemap
  ) {
    return {
      code: pipeline.code,
      map: null,
      loader: pipeline.loader,
    };
  }

  const finalMap = await mergeSourcemaps(pipeline.sourceMaps);
  if (!finalMap) {
    return {
      code: pipeline.code,
      map: null,
      loader: pipeline.loader,
    };
  }

  if (source) {
    finalMap.file = source;
  } else {
    delete finalMap.file;
  }

  if (!sourcesContent) {
    delete finalMap.sourcesContent;
  }

  return {
    code:
      sourcemap === 'inline'
        ? inlineSourcemap(pipeline.code, finalMap)
        : pipeline.code,
    map: finalMap,
    loader: pipeline.loader,
  };
}
