package procedure

// SqlAnalyzer analyzes SQL statements
type SqlAnalyzer struct{}

// NewSqlAnalyzer creates a new SQL analyzer
func NewSqlAnalyzer() *SqlAnalyzer {
	return &SqlAnalyzer{}
}

// AnalyzeProcedure analyzes a stored procedure
func (a *SqlAnalyzer) AnalyzeProcedure(definition string) *ProcedureAnalysisResult {
	// Use ChevrotainAstBuilder-like logic to parse
	astBuilder := NewChevrotainAstBuilder()
	astNodes := astBuilder.BuildAst(definition)

	// Extract statements from AST nodes
	statements := []SqlStatement{}
	selectStatements := []SelectStatement{}

	for _, node := range astNodes {
		a.extractStatementsFromChevrotainNode(node, &statements, &selectStatements, 0)
	}

	return &ProcedureAnalysisResult{
		Statements:       statements,
		SelectStatements: selectStatements,
		Warnings:         []string{},
		Success:          true,
	}
}

// extractStatementsFromNodes extracts SQL statements from AST nodes
func (a *SqlAnalyzer) extractStatementsFromNodes(astNodes []AstNode) []SqlStatement {
	var statements []SqlStatement
	var selectStatements []SelectStatement

	for _, node := range astNodes {
		a.extractStatementsFromChevrotainNode(node, &statements, &selectStatements, 0)
	}

	return statements
}

// extractStatementsFromChevrotainNode extracts statements from AST node recursively
func (a *SqlAnalyzer) extractStatementsFromChevrotainNode(node AstNode, statements *[]SqlStatement, selectStatements *[]SelectStatement, level int) {
	// Convert node to SQL statement if it's a statement type
	sqlStatement := a.convertChevrotainNodeToSqlStatement(node, level)
	if sqlStatement != nil {
		*statements = append(*statements, *sqlStatement)

		// If it's a SELECT statement, also add to selectStatements with AST children
		if sqlStatement.StatementType == "select" {
			var astNode AstNode
			if node.NodeType == "with_statement" {
				// For WITH statements, find the last SELECT (main SELECT)
				for i := len(node.Children) - 1; i >= 0; i-- {
					child := node.Children[i]
					if child.NodeType == "select_statement" {
						astNode = child
						break
					}
				}
			} else {
				astNode = node
			}

			if a.isResultProducingSelect(astNode) {
				selectStmt := SelectStatement{
					SqlStatement:      *sqlStatement,
					IsResultProducing: true,
					Children:          astNode.Children, // Preserve AST children
				}
				*selectStatements = append(*selectStatements, selectStmt)
			}
		}
	}

	// Recursively process children, but skip SELECT inside WITH
	for _, child := range node.Children {
		if node.NodeType == "with_statement" && child.NodeType == "select_statement" {
			// Skip CTE SELECT statements
			continue
		}
		a.extractStatementsFromChevrotainNode(child, statements, selectStatements, level+1)
	}
}

// convertChevrotainNodeToSqlStatement converts AST node to SQL statement
func (a *SqlAnalyzer) convertChevrotainNodeToSqlStatement(node AstNode, level int) *SqlStatement {
	switch node.NodeType {
	case "select_statement", "statement":
		if a.isResultProducingSelect(node) {
			return &SqlStatement{
				StatementType: "select",
				Content:       a.extractSelectContent(node),
				Level:         level,
			}
		}
	case "with_statement":
		// WITH statements contain the main SELECT as the last child or after CTEs
		for i := len(node.Children) - 1; i >= 0; i-- {
			child := node.Children[i]
			if child.NodeType == "select_statement" && a.isResultProducingSelect(child) {
				return &SqlStatement{
					StatementType: "select",
					Content:       a.extractSelectContent(child),
					Level:         level,
				}
			}
		}
	}

	return nil
}

// isResultProducingSelect checks if node represents a result-producing SELECT
func (a *SqlAnalyzer) isResultProducingSelect(node AstNode) bool {
	// Check if it has a select_clause child
	for _, child := range node.Children {
		if child.NodeType == "select_clause" {
			return true
		}
	}
	return false
}

// extractSelectContent extracts SELECT content from node
func (a *SqlAnalyzer) extractSelectContent(node AstNode) string {
	return "SELECT statement"
}
