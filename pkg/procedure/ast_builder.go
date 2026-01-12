package procedure

import (
	"strings"
)

// ChevrotainAstBuilder builds AST from SQL text (mimicking Chevrotain behavior)
type ChevrotainAstBuilder struct{}

// NewChevrotainAstBuilder creates a new AST builder
func NewChevrotainAstBuilder() *ChevrotainAstBuilder {
	return &ChevrotainAstBuilder{}
}

// BuildAst builds AST from SQL text
func (b *ChevrotainAstBuilder) BuildAst(sql string) []AstNode {
	// Tokenize the SQL
	tokens := b.tokenize(sql)

	// Parse tokens into AST
	return b.parseStatements(tokens)
}

// tokenize breaks SQL into tokens
func (b *ChevrotainAstBuilder) tokenize(sql string) []string {
	// Improved tokenization to handle brackets, strings, comments, etc.
	var tokens []string
	var currentToken strings.Builder
	inBrackets := false
	inQuotes := false
	quoteChar := byte(0)
	inComment := false

	for i := 0; i < len(sql); i++ {
		char := sql[i]

		if inComment {
			if char == '\n' {
				inComment = false
			}
			continue
		}

		switch {
		case !inQuotes && !inBrackets && char == '-' && i+1 < len(sql) && sql[i+1] == '-':
			// Start of comment
			inComment = true
			i++ // Skip the second -
			continue
		case !inQuotes && !inBrackets && (char == '(' || char == ')' || char == ',' || char == ';' || char == '='):
			// Flush current token
			if currentToken.Len() > 0 {
				tokens = append(tokens, strings.ToUpper(currentToken.String()))
				currentToken.Reset()
			}
			tokens = append(tokens, string(char))
		case !inQuotes && char == '[':
			inBrackets = true
			currentToken.WriteByte(char)
		case !inQuotes && char == ']':
			inBrackets = false
			currentToken.WriteByte(char)
			tokens = append(tokens, strings.ToUpper(currentToken.String()))
			currentToken.Reset()
		case !inBrackets && (char == '\'' || char == '"'):
			if !inQuotes {
				inQuotes = true
				quoteChar = char
			} else if char == quoteChar {
				inQuotes = false
				quoteChar = 0
			}
			currentToken.WriteByte(char)
		case char == ' ' || char == '\t' || char == '\n' || char == '\r':
			if inQuotes || inBrackets {
				currentToken.WriteByte(char)
			} else {
				// Flush current token
				if currentToken.Len() > 0 {
					tokens = append(tokens, strings.ToUpper(currentToken.String()))
					currentToken.Reset()
				}
			}
		default:
			currentToken.WriteByte(char)
		}
	}

	// Flush remaining token
	if currentToken.Len() > 0 {
		tokens = append(tokens, strings.ToUpper(currentToken.String()))
	}

	// Filter out empty tokens
	var filtered []string
	for _, token := range tokens {
		if strings.TrimSpace(token) != "" {
			filtered = append(filtered, token)
		}
	}

	return filtered
}

// parseStatements parses tokens into AST nodes
func (b *ChevrotainAstBuilder) parseStatements(tokens []string) []AstNode {
	var nodes []AstNode
	i := 0

	for i < len(tokens) {
		node := b.parseStatement(tokens, &i)
		if node != nil {
			nodes = append(nodes, *node)
		} else {
			i++
		}
	}

	return nodes
}

// parseStatement parses a single statement
func (b *ChevrotainAstBuilder) parseStatement(tokens []string, i *int) *AstNode {
	if *i >= len(tokens) {
		return nil
	}

	token := tokens[*i]

	switch token {
	case "WITH":
		return b.parseWithStatement(tokens, i)
	case "SELECT":
		return b.parseSelectStatement(tokens, i)
	case "CREATE":
		return b.parseCreateStatement(tokens, i)
	case "INSERT":
		return b.parseInsertStatement(tokens, i)
	case "UPDATE":
		return b.parseUpdateStatement(tokens, i)
	case "DELETE":
		return b.parseDeleteStatement(tokens, i)
	case "IF":
		return b.parseIfStatement(tokens, i)
	case "WHILE":
		return b.parseWhileStatement(tokens, i)
	case "DECLARE":
		return b.parseDeclareStatement(tokens, i)
	case "SET":
		return b.parseSetStatement(tokens, i)
	default:
		// Skip unknown tokens
		*i++
		return nil
	}
}

// parseWithStatement parses a WITH statement (CTE)
func (b *ChevrotainAstBuilder) parseWithStatement(tokens []string, i *int) *AstNode {
	node := AstNode{
		NodeType: "with_statement",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	// Skip WITH
	*i++

	// Parse CTE definitions until SELECT
	for *i < len(tokens) && tokens[*i] != "SELECT" {
		if tokens[*i] == "," {
			*i++
			continue
		}

		// Parse CTE definition
		cteNode := b.parseCteDefinition(tokens, i)
		if cteNode != nil {
			node.Children = append(node.Children, *cteNode)
		} else {
			*i++
		}
	}

	// Now parse the main SELECT
	if *i < len(tokens) && tokens[*i] == "SELECT" {
		selectNode := b.parseSelectStatement(tokens, i)
		if selectNode != nil {
			node.Children = append(node.Children, *selectNode)
		}
	}

	// Skip to end
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}

	return &node
}

// parseCteDefinition parses a CTE definition
func (b *ChevrotainAstBuilder) parseCteDefinition(tokens []string, i *int) *AstNode {
	node := AstNode{
		NodeType: "cte_definition",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	// Get CTE name
	if *i < len(tokens) {
		node.Metadata["name"] = tokens[*i]
		*i++
	}

	// Skip AS
	if *i < len(tokens) && tokens[*i] == "AS" {
		*i++
	}

	// Skip (
	if *i < len(tokens) && tokens[*i] == "(" {
		*i++
	}

	// Parse the SELECT inside the CTE
	if *i < len(tokens) && tokens[*i] == "SELECT" {
		selectNode := b.parseSelectStatement(tokens, i)
		if selectNode != nil {
			node.Children = append(node.Children, *selectNode)
		}
	}

	// Skip )
	if *i < len(tokens) && tokens[*i] == ")" {
		*i++
	}

	return &node
}

// parseSelectStatement parses a SELECT statement
func (b *ChevrotainAstBuilder) parseSelectStatement(tokens []string, i *int) *AstNode {
	node := AstNode{
		NodeType: "select_statement",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	// Skip SELECT
	*i++

	// Parse SELECT clause
	selectClause := b.parseSelectClause(tokens, i)
	if selectClause != nil {
		node.Children = append(node.Children, *selectClause)
	}

	// Parse FROM clause
	fromClause := b.parseFromClause(tokens, i)
	if fromClause != nil {
		node.Children = append(node.Children, *fromClause)
	}

	// Skip remaining tokens until statement end or closing paren
	for *i < len(tokens) && tokens[*i] != ";" && tokens[*i] != ")" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}

	return &node
}

// parseSelectClause parses the SELECT clause
func (b *ChevrotainAstBuilder) parseSelectClause(tokens []string, i *int) *AstNode {
	node := AstNode{
		NodeType: "select_clause",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	// Parse column list until FROM or other keywords
	for *i < len(tokens) {
		token := tokens[*i]

		if token == "FROM" || token == "WHERE" || token == "GROUP" || token == "ORDER" || token == "HAVING" || token == ";" {
			break
		}

		if token == "," {
			*i++
			continue
		}

		// Parse column expression
		columnNode := b.parseColumnReference(tokens, i)
		if columnNode != nil {
			node.Children = append(node.Children, *columnNode)
		} else {
			*i++
		}
	}

	return &node
}

// parseColumnReference parses a column reference
func (b *ChevrotainAstBuilder) parseColumnReference(tokens []string, i *int) *AstNode {
	if *i >= len(tokens) {
		return nil
	}

	node := AstNode{
		NodeType: "column_reference",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	// Parse expression until comma or FROM, handling nested parentheses and quotes
	expr := ""
	alias := ""
	parenDepth := 0
	inSingleQuote := false
	inDoubleQuote := false

	for *i < len(tokens) {
		token := tokens[*i]

		// Handle quotes
		if !inDoubleQuote && token == "'" {
			inSingleQuote = !inSingleQuote
		} else if !inSingleQuote && token == "\"" {
			inDoubleQuote = !inDoubleQuote
		}

		// Handle parentheses
		if !inSingleQuote && !inDoubleQuote {
			if token == "(" {
				parenDepth++
			} else if token == ")" {
				parenDepth--
			}
		}

		// Check for end of expression
		if !inSingleQuote && !inDoubleQuote && parenDepth == 0 {
			if token == "," || token == "FROM" || token == "WHERE" || token == "GROUP" || token == "ORDER" || token == "HAVING" {
				break
			}

			if strings.ToUpper(token) == "AS" {
				*i++
				if *i < len(tokens) {
					alias = tokens[*i]
					*i++
				}
				break
			}
		}

		if expr != "" {
			expr += " "
		}
		expr += token
		*i++
	}

	// Parse the expression
	b.parseColumnExpression(expr, alias, &node.Metadata)

	return &node
}

// parseColumnExpression parses a column expression
func (b *ChevrotainAstBuilder) parseColumnExpression(expr, alias string, metadata *map[string]interface{}) {
	(*metadata)["expression"] = expr
	(*metadata)["alias"] = alias

	// Check if it's a function
	if b.isFunctionExpression(expr) {
		(*metadata)["isFunction"] = true
		(*metadata)["functionName"] = b.extractFunctionName(expr)
	} else if b.isCaseExpression(expr) {
		(*metadata)["isCase"] = true
		(*metadata)["columnName"] = alias
		if alias == "" {
			(*metadata)["columnName"] = "case_expression"
		}
	} else {
		// Parse table.column
		parts := strings.Split(expr, ".")
		if len(parts) >= 2 {
			(*metadata)["columnName"] = parts[len(parts)-1]
			(*metadata)["tableName"] = parts[len(parts)-2]
			if len(parts) >= 3 {
				(*metadata)["schemaName"] = parts[len(parts)-3]
			}
		} else {
			(*metadata)["columnName"] = expr
		}
	}
}

// isFunctionExpression checks if expression is a function
func (b *ChevrotainAstBuilder) isFunctionExpression(expr string) bool {
	functions := []string{"COUNT", "SUM", "AVG", "MIN", "MAX", "CAST", "CONVERT", "ISNULL", "REPLACE", "CONCAT", "SUBSTRING", "CONCAT_WS", "COL_NAME", "OBJECT_SCHEMA_NAME", "OBJECT_NAME", "QUOTENAME", "COLUMNPROPERTY"}
	upperExpr := strings.ToUpper(strings.TrimSpace(expr))

	for _, fn := range functions {
		if strings.HasPrefix(upperExpr, fn) {
			return true
		}
	}
	return false
}

// isCaseExpression checks if expression is a CASE statement
func (b *ChevrotainAstBuilder) isCaseExpression(expr string) bool {
	upperExpr := strings.ToUpper(strings.TrimSpace(expr))
	return strings.HasPrefix(upperExpr, "CASE")
}

// extractFunctionName extracts function name from expression
func (b *ChevrotainAstBuilder) extractFunctionName(expr string) string {
	upperExpr := strings.ToUpper(strings.TrimSpace(expr))
	for _, fn := range []string{"COUNT", "SUM", "AVG", "MIN", "MAX", "CAST", "CONVERT", "ISNULL", "REPLACE", "CONCAT", "SUBSTRING", "CONCAT_WS", "COL_NAME", "OBJECT_SCHEMA_NAME", "OBJECT_NAME", "QUOTENAME", "COLUMNPROPERTY"} {
		if strings.HasPrefix(upperExpr, fn) && (strings.HasPrefix(upperExpr[len(fn):], "(") || strings.HasPrefix(upperExpr[len(fn):], " (")) {
			return fn
		}
	}
	return ""
}

// parseFromClause parses the FROM clause
func (b *ChevrotainAstBuilder) parseFromClause(tokens []string, i *int) *AstNode {
	if *i >= len(tokens) || tokens[*i] != "FROM" {
		return nil
	}

	node := AstNode{
		NodeType: "from_clause",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	*i++ // Skip FROM

	// Parse table references until WHERE or other keywords
	for *i < len(tokens) {
		token := tokens[*i]

		if token == "WHERE" || token == "GROUP" || token == "ORDER" || token == "HAVING" || token == ";" {
			break
		}

		if token == "," || strings.Contains(token, "JOIN") {
			*i++
			continue
		}

		// Parse table reference
		tableNode := b.parseTableReference(tokens, i)
		if tableNode != nil {
			node.Children = append(node.Children, *tableNode)
		} else {
			*i++
		}
	}

	return &node
}

// parseTableReference parses a table reference
func (b *ChevrotainAstBuilder) parseTableReference(tokens []string, i *int) *AstNode {
	if *i >= len(tokens) {
		return nil
	}

	node := AstNode{
		NodeType: "table_reference",
		Metadata: make(map[string]interface{}),
		Children: []AstNode{},
	}

	tableName := tokens[*i]
	node.Metadata["name"] = tableName
	node.Metadata["fullName"] = tableName

	*i++

	// Check for alias
	if *i < len(tokens) && tokens[*i] != "," && !strings.Contains(tokens[*i], "JOIN") &&
		tokens[*i] != "WHERE" && tokens[*i] != "GROUP" && tokens[*i] != "ORDER" && tokens[*i] != "HAVING" {
		alias := tokens[*i]
		if alias != tableName {
			node.Metadata["alias"] = alias
		}
		*i++
	}

	return &node
}

// Stub implementations for other statement types
func (b *ChevrotainAstBuilder) parseCreateStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "create_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseInsertStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "insert_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseUpdateStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "update_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseDeleteStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "delete_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseIfStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "if_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseWhileStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "while_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseDeclareStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "declare_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}

func (b *ChevrotainAstBuilder) parseSetStatement(tokens []string, i *int) *AstNode {
	*i++
	for *i < len(tokens) && tokens[*i] != ";" {
		*i++
	}
	if *i < len(tokens) && tokens[*i] == ";" {
		*i++
	}
	return &AstNode{NodeType: "set_statement", Metadata: make(map[string]interface{}), Children: []AstNode{}}
}
