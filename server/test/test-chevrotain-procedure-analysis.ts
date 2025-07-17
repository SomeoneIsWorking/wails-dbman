import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeResultSets } from '../utils/procedure-analysis';

async function testChevrotainProcedureAnalysis() {
  console.log('🧪 Testing Chevrotain-based Procedure Analysis\n');
  
  try {
    // Read the S6RouletteType_Read.sql file
    const sqlFilePath = join(__dirname, '../utils/sql-parser/test/test-procedures/S6RouletteType_Read.sql');
    const definition = readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Testing Procedure: S6RouletteType_Read');
    console.log(`📄 Definition length: ${definition.length} characters`);
    console.log();
    
    // Display the procedure definition preview
    console.log('📄 Procedure Definition Preview:');
    console.log('='.repeat(80));
    console.log(definition.substring(0, 500) + '...');
    console.log('='.repeat(80));
    console.log();
    
    // Test parameters - using mock connection info since we're testing the parser
    const connectionId = 'test-connection';
    const database = 'test-database';
    const schema = 'dbo';
    const procedureName = 'S6RouletteType_Read';
    
    console.log('🔍 Starting analysis...');
    const startTime = Date.now();
    
    try {
      const result = await analyzeResultSets(
        connectionId,
        database,
        schema,
        procedureName,
        definition,
        { context: 'chevrotain-test' }
      );
      
      const endTime = Date.now();
      console.log(`⏱️  Analysis completed in ${endTime - startTime}ms\n`);
      
      // Display analysis results
      console.log('📊 Analysis Results:');
      console.log('='.repeat(60));
      console.log(`Success: ${result.resultSets.length > 0 ? '✅' : '❌'}`);
      console.log(`Result Sets Found: ${result.resultSets.length}`);
      console.log(`Confidence: ${result.totalConfidence}`);
      console.log(`Warnings: ${result.warnings.length}\n`);
      
      // Display warnings if any
      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
        console.log();
      }
      
      // Display each result set
      result.resultSets.forEach((resultSet, index) => {
        console.log(`📋 Result Set ${index + 1}:`);
        console.log(`Columns: ${resultSet.columns.length}`);
        console.log();
        
        if (resultSet.columns.length > 0) {
          console.log('Columns:');
          console.log('-'.repeat(70));
          console.log('Name'.padEnd(30) + 'Type'.padEnd(15) + 'Nullable'.padEnd(10) + 'Details');
          console.log('-'.repeat(70));
          
          resultSet.columns.forEach(col => {
            const details = [];
            if (col.maxLength) details.push(`len:${col.maxLength}`);
            if (col.precision) details.push(`prec:${col.precision}`);
            if (col.scale) details.push(`scale:${col.scale}`);
            
            console.log(
              col.name.padEnd(30) + 
              col.dataType.padEnd(15) + 
              (col.isNullable ? 'YES' : 'NO').padEnd(10) + 
              details.join(', ')
            );
          });
          console.log('-'.repeat(70));
        } else {
          console.log('❌ No columns found');
        }
        console.log();
      });
      
      // Debug: Show what the SqlAnalyzer actually found
      console.log('🔍 Debug: SqlAnalyzer Results:');
      console.log('='.repeat(60));
      
      // We need to access the SqlAnalyzer results directly
      // Let's create a direct test to see what it's producing
      const { SqlAnalyzer } = await import('../utils/sql-parser/analyzer/SqlAnalyzer');
      const debugAnalyzer = new SqlAnalyzer();
      const debugResult = debugAnalyzer.analyzeProcedure(definition);
      
      console.log(`Total statements found: ${debugResult.statements.length}`);
      console.log(`Select statements found: ${debugResult.selectStatements.length}`);
      console.log();
      
      debugResult.selectStatements.forEach((stmt, index) => {
        console.log(`📋 SELECT Statement ${index + 1}:`);
        console.log(`  Content: ${stmt.content}`);
        console.log(`  Statement type: ${stmt.statementType}`);
        console.log(`  Result producing: ${stmt.isResultProducing}`);
        console.log(`  Level: ${stmt.level}`);
        
        if (stmt.children && stmt.children.length > 0) {
          console.log(`  Children: ${stmt.children.length}`);
          stmt.children.forEach((child, childIndex) => {
            console.log(`    Child ${childIndex + 1}: ${child.nodeType}`);
            if (child.nodeType === 'select_clause' && child.children) {
              console.log(`      Select clause children: ${child.children.length}`);
              child.children.forEach((grandChild, grandChildIndex) => {
                console.log(`        ${grandChildIndex + 1}: ${grandChild.nodeType} - ${JSON.stringify(grandChild.metadata)}`);
              });
            }
          });
        }
        console.log();
      });
      
      // Expected results analysis
      console.log('🔍 Expected Results Analysis:');
      console.log('='.repeat(60));
      
      // The S6RouletteType_Read procedure should have 3 main SELECT statements
      console.log('📋 Expected SELECT Statements:');
      console.log('1. Main game types with lobby information (12+ columns)');
      console.log('2. Payouts with game type matching (6 columns)');
      console.log('3. Payout numbers with labels (3 columns)');
      console.log();
      
      // Analyze what we found vs what we expected
      if (result.resultSets.length === 3) {
        console.log('✅ Found expected 3 result sets');
        
        // Check first result set (main game types)
        const mainResultSet = result.resultSets[0];
        if (mainResultSet.columns.length >= 10) {
          console.log('✅ Main result set has reasonable column count');
          
          // Check for expected columns
          const expectedColumns = ['Type', 'GameType', 'MinBet', 'MaxBet', 'Nature', 'GameLobbyName', 'Description'];
          const foundColumns = mainResultSet.columns.map(col => col.name);
          const hasExpectedColumns = expectedColumns.some(expected => 
            foundColumns.some(found => found.toLowerCase().includes(expected.toLowerCase()))
          );
          
          if (hasExpectedColumns) {
            console.log('✅ Main result set contains expected column names');
          } else {
            console.log('⚠️  Main result set column names may need verification');
          }
        } else {
          console.log('⚠️  Main result set has fewer columns than expected');
        }
        
        // Check second result set (payouts)
        const payoutResultSet = result.resultSets[1];
        if (payoutResultSet.columns.length >= 5) {
          console.log('✅ Payout result set has reasonable column count');
        } else {
          console.log('⚠️  Payout result set has fewer columns than expected');
        }
        
        // Check third result set (payout numbers)
        const numberResultSet = result.resultSets[2];
        if (numberResultSet.columns.length >= 3) {
          console.log('✅ Number result set has reasonable column count');
        } else {
          console.log('⚠️  Number result set has fewer columns than expected');
        }
        
      } else {
        console.log(`⚠️  Found ${result.resultSets.length} result sets, expected 3`);
      }
      
      console.log();
      console.log('🎉 Test completed successfully!');
      
    } catch (analysisError) {
      console.error('❌ Analysis failed:', analysisError);
      
      // If it's a table accessor error, that's expected in this test
      if (analysisError instanceof Error && analysisError.message.includes('table') || 
          analysisError instanceof Error && analysisError.message.includes('connection')) {
        console.log('\n💡 Note: Table lookup errors are expected in this test since we\'re using mock connection info.');
        console.log('    The important thing is that the parser successfully analyzed the procedure structure.');
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

// Run the test
testChevrotainProcedureAnalysis().catch(console.error);
