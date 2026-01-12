package procedure

// AnalyzeResultSets analyzes result sets for a procedure
func AnalyzeResultSets(connectionId, database, schema, procedureName, definition string) (*DefinitionAnalysisResult, error) {
	tableAccessor := NewCacheTableAccessor(connectionId, database)
	analyzer := NewProcedureDefinitionAnalyzer(tableAccessor)

	return analyzer.AnalyzeProcedure(schema, procedureName, database, definition)
}
