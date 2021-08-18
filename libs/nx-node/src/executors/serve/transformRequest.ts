import { transformFile } from '@swc/core';

import { moduleGraph } from './moduleGraph';
import { requireTransform } from './requireTransform';

export interface TransformResult {
  code: string;
  map: any | null;
  etag?: string;
  deps?: string[];
}

export async function transformRequest(
  url: string
): Promise<TransformResult | null> {
  // 有可能没有
  const module = await moduleGraph.getModuleByUrl(url);

  const cached = module?.ssrTransformResult;

  if (cached) {
    return cached;
  }

  const transformResult = await transformFile(url, {
    filename: url,
    sourceFileName: url,
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
      target: 'es2020',
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
        optimizer: undefined,
      },
    },
  });

  const mod = await moduleGraph.ensureEntryFromUrl(url);

  return (mod.ssrTransformResult = await requireTransform(
    transformResult.code,
    transformResult.map,
    url
  ));
}
