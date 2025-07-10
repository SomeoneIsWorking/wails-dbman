import { PrismaClient } from "~/generated/prisma";
import { ProcedureDefinitionAnalyzer } from "../utils/ProcedureDefinitionAnalyzer";
import { PrismaTableAccessor } from "../utils/prisma-table-accessor";

async function testProcedureAnalysis() {
  console.log('🧪 Testing Procedure Analysis with Real Data\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Get procedures that start with "WEB_sp"
    const procedures = await prisma.cachedProcedure.findMany({
      where: {
        procedureName: {
          startsWith: 'WEB_sp'
        },
        definition: {
          not: null
        }
      },
      include: {
        cachedSchema: true
      },
      take: 20 // Get more procedures to choose from
    });
    
    // Filter for simpler procedures (shorter definition)
    const simpleProcedures = procedures
      .filter(p => p.definition && p.definition.length < 10000) // Less than 10KB
      .sort((a, b) => (a.definition?.length || 0) - (b.definition?.length || 0)); // Sort by length
    
    if (simpleProcedures.length === 0) {
      console.log('❌ No WEB_sp procedures with definitions found');
      return;
    }
    
    console.log(`Found ${simpleProcedures.length} WEB_sp procedures:`);
    simpleProcedures.forEach((proc, index) => {
      console.log(`  ${index + 1}. ${proc.procedureName} (${proc.definition?.length || 0} chars)`);
    });
    console.log();
    
    // Pick the first (shortest) procedure
    const randomProcedure = simpleProcedures[0];
    const connectionId = randomProcedure.cachedSchema.connectionId;
    const database = randomProcedure.cachedSchema.database;
    
    console.log(`📋 Selected Procedure: ${randomProcedure.schema}.${randomProcedure.procedureName}`);
    console.log(`🔗 Connection: ${connectionId}`);
    console.log(`🗄️  Database: ${database}\n`);
    
    // Display the procedure definition
    console.log('📄 Procedure Definition:');
    console.log('='.repeat(80));
    console.log(randomProcedure.definition);
    console.log('='.repeat(80));
    console.log();
    
    // Create table accessor and analyzer
    const tableAccessor = new PrismaTableAccessor(connectionId, database);
    const analyzer = new ProcedureDefinitionAnalyzer(tableAccessor);
    
    try {
      // Analyze the procedure
      console.log('🔍 Analyzing procedure...');
      const startTime = Date.now();
      
      const result = await analyzer.analyzeProcedure(
        randomProcedure.schema,
        randomProcedure.procedureName,
        database,
        randomProcedure.definition || undefined
      );
      
      const endTime = Date.now();
      console.log(`⏱️  Analysis completed in ${endTime - startTime}ms\n`);
      
      // Display analysis results
      console.log('📊 Analysis Results:');
      console.log('='.repeat(50));
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
          console.log('-'.repeat(60));
          console.log('Name'.padEnd(25) + 'Type'.padEnd(15) + 'Nullable'.padEnd(10) + 'Details');
          console.log('-'.repeat(60));
          
          resultSet.columns.forEach(col => {
            const details = [];
            if (col.maxLength) details.push(`len:${col.maxLength}`);
            if (col.precision) details.push(`prec:${col.precision}`);
            if (col.scale) details.push(`scale:${col.scale}`);
            
            console.log(
              col.name.padEnd(25) + 
              col.dataType.padEnd(15) + 
              (col.isNullable ? 'YES' : 'NO').padEnd(10) + 
              details.join(', ')
            );
          });
          console.log('-'.repeat(60));
        } else {
          console.log('❌ No columns found');
        }
        console.log();
      });
      
      // Manual Analysis
      console.log('🔍 Manual Analysis:');
      console.log('='.repeat(60));
      
      // Extract the SELECT statement from the procedure definition
      const definition = randomProcedure.definition || '';
      const selectMatches = definition.match(/SELECT\s+(.+?)\s+FROM\s+(.+?)(?:\s+WHERE|$)/gis);
      
      if (selectMatches) {
        console.log('📋 Expected SELECT Statement(s):');
        selectMatches.forEach((match, index) => {
          console.log(`${index + 1}. ${match.trim()}`);
        });
        console.log();
      }
      
      // Analyze what we found vs what we expected
      if (result.resultSets.length > 0) {
        console.log('✅ Analysis Results Look Reasonable:');
        
        result.resultSets.forEach((resultSet, index) => {
          console.log(`\n📊 Result Set ${index + 1} Analysis:`);
          console.log(`Found ${resultSet.columns.length} columns`);
          
          // Check if column names make sense
          const columnNames = resultSet.columns.map(col => col.name);
          console.log(`Column names: ${columnNames.join(', ')}`);
          
          // Check data types
          const hasReasonableTypes = resultSet.columns.some(col => 
            col.dataType !== 'varchar' && col.dataType !== 'unknown'
          );
          
          if (hasReasonableTypes) {
            console.log('✅ Some columns have specific data types (good!)');
          } else {
            console.log('⚠️  All columns defaulted to varchar (table lookup may have failed)');
          }
          
          // Check for obvious issues
          const hasUnknownColumns = resultSet.columns.some(col => 
            col.name === 'unknown' || col.name.includes('Column')
          );
          
          if (hasUnknownColumns) {
            console.log('❌ Some columns have generic names (parsing issue)');
          } else {
            console.log('✅ All columns have meaningful names');
          }
        });
      } else {
        console.log('❌ No result sets found - this may indicate a parsing issue');
      }
      
    } finally {
      await tableAccessor.disconnect();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProcedureAnalysis().catch(console.error); 