import { readFileSync } from 'fs';
import { join } from 'path';

// Import from the correct source files
import { SqlAnalyzer } from '../analyzer/SqlAnalyzer';
import type { ProcedureAnalysisResult } from '../types/parser';

async function runTest() {
  console.log('🚀 Running Complex Procedure Analysis Test\n');
  
  try {
    // Read the SQL file
    const sqlFilePath = join(__dirname, 'test-procedures/GetDepartmentResources.sql');
    console.log(`📁 Reading SQL file: ${sqlFilePath}`);
    
    const procedureContent = readFileSync(sqlFilePath, 'utf-8');
    console.log(`✅ Successfully read ${procedureContent.length} characters\n`);
    
    // Analyze the procedure
    console.log('🔍 Analyzing procedure...');
    const analyzer = new SqlAnalyzer();
    const startTime = Date.now();
    const result: ProcedureAnalysisResult = analyzer.analyzeProcedure(procedureContent);
    const endTime = Date.now();
    
    console.log(`⏱️  Analysis completed in ${endTime - startTime}ms\n`);
    
    // Display results
    console.log('📊 Analysis Results:');
    console.log('==================');
    console.log(`Success: ${result.success}`);
    console.log(`Total Statements: ${result.statements.length}`);
    console.log(`SELECT Statements: ${result.selectStatements.length}`);
    console.log(`Conditional Blocks: ${result.conditionalBlocks.length}`);
    console.log(`Warnings: ${result.warnings.length}\n`);
    
    // Statement breakdown
    if (result.statements.length > 0) {
      console.log('📋 Statement Types:');
      const statementTypes: Record<string, number> = {};
      result.statements.forEach(stmt => {
        statementTypes[stmt.statementType] = (statementTypes[stmt.statementType] || 0) + 1;
      });
      
      Object.entries(statementTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      console.log();
    }
    
    // Result sets analysis
    if (result.selectStatements.length > 0) {
      console.log('🎯 Result Sets Analysis:');
      result.selectStatements.forEach((stmt, index) => {
        console.log(`  Result Set ${index + 1}:`);
        console.log(`    Content: ${stmt.content.substring(0, 80)}...`);
        console.log(`    Level: ${stmt.level}`);
      });
      console.log();
    }
    
    // Conditional blocks
    if (result.conditionalBlocks.length > 0) {
      console.log('🔀 Conditional Blocks:');
      result.conditionalBlocks.forEach((block, index) => {
        console.log(`  Block ${index + 1} (${block.type}):`);
        console.log(`    Condition: ${block.condition || 'N/A'}`);
        console.log(`    Statements: ${block.statements.length}`);
        console.log(`    Else Statements: ${block.elseStatements?.length || 0}`);
        console.log(`    Level: ${block.level}`);
      });
      console.log();
    }
    
    // Warnings
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
      console.log();
    }
    
    // Basic verification tests
    console.log('🧪 Basic Verification Tests:');
    console.log('===========================');
    
    // Test 1: Check if analysis succeeded
    console.log(`✅ Analysis succeeded: ${result.success ? '✓' : '✗'}`);
    
    // Test 2: Check for basic statements
    const hasDeclare = result.statements.some(s => s.statementType === 'declare');
    const hasIf = result.statements.some(s => s.statementType === 'if');
    const hasSelect = result.statements.some(s => s.statementType === 'select');
    
    console.log(`✅ Has DECLARE statement: ${hasDeclare ? '✓' : '✗'}`);
    console.log(`✅ Has IF statement: ${hasIf ? '✓' : '✗'}`);
    console.log(`✅ Has SELECT statement: ${hasSelect ? '✓' : '✗'}`);
    
    // Test 3: Check result sets
    console.log(`✅ Found ${result.selectStatements.length} result sets`);
    
    // Test 4: Check conditional blocks
    console.log(`✅ Found ${result.conditionalBlocks.length} conditional blocks`);
    
    // Test 5: Performance check
    const performanceOk = (endTime - startTime) < 5000;
    console.log(`✅ Performance acceptable (<5s): ${performanceOk ? '✓' : '✗'} (${endTime - startTime}ms)`);
    
    // Test 6: Check for complex SQL features
    const hasComplexFeatures = result.selectStatements.some(s => 
      s.content.includes('JOIN') || 
      s.content.includes('MERGE') ||
      s.content.includes('@Resources')
    );
    console.log(`✅ Has complex SQL features: ${hasComplexFeatures ? '✓' : '✗'}`);
    
    console.log('\n🎉 Test completed!');
    
    if (!result.success) {
      console.log('\n❌ Analysis failed - this indicates parser issues that need to be fixed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error); 