import { SqlLexer } from '../lexer/SqlLexer';
import { TokenType } from '../types/tokens';

interface LexerTestCase {
  name: string;
  input: string;
  expectedTokens: Array<{
    type: TokenType;
    value: string;
  }>;
}

const lexerTests: LexerTestCase[] = [
  {
    name: "Simple SELECT statement",
    input: "SELECT id FROM users",
    expectedTokens: [
      { type: TokenType.SELECT, value: "SELECT" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "id" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.FROM, value: "FROM" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "users" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "Function with parentheses",
    input: "COUNT(*)",
    expectedTokens: [
      { type: TokenType.IDENTIFIER, value: "COUNT" },
      { type: TokenType.LEFT_PAREN, value: "(" },
      { type: TokenType.MULTIPLY, value: "*" },
      { type: TokenType.RIGHT_PAREN, value: ")" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "String literals and parameters",
    input: "WHERE name = 'John' AND id = @userId",
    expectedTokens: [
      { type: TokenType.WHERE, value: "WHERE" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "name" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.EQUALS, value: "=" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.STRING_LITERAL, value: "'John'" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.AND, value: "AND" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "id" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.EQUALS, value: "=" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.PARAMETER, value: "@userId" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "Arithmetic operators",
    input: "price + tax - discount * 0.1 / quantity",
    expectedTokens: [
      { type: TokenType.IDENTIFIER, value: "price" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.PLUS, value: "+" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "tax" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.MINUS, value: "-" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "discount" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.MULTIPLY, value: "*" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.NUMBER_LITERAL, value: "0.1" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.DIVIDE, value: "/" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "quantity" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "Bracketed identifiers",
    input: "[User Name] AS [Display Name]",
    expectedTokens: [
      { type: TokenType.BRACKETED_IDENTIFIER, value: "[User Name]" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.AS, value: "AS" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.BRACKETED_IDENTIFIER, value: "[Display Name]" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "Complex expression with CAST",
    input: "CAST(100 AS FLOAT)",
    expectedTokens: [
      { type: TokenType.IDENTIFIER, value: "CAST" },
      { type: TokenType.LEFT_PAREN, value: "(" },
      { type: TokenType.NUMBER_LITERAL, value: "100" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.AS, value: "AS" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "FLOAT" },
      { type: TokenType.RIGHT_PAREN, value: ")" },
      { type: TokenType.EOF, value: "" }
    ]
  },
  {
    name: "Comments and semicolons",
    input: "SELECT id; -- This is a comment",
    expectedTokens: [
      { type: TokenType.SELECT, value: "SELECT" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.IDENTIFIER, value: "id" },
      { type: TokenType.SEMICOLON, value: ";" },
      { type: TokenType.WHITESPACE, value: " " },
      { type: TokenType.COMMENT, value: "-- This is a comment" },
      { type: TokenType.EOF, value: "" }
    ]
  }
];

async function runLexerTests() {
  console.log('🔤 SQL Lexer Test Suite');
  console.log('='.repeat(40));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of lexerTests) {
    totalTests++;
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    
    try {
      const lexer = new SqlLexer(testCase.input);
      const tokens = lexer.tokenize();
      
      // Remove whitespace tokens for easier comparison (unless test specifically checks for them)
      const actualTokens = tokens;
      
      if (actualTokens.length !== testCase.expectedTokens.length) {
        console.log(`❌ FAILED: Expected ${testCase.expectedTokens.length} tokens, got ${actualTokens.length}`);
        console.log('Expected tokens:');
        testCase.expectedTokens.forEach((token, i) => {
          console.log(`  ${i}: ${token.type} = "${token.value}"`);
        });
        console.log('Actual tokens:');
        actualTokens.forEach((token, i) => {
          console.log(`  ${i}: ${token.type} = "${token.value}"`);
        });
        failedTests++;
        continue;
      }
      
      let tokensMatch = true;
      for (let i = 0; i < testCase.expectedTokens.length; i++) {
        const expected = testCase.expectedTokens[i];
        const actual = actualTokens[i];
        
        if (expected.type !== actual.type || expected.value !== actual.value) {
          console.log(`❌ Token ${i} mismatch:`);
          console.log(`  Expected: ${expected.type} = "${expected.value}"`);
          console.log(`  Actual: ${actual.type} = "${actual.value}"`);
          tokensMatch = false;
          break;
        }
      }
      
      if (tokensMatch) {
        console.log(`✅ PASSED: All ${actualTokens.length} tokens match`);
        passedTests++;
      } else {
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error}`);
      failedTests++;
    }
  }
  
  console.log('\n🎯 Lexer Test Results');
  console.log('='.repeat(40));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`Failed: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All lexer tests passed!');
  } else {
    console.log(`\n⚠️  ${failedTests} lexer tests failed`);
  }
  
  return { totalTests, passedTests, failedTests };
}

// Run the test suite
runLexerTests().catch(console.error); 