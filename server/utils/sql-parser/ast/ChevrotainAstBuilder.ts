import { Lexer } from "chevrotain";
import type { AstNode } from "../types/ast";
import { sqlParserLogger } from "../../logger";
import { allTokens } from "./tokens";
/**
 * Chevrotain-based AST Builder that replaces the custom implementation
 */
export class ChevrotainAstBuilder {
  private lexer: Lexer;
  private parser: ChevrotainSqlParser;
  private visitor: SqlAstVisitor;

  constructor() {
    this.lexer = new Lexer(allTokens);
    this.parser = new ChevrotainSqlParser();
    this.visitor = new SqlAstVisitor(this.parser);
  }

  /**
   * Build AST from SQL text
   */
  public buildAst(sql: string): AstNode[] {
    const logger = sqlParserLogger;
    logger.debug({ sqlLength: sql.length }, "Starting Chevrotain AST building");

    try {
      // Step 1: Tokenize
      const lexingResult = this.lexer.tokenize(sql);
      logger.debug(
        {
          tokenCount: lexingResult.tokens.length,
          errors: lexingResult.errors.length,
        },
        "Tokenization completed"
      );

      if (lexingResult.errors.length > 0) {
        logger.warn({ errors: lexingResult.errors }, "Lexing errors found");
      }

      // Step 2: Parse to CST
      this.parser.input = lexingResult.tokens;
      const cst = this.parser.statements();
      logger.debug(
        {
          parseErrors: this.parser.errors.length,
        },
        "CST parsing completed"
      );

      if (this.parser.errors.length > 0) {
        logger.warn({ errors: this.parser.errors }, "Parse errors found");
      }

      // Step 3: Convert CST to AST
      if (this.parser.errors.length > 0) {
        logger.warn(
          { errors: this.parser.errors },
          "Parse errors found, returning empty AST"
        );
        return [];
      }

      const ast = this.visitor.visitStatements(cst);
      logger.debug({ nodeCount: ast.length }, "AST building completed");

      return ast;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: errorMessage }, "Chevrotain AST building failed");
      throw error;
    }
  }

  /**
   * Get parsing errors
   */
  public getErrors(): any[] {
    return this.parser.errors;
  }

  /**
   * Reset parser state
   */
  public reset(): void {
    this.parser.input = [];
    this.parser.errors = [];
  }
}
