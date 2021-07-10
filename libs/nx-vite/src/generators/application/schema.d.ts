import { Linter } from '@nrwl/linter';

export interface ApplicationGeneratorSchema {
  name: string;
  prefix?: string;
  style?: string;
  skipFormat?: boolean;
  directory?: string;
  tags?: string;
  unitTestRunner?: 'jest' | 'none';
  linter?: Linter;
  babelJest?: boolean;
}
