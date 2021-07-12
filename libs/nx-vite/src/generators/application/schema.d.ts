export interface ApplicationGeneratorSchema {
  name: string;
  skipFormat?: boolean;
  directory?: string;
  tags?: string;
  // linter?: Linter;
}
