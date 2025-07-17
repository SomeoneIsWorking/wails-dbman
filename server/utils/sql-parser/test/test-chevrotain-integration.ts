import { describe, it, expect } from 'vitest';
import { ChevrotainAstBuilder } from '../ast/ChevrotainAstBuilder';
import { SqlAnalyzer } from '../analyzer/SqlAnalyzer';

describe('ChevrotainAstBuilder', () => {
  it('should build AST from simple SELECT statement', () => {
    const builder = new ChevrotainAstBuilder();
    const sql = 'SELECT * FROM users';
    
    const ast = builder.buildAst(sql);
    
    expect(ast).toBeDefined();
    expect(ast.length).toBeGreaterThan(0);
  });

  it('should handle complex SELECT statement', () => {
    const builder = new ChevrotainAstBuilder();
    const sql = `
      SELECT u.id, u.name, p.title 
      FROM users u 
      JOIN posts p ON u.id = p.user_id 
      WHERE u.active = 1 
      ORDER BY u.name ASC
    `;
    
    const ast = builder.buildAst(sql);
    
    expect(ast).toBeDefined();
    expect(ast.length).toBeGreaterThan(0);
  });

  it('should work with SqlAnalyzer', () => {
    const analyzer = new SqlAnalyzer();
    const sql = 'SELECT id, name FROM users WHERE active = 1';
    
    const result = analyzer.parseStatements(sql);
    
    expect(result.success).toBe(true);
    expect(result.statements.length).toBeGreaterThan(0);
  });
});

describe('SqlAnalyzer with Chevrotain', () => {
  it('should analyze procedure with SELECT statements', () => {
    const analyzer = new SqlAnalyzer();
    const procedureDefinition = `
      CREATE PROCEDURE GetActiveUsers
      AS
      BEGIN
        SELECT id, name FROM users WHERE active = 1;
        SELECT COUNT(*) FROM users;
      END
    `;
    
    const result = analyzer.analyzeProcedure(procedureDefinition);
    
    expect(result.success).toBe(true);
    expect(result.selectStatements.length).toBeGreaterThan(0);
  });

  it('should handle conditional blocks', () => {
    const analyzer = new SqlAnalyzer();
    const sql = `
      IF @param = 1
      BEGIN
        SELECT * FROM table1;
      END
      ELSE
      BEGIN
        SELECT * FROM table2;
      END
    `;
    
    const result = analyzer.parseStatements(sql);
    
    expect(result.success).toBe(true);
    expect(result.statements.length).toBeGreaterThan(0);
  });
});
