import { SqlLexer } from '../lexer/SqlLexer';
import { AstBuilder } from '../ast/AstBuilder';
import { SqlAnalyzer } from '../analyzer/SqlAnalyzer';

interface AliasTestCase {
  name: string;
  sql: string;
  expectedColumns: Array<{
    columnName: string;
    alias: string;
    originalExpression?: string;
  }>;
}

const aliasTests: AliasTestCase[] = [
  {
    name: "Simple alias with AS",
    sql: "SELECT name AS customer_name FROM customers",
    expectedColumns: [
      { columnName: "customer_name", alias: "customer_name" }
    ]
  },
  {
    name: "Simple alias without AS",
    sql: "SELECT name customer_name FROM customers",
    expectedColumns: [
      { columnName: "customer_name", alias: "customer_name" }
    ]
  },
  {
    name: "Function with AS alias",
    sql: "SELECT COUNT(*) AS total_count FROM orders",
    expectedColumns: [
      { columnName: "total_count", alias: "total_count" }
    ]
  },
  {
    name: "Function without AS alias",
    sql: "SELECT COUNT(*) total_count FROM orders",
    expectedColumns: [
      { columnName: "total_count", alias: "total_count" }
    ]
  },
  {
    name: "Complex CAST expression with AS alias",
    sql: "SELECT CAST(price AS DECIMAL(10,2)) AS formatted_price FROM products",
    expectedColumns: [
      { columnName: "formatted_price", alias: "formatted_price" }
    ]
  },
  {
    name: "Complex arithmetic with AS alias",
    sql: "SELECT price * quantity AS total_amount FROM order_items",
    expectedColumns: [
      { columnName: "total_amount", alias: "total_amount" }
    ]
  },
  {
    name: "Nested function with AS alias",
    sql: "SELECT ISNULL(NULLIF(discount, 0), default_discount) AS final_discount FROM pricing",
    expectedColumns: [
      { columnName: "final_discount", alias: "final_discount" }
    ]
  },
  {
    name: "CASE expression with AS alias",
    sql: "SELECT CASE WHEN status = 1 THEN 'Active' ELSE 'Inactive' END AS status_name FROM users",
    expectedColumns: [
      { columnName: "status_name", alias: "status_name" }
    ]
  },
  {
    name: "Complex expression with internal AS (CAST) and external AS alias",
    sql: "SELECT ISNULL(amount, 0) / CAST(100 AS FLOAT) AS percentage FROM statistics",
    expectedColumns: [
      { columnName: "percentage", alias: "percentage" }
    ]
  },
  {
    name: "REPLACE function with nested quotes and AS alias",
    sql: "SELECT REPLACE(REPLACE(description, '[min]', '0'), '[max]', '100') AS clean_description FROM templates",
    expectedColumns: [
      { columnName: "clean_description", alias: "clean_description" }
    ]
  },
  {
    name: "Multiple AS keywords - should use the last one",
    sql: "SELECT COALESCE(CAST(value AS VARCHAR), CAST(backup AS VARCHAR)) AS final_value FROM data",
    expectedColumns: [
      { columnName: "final_value", alias: "final_value" }
    ]
  },
  {
    name: "No alias - just expression",
    sql: "SELECT COUNT(*) FROM users",
    expectedColumns: [
      { columnName: "COUNT_result", alias: "" }
    ]
  },
  {
    name: "Table qualified column with alias",
    sql: "SELECT u.first_name AS name FROM users u",
    expectedColumns: [
      { columnName: "name", alias: "name" }
    ]
  },
  {
    name: "Bracketed identifiers with alias",
    sql: "SELECT [User Name] AS [Display Name] FROM [User Table]",
    expectedColumns: [
      { columnName: "Display Name", alias: "Display Name" }
    ]
  },
  {
    name: "Complex expression without AS keyword",
    sql: "SELECT price * tax_rate total_with_tax FROM invoices",
    expectedColumns: [
      { columnName: "total_with_tax", alias: "total_with_tax" }
    ]
  }
];

async function runAliasTests() {
  console.log('🏷️  SQL Alias Parsing Test Suite');
  console.log('='.repeat(50));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of aliasTests) {
    totalTests++;
    console.log(`\nTest: ${testCase.name}`);
    console.log(`SQL: ${testCase.sql}`);
    
    try {
      // First, let's see what the lexer produces
      const lexer = new SqlLexer(testCase.sql);
      const tokens = lexer.tokenize();
      
      // Filter to just the column expression tokens
      const selectIndex = tokens.findIndex(t => t.value.toUpperCase() === 'SELECT');
      const fromIndex = tokens.findIndex(t => t.value.toUpperCase() === 'FROM');
      const columnTokens = tokens.slice(selectIndex + 1, fromIndex);
      
      console.log('  Column tokens:');
      columnTokens.forEach((token, i) => {
        if (token.type !== 'WHITESPACE') {
          console.log(`    ${i}: ${token.type} = "${token.value}"`);
        }
      });
      
      // Now test the full analysis
      const analyzer = new SqlAnalyzer();
      const result = analyzer.parseStatements(testCase.sql);
      
      if (!result.success) {
        console.log(`❌ FAILED: Analysis failed`);
        failedTests++;
        continue;
      }
      
      const resultSets = result.resultProducingStatements;
      if (resultSets.length === 0) {
        console.log(`❌ FAILED: No result sets found`);
        failedTests++;
        continue;
      }
      
      const selectStmt = resultSets[0];
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
      
      let allColumnsPassed = true;
      
      for (let i = 0; i < testCase.expectedColumns.length; i++) {
        const expected = testCase.expectedColumns[i];
        const actual = actualColumns[i].metadata;
        
        console.log(`  Column ${i + 1}:`);
        console.log(`    Expected: columnName='${expected.columnName}', alias='${expected.alias}'`);
        console.log(`    Actual: columnName='${actual?.columnName}', alias='${actual?.alias || ''}'`);
        
        // Check column name
        if (expected.columnName !== actual?.columnName) {
          console.log(`    ❌ Column name mismatch`);
          allColumnsPassed = false;
        }
        
        // Check alias - handle empty alias case
        const expectedAlias = expected.alias || '';
        const actualAlias = actual?.alias || '';
        if (expectedAlias !== actualAlias) {
          console.log(`    ❌ Alias mismatch`);
          allColumnsPassed = false;
        }
        
        if (expected.columnName === actual?.columnName && expectedAlias === actualAlias) {
          console.log(`    ✅ Column ${i + 1} matches`);
        }
      }
      
      if (allColumnsPassed) {
        console.log(`✅ PASSED: All columns parsed correctly`);
        passedTests++;
      } else {
        console.log(`❌ FAILED: Column parsing issues`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error}`);
      failedTests++;
    }
  }
  
  console.log('\n🎯 Alias Test Results');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`Failed: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All alias tests passed!');
  } else {
    console.log(`\n⚠️  ${failedTests} alias tests failed - alias parsing needs improvement`);
  }
  
  return { totalTests, passedTests, failedTests };
}

// Run the test suite
runAliasTests().catch(console.error); 