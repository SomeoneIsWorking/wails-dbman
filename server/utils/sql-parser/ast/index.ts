import { ChevrotainSqlParser } from './parser';
import { SqlAstVisitor } from './visitor';

/**
 * Factory function to create parser and visitor
 */
export function createChevrotainSqlParser(): { parser: ChevrotainSqlParser; visitor: SqlAstVisitor } {
  const parser = new ChevrotainSqlParser();
  const visitor = new SqlAstVisitor(parser);
  return { parser, visitor };
}

/**
 * Re-export all components for convenience
 */
export { ChevrotainSqlParser } from './parser';
export { SqlAstVisitor } from './visitor';
export * from './tokens';
