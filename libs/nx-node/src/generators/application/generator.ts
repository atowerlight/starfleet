import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { NxNodeGeneratorSchema } from './schema';
import { BuildExecutorSchema } from '../../executors/build/schema';

interface NormalizedSchema extends NxNodeGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  host: Tree,
  options: NxNodeGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(host).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
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

export default async function (host: Tree, options: NxNodeGeneratorSchema) {
  const normalizedOptions = normalizeOptions(host, options);
  addProjectConfiguration(host, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@starfleet/nx-node:build',
        options: {
          entryPoints: [`${normalizedOptions.projectRoot}/src/main.ts`],
          outputPath: joinPathFragments('dist', normalizedOptions.projectRoot),
        } as BuildExecutorSchema,
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(host, normalizedOptions);
  await formatFiles(host);
}
