import type { Plugin } from 'esbuild';

export default function () {
  const plugin: Plugin = {
    name: 'auto-external',
    setup(build) {
      const store = new Map<string, boolean>();

      // golang 不支持正则的反向否定查找，使用这个来兼容，只要没有 ./ 开头的都进入
      build.onResolve({ filter: /^[^(./)]/ }, (args) => {
        let isInstalled = store.get(args.path);
        if (isInstalled === undefined) {
          try {
            require.resolve(args.path, {
              paths: [process.cwd(), args.resolveDir],
            });
            isInstalled = true;
          } catch (_) {
            isInstalled = false;
          }
        }

        store.set(args.path, isInstalled);

        return {
          external: !isInstalled,
        };
      });
    },
  };

  return plugin;
}
