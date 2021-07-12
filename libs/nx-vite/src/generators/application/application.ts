import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import * as path from 'path';
import { ApplicationGeneratorSchema } from './schema';
import viteInitGenerator from '../init/generator';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { BuildExecutorSchema } from '../../executors/build/schema';

interface NormalizedSchema extends ApplicationGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  host: Tree,
  options: ApplicationGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : `${getWorkspaceLayout(host).appsDir}/${name}`;
  const projectName = name.replace(new RegExp('/', 'g'), '-');
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot: projectDirectory,
    projectDirectory,
    parsedTags,
  };
}

function addFiles(host: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    host,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  host: Tree,
  options: ApplicationGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(host, options);

  const tasks: GeneratorCallback[] = [];

  const viteInitTask = await viteInitGenerator(host, {
    ...options,
    skipFormat: true,
  });
  tasks.push(viteInitTask);

  addProjectConfiguration(host, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@starfleet/nx-vite:build',
        options: {
          outputPath: joinPathFragments('dist', normalizedOptions.projectRoot),
        } as BuildExecutorSchema,
      },
      serve: {
        executor: '@starfleet/nx-vite:serve',
        options: {},
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(host, normalizedOptions);

  // 添加 tsconfig 配置
  if (host.exists('tsconfig.json')) {
    updateJson(host, 'tsconfig.json', (tsconfig) => {
      if (tsconfig.references) {
        tsconfig.references.push({
          path: `./${normalizedOptions.projectRoot}`,
        });

        tsconfig.references.sort((a: { path: string }, b: { path: string }) =>
          a.path.localeCompare(b.path)
        );
      }

      return tsconfig;
    });
  }

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return runTasksInSerial(...tasks);
}
