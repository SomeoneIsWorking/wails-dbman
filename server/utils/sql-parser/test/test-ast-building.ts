import { SqlLexer } from '../lexer/SqlLexer';
import { AstBuilder } from '../ast/AstBuilder';
import { SqlAnalyzer } from '../analyzer/SqlAnalyzer';
import type { SqlStatementNode, SelectStatementNode } from '../types/ast';

interface TestCase {
  name: string;
  sql: string;
  expectedColumns?: Array<{
    columnName: string;
    alias?: string;
    tableName?: string;
    schemaName?: string;
    isFunction?: boolean;
    functionName?: string;
  }>;
  expectedStatements?: number;
  expectedResultSets?: number;
}

const columnParsingTests: TestCase[] = [
  {
    name: "Simple column with AS alias",
    sql: "SELECT column1 AS col1 FROM table1",
    expectedColumns: [
      { columnName: "col1", alias: "col1", tableName: "", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Simple column without AS keyword",
    sql: "SELECT column1 col1 FROM table1",
    expectedColumns: [
      { columnName: "col1", alias: "col1", tableName: "", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Table-qualified column",
    sql: "SELECT t.column1 FROM table1 t",
    expectedColumns: [
      { columnName: "column1", tableName: "t", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Schema-qualified column",
    sql: "SELECT dbo.table1.column1 FROM dbo.table1",
    expectedColumns: [
      { columnName: "column1", tableName: "table1", schemaName: "dbo", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Function with AS alias",
    sql: "SELECT COUNT(*) AS total FROM table1",
    expectedColumns: [
      { columnName: "total", alias: "total", isFunction: true, functionName: "COUNT" }
    ],
    expectedResultSets: 1
  },
  {
    name: "Function without AS keyword",
    sql: "SELECT COUNT(*) total FROM table1",
    expectedColumns: [
      { columnName: "total", alias: "total", isFunction: true, functionName: "COUNT" }
    ],
    expectedResultSets: 1
  },
  {
    name: "Complex expression with AS alias",
    sql: "SELECT ISNULL(t.MinPrice, b.MinPrice) / CAST(100 AS FLOAT) AS MinPrice FROM table1 t",
    expectedColumns: [
      { columnName: "MinPrice", alias: "MinPrice", isFunction: true, functionName: "ISNULL" }
    ],
    expectedResultSets: 1
  },
  {
    name: "Complex REPLACE function with alias",
    sql: "SELECT REPLACE(REPLACE(description, '[min]', value), '[max]', value2) AS Description FROM table1",
    expectedColumns: [
      { columnName: "Description", alias: "Description", isFunction: true, functionName: "REPLACE" }
    ],
    expectedResultSets: 1
  },
  {
    name: "Multiple columns with mixed aliases",
    sql: "SELECT id, name AS customer_name, COUNT(*) total, t.status FROM table1 t",
    expectedColumns: [
      { columnName: "id", isFunction: false },
      { columnName: "customer_name", alias: "customer_name", isFunction: false },
      { columnName: "total", alias: "total", isFunction: true, functionName: "COUNT" },
      { columnName: "status", tableName: "t", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Bracketed identifiers",
    sql: "SELECT [Column Name] AS [Display Name] FROM [Table Name]",
    expectedColumns: [
      { columnName: "Display Name", alias: "Display Name", isFunction: false }
    ],
    expectedResultSets: 1
  },
  {
    name: "Wildcard selection",
    sql: "SELECT * FROM table1",
    expectedColumns: [
      { columnName: "*", isFunction: false }
    ],
    expectedResultSets: 1
  }
];

const complexSqlTests: TestCase[] = [
  {
    name: "Nested SELECT with EXISTS (should not be result set)",
    sql: `
      IF EXISTS (SELECT 1 FROM table1 WHERE id = 1)
      BEGIN
        SELECT name FROM customers
      END
    `,
    expectedResultSets: 1
  },
  {
    name: "INSERT with SELECT (INSERT SELECT should not be result set)",
    sql: `
      INSERT INTO temp_table
      SELECT id, name FROM customers WHERE active = 1;
      
      SELECT * FROM temp_table;
    `,
    expectedResultSets: 1
  },
  {
    name: "MERGE statement with SELECT (USING SELECT should not be result set)",
    sql: `
      MERGE target_table AS target
      USING (SELECT id, name FROM source_table) AS source
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET name = source.name;
      
      SELECT COUNT(*) FROM target_table;
    `,
    expectedResultSets: 1
  },
  {
    name: "Multiple result sets in conditional blocks",
    sql: `
      IF @mode = 1
      BEGIN
        SELECT id, name FROM customers
      END
      ELSE
      BEGIN
        SELECT id, description FROM products
      END
      
      SELECT COUNT(*) AS total FROM orders
    `,
    expectedResultSets: 3
  },
  {
    name: "Complex procedure with table variables",
    sql: `
      DECLARE @temp TABLE (id INT, name VARCHAR(50))
      
      INSERT INTO @temp
      SELECT id, name FROM customers WHERE active = 1
      
      SELECT t.name, c.email 
      FROM @temp t
      INNER JOIN contacts c ON c.customer_id = t.id
    `,
    expectedResultSets: 1
  }
];

const astStructureTests: TestCase[] = [
  {
    name: "Simple SELECT statement structure",
    sql: "SELECT id, name FROM users WHERE active = 1 ORDER BY name",
    expectedStatements: 1
  },
  {
    name: "IF-ELSE block structure",
    sql: `
      IF @param = 1
      BEGIN
        SELECT * FROM table1
      END
      ELSE
      BEGIN
        SELECT * FROM table2
      END
    `,
    expectedStatements: 3 // IF statement + 2 SELECT statements
  },
  {
    name: "DECLARE with table variable",
    sql: `
      DECLARE @temp TABLE (
        id INT,
        name VARCHAR(50)
      )
      
      SELECT * FROM @temp
    `,
    expectedStatements: 2 // DECLARE + SELECT
  },
  {
    name: "Multiple statement types",
    sql: `
      DECLARE @id INT = 1
      
      IF @id > 0
      BEGIN
        SELECT name FROM users WHERE id = @id
        
        INSERT INTO log (message) VALUES ('User accessed')
      END
      
      SELECT COUNT(*) FROM users
    `,
    expectedStatements: 5 // DECLARE + IF + SELECT + INSERT + SELECT
  }
];

async function runTestSuite() {
  console.log('🧪 AST Building Test Suite');
  console.log('='.repeat(50));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test Column Parsing
  console.log('\n📋 Column Parsing Tests');
  console.log('-'.repeat(30));
  
  for (const testCase of columnParsingTests) {
    totalTests++;
    console.log(`\nTest: ${testCase.name}`);
    console.log(`SQL: ${testCase.sql}`);
    
    try {
      const analyzer = new SqlAnalyzer();
      const result = analyzer.parseStatements(testCase.sql);
      
      if (!result.success) {
        console.log(`❌ FAILED: Analysis failed`);
        failedTests++;
        continue;
      }
      
      const resultSets = result.resultProducingStatements;
      
      // Check expected result sets count
      if (testCase.expectedResultSets !== undefined) {
        if (resultSets.length !== testCase.expectedResultSets) {
          console.log(`❌ FAILED: Expected ${testCase.expectedResultSets} result sets, got ${resultSets.length}`);
          failedTests++;
          continue;
        }
      }
      
      // Check columns if result set exists
      if (testCase.expectedColumns && resultSets.length > 0) {
        const selectStmt = resultSets[0] as SelectStatementNode;
        const selectClause = selectStmt.children?.find(child => child.nodeType === 'select_clause');
        
        if (!selectClause || !selectClause.children) {
          console.log(`❌ FAILED: No select clause found`);
          failedTests++;
          continue;
        }
        
        const actualColumns = selectClause.children;
        
        if (actualColumns.length !== testCase.expectedColumns.length) {
          console.log(`❌ FAILED: Expected ${testCase.expectedColumns.length} columns, got ${actualColumns.length}`);
          failedTests++;
          continue;
        }
        
        let columnTestsPassed = true;
        
        for (let i = 0; i < testCase.expectedColumns.length; i++) {
          const expected = testCase.expectedColumns[i];
          const actual = actualColumns[i].metadata;
          
          if (expected.columnName !== actual?.columnName) {
            console.log(`❌ Column ${i}: Expected columnName '${expected.columnName}', got '${actual?.columnName}'`);
            columnTestsPassed = false;
          }
          
          if (expected.alias !== undefined && expected.alias !== actual?.alias) {
            console.log(`❌ Column ${i}: Expected alias '${expected.alias}', got '${actual?.alias}'`);
            columnTestsPassed = false;
          }
          
          if (expected.tableName !== undefined && expected.tableName !== actual?.tableName) {
            console.log(`❌ Column ${i}: Expected tableName '${expected.tableName}', got '${actual?.tableName}'`);
            columnTestsPassed = false;
          }
          
          if (expected.isFunction !== undefined && expected.isFunction !== actual?.isFunction) {
            console.log(`❌ Column ${i}: Expected isFunction ${expected.isFunction}, got ${actual?.isFunction}`);
            columnTestsPassed = false;
          }
          
          if (expected.functionName !== undefined && expected.functionName !== actual?.functionName) {
            console.log(`❌ Column ${i}: Expected functionName '${expected.functionName}', got '${actual?.functionName}'`);
            columnTestsPassed = false;
          }
        }
        
        if (columnTestsPassed) {
          console.log(`✅ PASSED: All column assertions passed`);
          passedTests++;
        } else {
          failedTests++;
        }
      } else {
        console.log(`✅ PASSED: Basic parsing successful`);
        passedTests++;
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error}`);
      failedTests++;
    }
  }
  
  // Test Complex SQL
  console.log('\n🔗 Complex SQL Tests');
  console.log('-'.repeat(30));
  
  for (const testCase of complexSqlTests) {
    totalTests++;
    console.log(`\nTest: ${testCase.name}`);
    
    try {
      const analyzer = new SqlAnalyzer();
      const result = analyzer.parseStatements(testCase.sql);
      
      if (!result.success) {
        console.log(`❌ FAILED: Analysis failed`);
        failedTests++;
        continue;
      }
      
      const resultSets = result.resultProducingStatements;
      
      if (testCase.expectedResultSets !== undefined) {
        if (resultSets.length === testCase.expectedResultSets) {
          console.log(`✅ PASSED: Found ${resultSets.length} result sets as expected`);
          passedTests++;
        } else {
          console.log(`❌ FAILED: Expected ${testCase.expectedResultSets} result sets, got ${resultSets.length}`);
          failedTests++;
        }
      } else {
        console.log(`✅ PASSED: Basic parsing successful`);
        passedTests++;
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error}`);
      failedTests++;
    }
  }
  
  // Test AST Structure
  console.log('\n🏗️  AST Structure Tests');
  console.log('-'.repeat(30));
  
  for (const testCase of astStructureTests) {
    totalTests++;
    console.log(`\nTest: ${testCase.name}`);
    
    try {
      const analyzer = new SqlAnalyzer();
      const result = analyzer.parseStatements(testCase.sql);
      
      if (!result.success) {
        console.log(`❌ FAILED: Analysis failed`);
        failedTests++;
        continue;
      }
      
      if (testCase.expectedStatements !== undefined) {
        if (result.statements.length === testCase.expectedStatements) {
          console.log(`✅ PASSED: Found ${result.statements.length} statements as expected`);
          passedTests++;
        } else {
          console.log(`❌ FAILED: Expected ${testCase.expectedStatements} statements, got ${result.statements.length}`);
          console.log(`Statement types found: ${result.statements.map(s => s.statementType).join(', ')}`);
          failedTests++;
        }
      } else {
        console.log(`✅ PASSED: Basic parsing successful`);
        passedTests++;
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error}`);
      failedTests++;
    }
  }
  
  // Test Results Summary
  console.log('\n🎯 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`Failed: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failedTests} tests failed - review and fix issues`);
  }
  
  return { totalTests, passedTests, failedTests };
}

// Run the test suite
runTestSuite().catch(console.error); 