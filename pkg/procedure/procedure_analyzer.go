package procedure

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ProcedureDefinitionAnalyzer analyzes stored procedure definitions
type ProcedureDefinitionAnalyzer struct {
	tableAccessor TableInfoAccessor
	sqlAnalyzer   *SqlAnalyzer
}

// NewProcedureDefinitionAnalyzer creates a new analyzer
func NewProcedureDefinitionAnalyzer(tableAccessor TableInfoAccessor) *ProcedureDefinitionAnalyzer {
	return &ProcedureDefinitionAnalyzer{
		tableAccessor: tableAccessor,
		sqlAnalyzer:   NewSqlAnalyzer(),
	}
}

// AnalyzeProcedure analyzes a stored procedure definition
func (a *ProcedureDefinitionAnalyzer) AnalyzeProcedure(schema, procedureName, database, procedureDefinition string) (*DefinitionAnalysisResult, error) {
	if procedureDefinition == "" {
		return &DefinitionAnalysisResult{
			ResultSets:      []ResultSet{},
			TotalConfidence: 0,
			Warnings:        []string{"Procedure definition not found"},
		}, nil
	}

	// Use SqlAnalyzer to parse the procedure
	analysisResult := a.sqlAnalyzer.AnalyzeProcedure(procedureDefinition)

	if !analysisResult.Success {
		return &DefinitionAnalysisResult{
			ResultSets:      []ResultSet{},
			TotalConfidence: 0,
			Warnings:        analysisResult.Warnings,
		}, nil
	}

	// Collect all table references from all SELECT statements first
	allTableReferences := make(map[string]bool)
	allTableAliasMap := make(map[string]string)

	for _, selectStmt := range analysisResult.SelectStatements {
		tableAliasMap := a.buildTableAliasMap(selectStmt)

		// Merge alias maps and collect actual table names
		for alias, actualTable := range tableAliasMap {
			allTableAliasMap[alias] = actualTable
			allTableReferences[actualTable] = true
		}

		// Also collect direct table references (without aliases)
		a.collectDirectTableReferences(selectStmt, allTableReferences)
	}

	// Fetch all table column information in bulk
	bulkTableInfo, err := a.fetchTableColumnsBulk(allTableReferences)
	if err != nil {
		return &DefinitionAnalysisResult{
			ResultSets:      []ResultSet{},
			TotalConfidence: 0,
			Warnings:        []string{fmt.Sprintf("Failed to fetch table information: %v", err)},
		}, nil
	}

	// Extract result sets from the SELECT statements using cached table info
	resultSets := []ResultSet{}
	warnings := analysisResult.Warnings

	for _, selectStmt := range analysisResult.SelectStatements {
		columns, err := a.extractColumnsFromSelectStatement(selectStmt, allTableAliasMap, bulkTableInfo)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to analyze SELECT statement: %v", err))
			continue
		}
		resultSets = append(resultSets, ResultSet{Columns: columns})
	}

	confidence := 0.1
	if len(resultSets) > 0 {
		confidence = 0.9
	}

	return &DefinitionAnalysisResult{
		ResultSets:      resultSets,
		TotalConfidence: confidence,
		Warnings:        warnings,
	}, nil
}

// extractColumnsFromSelectStatement extracts columns from a SELECT statement
func (a *ProcedureDefinitionAnalyzer) extractColumnsFromSelectStatement(selectStmt SelectStatement, tableAliasMap map[string]string, bulkTableInfo map[string][]ColumnInfo) ([]Column, error) {
	// Find the select_clause node - for WITH statements, take the last one (main SELECT)
	var selectClause *AstNode
	for i := len(selectStmt.Children) - 1; i >= 0; i-- {
		child := selectStmt.Children[i]
		if child.NodeType == "select_clause" {
			selectClause = &child
			break
		}
	}

	if selectClause == nil {
		return []Column{}, nil
	}

	columns := []Column{}

	for _, columnNode := range selectClause.Children {
		if columnNode.NodeType == "column_reference" && columnNode.Metadata != nil {
			alias, _ := columnNode.Metadata["alias"].(string)
			// Only process columns that have an alias (AS clause)
			if alias == "" {
				continue
			}
			column, err := a.analyzeColumnReference(columnNode.Metadata, selectStmt, tableAliasMap, bulkTableInfo)
			if err != nil {
				continue
			}
			columns = append(columns, column)
		}
	}

	return columns, nil
}

// analyzeColumnReference analyzes a column reference
func (a *ProcedureDefinitionAnalyzer) analyzeColumnReference(metadata map[string]interface{}, selectStmt SelectStatement, tableAliasMap map[string]string, bulkTableInfo map[string][]ColumnInfo) (Column, error) {
	columnName, _ := metadata["columnName"].(string)
	tableName, _ := metadata["tableName"].(string)
	alias, _ := metadata["alias"].(string)
	isFunction, _ := metadata["isFunction"].(bool)
	isCase, _ := metadata["isCase"].(bool)
	functionName, _ := metadata["functionName"].(string)
	expression, _ := metadata["expression"].(string)

	// Use alias if available, otherwise use column name
	finalColumnName := alias
	if finalColumnName == "" {
		finalColumnName = columnName
	}
	if finalColumnName == "" {
		finalColumnName = "unknown"
	}

	// Determine data type
	dataType := "varchar" // Default fallback
	isNullable := true
	var maxLength, precision, scale *int

	if isCase {
		// CASE expressions typically return varchar or the type of the THEN clauses
		dataType = "varchar"
		isNullable = true
		maxLength = intPtr(255)
	} else if isFunction {
		// Analyze function return type
		functionResult := a.analyzeFunctionReturnType(functionName, expression)
		dataType = functionResult.DataType
		isNullable = functionResult.Nullable
		maxLength = functionResult.MaxLength
		precision = functionResult.Precision
		scale = functionResult.Scale
	} else if tableName != "" {
		// Resolve table alias to actual table name
		actualTableName := tableAliasMap[tableName]
		if actualTableName == "" {
			actualTableName = tableName
		}

		// Look up column information from bulk table metadata
		tableColumnInfo := a.getTableColumnInfoFromBulk(actualTableName, columnName, bulkTableInfo)

		if tableColumnInfo != nil {
			dataType = tableColumnInfo.Type
			isNullable = tableColumnInfo.Nullable
			maxLength = tableColumnInfo.MaxLength
			precision = tableColumnInfo.Precision
			scale = tableColumnInfo.Scale
		} else {
			// Fallback: try to infer type from column name and context
			inferredType := a.inferDataTypeFromColumnName(finalColumnName)
			dataType = inferredType.DataType
			isNullable = inferredType.Nullable
			maxLength = inferredType.MaxLength
			precision = inferredType.Precision
			scale = inferredType.Scale
		}
	} else {
		// No table name, try to infer from column name and expression
		inferredType := a.inferDataTypeFromColumnName(finalColumnName)
		dataType = inferredType.DataType
		isNullable = inferredType.Nullable
		maxLength = inferredType.MaxLength
		precision = inferredType.Precision
		scale = inferredType.Scale
	}

	return Column{
		Name:      finalColumnName,
		DataType:  dataType,
		Nullable:  isNullable,
		MaxLength: maxLength,
		Precision: precision,
		Scale:     scale,
	}, nil
}

// analyzeFunctionReturnType analyzes function return type
func (a *ProcedureDefinitionAnalyzer) analyzeFunctionReturnType(functionName, expression string) FunctionResult {
	funcName := strings.ToUpper(functionName)

	switch funcName {
	case "COUNT":
		return FunctionResult{DataType: "int", Nullable: false}
	case "SUM", "AVG":
		return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(38), Scale: intPtr(2)}
	case "MIN", "MAX":
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
	case "CAST":
		return a.parseCastExpression(expression)
	case "CONVERT":
		return a.parseConvertExpression(expression)
	case "REPLACE", "CONCAT", "SUBSTRING", "LTRIM", "RTRIM", "TRIM", "CONCAT_WS", "QUOTENAME":
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
	case "ISNULL":
		if strings.Contains(expression, "Bet") || strings.Contains(expression, "Amount") {
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
		}
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
	case "LEN", "CHARINDEX":
		return FunctionResult{DataType: "int", Nullable: true}
	case "GETDATE", "SYSDATETIME":
		return FunctionResult{DataType: "datetime", Nullable: false}
	case "COL_NAME", "OBJECT_SCHEMA_NAME", "OBJECT_NAME":
		return FunctionResult{DataType: "nvarchar", Nullable: true, MaxLength: intPtr(128)}
	case "COLUMNPROPERTY":
		return FunctionResult{DataType: "int", Nullable: true}
	default:
		return a.inferTypeFromExpression(expression)
	}
}

// parseCastExpression parses CAST expression
func (a *ProcedureDefinitionAnalyzer) parseCastExpression(expression string) FunctionResult {
	castRegex := regexp.MustCompile(`(?i)CAST\s*\(.*AS\s+(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*\)`)
	match := castRegex.FindStringSubmatch(expression)
	if match != nil {
		targetType := strings.ToLower(match[1])
		var length, scale *int
		if len(match) > 2 && match[2] != "" {
			if val, err := strconv.Atoi(match[2]); err == nil {
				length = &val
			}
		}
		if len(match) > 3 && match[3] != "" {
			if val, err := strconv.Atoi(match[3]); err == nil {
				scale = &val
			}
		}

		switch targetType {
		case "int", "integer":
			return FunctionResult{DataType: "int", Nullable: true}
		case "float", "real":
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
		case "decimal", "numeric":
			precision := length
			if precision == nil {
				precision = intPtr(18)
			}
			if scale == nil {
				scale = intPtr(2)
			}
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: precision, Scale: scale}
		case "varchar", "nvarchar":
			maxLength := length
			if maxLength == nil {
				maxLength = intPtr(255)
			}
			return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: maxLength}
		case "char", "nchar":
			maxLength := length
			if maxLength == nil {
				maxLength = intPtr(10)
			}
			return FunctionResult{DataType: "char", Nullable: true, MaxLength: maxLength}
		case "datetime", "date", "time":
			return FunctionResult{DataType: "datetime", Nullable: true}
		case "bit":
			return FunctionResult{DataType: "bit", Nullable: true}
		default:
			return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
		}
	}
	return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
}

// parseConvertExpression parses CONVERT expression
func (a *ProcedureDefinitionAnalyzer) parseConvertExpression(expression string) FunctionResult {
	convertRegex := regexp.MustCompile(`(?i)CONVERT\s*\(\s*(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*,`)
	match := convertRegex.FindStringSubmatch(expression)
	if match != nil {
		targetType := strings.ToLower(match[1])
		var length, scale *int
		if len(match) > 2 && match[2] != "" {
			if val, err := strconv.Atoi(match[2]); err == nil {
				length = &val
			}
		}
		if len(match) > 3 && match[3] != "" {
			if val, err := strconv.Atoi(match[3]); err == nil {
				scale = &val
			}
		}

		switch targetType {
		case "int", "integer":
			return FunctionResult{DataType: "int", Nullable: true}
		case "float", "real":
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
		case "decimal", "numeric":
			precision := length
			if precision == nil {
				precision = intPtr(18)
			}
			if scale == nil {
				scale = intPtr(2)
			}
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: precision, Scale: scale}
		case "varchar", "nvarchar":
			maxLength := length
			if maxLength == nil {
				maxLength = intPtr(255)
			}
			return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: maxLength}
		case "char", "nchar":
			maxLength := length
			if maxLength == nil {
				maxLength = intPtr(10)
			}
			return FunctionResult{DataType: "char", Nullable: true, MaxLength: maxLength}
		case "datetime", "date", "time":
			return FunctionResult{DataType: "datetime", Nullable: true}
		case "bit":
			return FunctionResult{DataType: "bit", Nullable: true}
		default:
			return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
		}
	}
	return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
}

// inferTypeFromExpression infers type from expression
func (a *ProcedureDefinitionAnalyzer) inferTypeFromExpression(expression string) FunctionResult {
	if expression == "" {
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
	}

	expr := strings.ToLower(expression)

	// Check for arithmetic operations
	if strings.Contains(expr, "/") || strings.Contains(expr, "*") || strings.Contains(expr, "+") || strings.Contains(expr, "-") {
		if strings.Contains(expr, "float") || strings.Contains(expr, "bet") || strings.Contains(expr, "amount") {
			return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
		}
		return FunctionResult{DataType: "int", Nullable: true}
	}

	// Check for string functions
	if strings.Contains(expr, "replace") || strings.Contains(expr, "concat") || strings.Contains(expr, "substring") {
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(500)}
	}

	// Check for CAST operations
	if strings.Contains(expr, "cast") {
		castMatch := regexp.MustCompile(`(?i)cast\s*\(.*as\s+(\w+)`).FindStringSubmatch(expr)
		if castMatch != nil {
			targetType := strings.ToLower(castMatch[1])
			switch targetType {
			case "int", "integer":
				return FunctionResult{DataType: "int", Nullable: true}
			case "float", "real", "decimal", "numeric":
				return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
			case "varchar", "nvarchar", "char", "nchar":
				return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
			case "datetime", "date", "time":
				return FunctionResult{DataType: "datetime", Nullable: true}
			case "bit":
				return FunctionResult{DataType: "bit", Nullable: true}
			}
		}
	}

	return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
}

// inferDataTypeFromColumnName infers data type from column name
func (a *ProcedureDefinitionAnalyzer) inferDataTypeFromColumnName(columnName string) FunctionResult {
	name := strings.ToLower(columnName)

	// ID columns are typically integers
	if strings.Contains(name, "id") || strings.HasSuffix(name, "_id") || strings.HasPrefix(name, "id_") {
		return FunctionResult{DataType: "int", Nullable: true}
	}

	// Bet and amount columns are typically decimals
	if strings.Contains(name, "bet") || strings.Contains(name, "amount") || strings.Contains(name, "balance") || strings.Contains(name, "price") {
		return FunctionResult{DataType: "decimal", Nullable: true, Precision: intPtr(18), Scale: intPtr(2)}
	}

	// Boolean-like columns are typically bit
	if strings.Contains(name, "active") || strings.Contains(name, "enabled") || strings.Contains(name, "visible") ||
		strings.Contains(name, "flag") || strings.Contains(name, "is_") || strings.HasPrefix(name, "is") ||
		strings.Contains(name, "has_") || strings.HasPrefix(name, "has") {
		return FunctionResult{DataType: "bit", Nullable: true}
	}

	// Date/time columns
	if strings.Contains(name, "date") || strings.Contains(name, "time") || strings.Contains(name, "created") ||
		strings.Contains(name, "modified") || strings.Contains(name, "updated") || strings.Contains(name, "deleted") {
		return FunctionResult{DataType: "datetime", Nullable: true}
	}

	// Path/URL columns are typically longer varchars
	if strings.Contains(name, "path") || strings.Contains(name, "url") || strings.Contains(name, "uri") || strings.Contains(name, "link") {
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
	}

	// Name columns are typically shorter varchars
	if strings.Contains(name, "name") || strings.Contains(name, "title") || strings.Contains(name, "label") {
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(100)}
	}

	// Description columns are typically longer varchars
	if strings.Contains(name, "description") || strings.Contains(name, "comment") || strings.Contains(name, "notes") || strings.Contains(name, "text") {
		return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(500)}
	}

	// Default to varchar with reasonable length
	return FunctionResult{DataType: "varchar", Nullable: true, MaxLength: intPtr(255)}
}

// buildTableAliasMap builds table alias map from SELECT statement
func (a *ProcedureDefinitionAnalyzer) buildTableAliasMap(selectStmt SelectStatement) map[string]string {
	aliasMap := make(map[string]string)

	// Look for FROM clause
	var fromClause *AstNode
	for _, child := range selectStmt.Children {
		if child.NodeType == "from_clause" {
			fromClause = &child
			break
		}
	}

	if fromClause != nil {
		for _, tableRef := range fromClause.Children {
			if tableRef.NodeType == "table_reference" && tableRef.Metadata != nil {
				tableName, _ := tableRef.Metadata["name"].(string)
				fullName, _ := tableRef.Metadata["fullName"].(string)
				alias, _ := tableRef.Metadata["alias"].(string)

				if alias != "" && tableName != "" {
					aliasMap[alias] = tableName
				} else if alias != "" && fullName != "" {
					aliasMap[alias] = fullName
				}
				// Also map the table name itself in case it's a CTE
				if tableName != "" {
					aliasMap[tableName] = tableName
				}
			}
		}
	}

	return aliasMap
}

// collectDirectTableReferences collects direct table references
func (a *ProcedureDefinitionAnalyzer) collectDirectTableReferences(selectStmt SelectStatement, tableReferences map[string]bool) {
	var fromClause *AstNode
	for _, child := range selectStmt.Children {
		if child.NodeType == "from_clause" {
			fromClause = &child
			break
		}
	}

	if fromClause != nil {
		for _, tableRef := range fromClause.Children {
			if tableRef.NodeType == "table_reference" && tableRef.Metadata != nil {
				tableName, _ := tableRef.Metadata["name"].(string)
				fullName, _ := tableRef.Metadata["fullName"].(string)

				if tableName != "" {
					tableReferences[tableName] = true
				}
				if fullName != "" {
					tableReferences[fullName] = true
				}
			}
		}
	}
}

// fetchTableColumnsBulk fetches table columns in bulk
func (a *ProcedureDefinitionAnalyzer) fetchTableColumnsBulk(tableNames map[string]bool) (map[string][]ColumnInfo, error) {
	if len(tableNames) == 0 {
		return make(map[string][]ColumnInfo), nil
	}

	var tableIdentifiers []TableIdentifier
	for tableName := range tableNames {
		parts := strings.Split(tableName, ".")
		if len(parts) == 2 {
			tableIdentifiers = append(tableIdentifiers, TableIdentifier{
				Schema:    parts[0],
				TableName: parts[1],
			})
		} else {
			tableIdentifiers = append(tableIdentifiers, TableIdentifier{
				Schema:    "dbo",
				TableName: tableName,
			})
		}
	}

	bulkResult, err := a.tableAccessor.GetMultipleTableColumns(tableIdentifiers)
	if err != nil {
		return nil, err
	}

	// Convert keys back to full table names
	result := make(map[string][]ColumnInfo)
	for key, columns := range bulkResult {
		result[key] = columns
	}

	return result, nil
}

// getTableColumnInfoFromBulk gets column info from bulk data
func (a *ProcedureDefinitionAnalyzer) getTableColumnInfoFromBulk(tableName, columnName string, bulkTableInfo map[string][]ColumnInfo) *ColumnInfo {
	possibleKeys := []string{
		tableName,
		"dbo." + tableName,
	}
	if strings.Contains(tableName, ".") {
		possibleKeys = append(possibleKeys, tableName)
	} else {
		possibleKeys = append(possibleKeys, "dbo."+tableName)
	}

	for _, key := range possibleKeys {
		columns, exists := bulkTableInfo[key]
		if exists {
			for _, col := range columns {
				if strings.EqualFold(col.Name, columnName) {
					return &col
				}
			}
		}
	}

	return nil
}

// intPtr creates an int pointer
func intPtr(i int) *int {
	return &i
}
