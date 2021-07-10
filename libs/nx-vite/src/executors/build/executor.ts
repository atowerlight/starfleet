import { BuildExecutorSchema } from './schema';

export interface ViteBuildBuilderOptions {
  root?: string;
  outputPath?: string;
}

export default async function runExecutor(options: BuildExecutorSchema) {
  console.log('Executor ran for Build', options);
  return {
    success: true,
  };
}
