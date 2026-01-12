package procedure

// DefinitionAnalysisResult represents the result of analyzing a stored procedure
type DefinitionAnalysisResult struct {
	ResultSets      []ResultSet `json:"resultSets"`
	TotalConfidence float64     `json:"totalConfidence"`
	Warnings        []string    `json:"warnings"`
}

// ResultSet represents a result set returned by a stored procedure
type ResultSet struct {
	Columns []Column `json:"columns"`
}

// Column represents a column in a result set
type Column struct {
	Name      string `json:"name"`
	DataType  string `json:"dataType"`
	Nullable  bool   `json:"nullable"`
	MaxLength *int   `json:"maxLength,omitempty"`
	Precision *int   `json:"precision,omitempty"`
	Scale     *int   `json:"scale,omitempty"`
}

// TableInfoAccessor interface for accessing table information
type TableInfoAccessor interface {
	GetMultipleTableColumns(tables []TableIdentifier) (map[string][]ColumnInfo, error)
}

// TableIdentifier represents a table reference
type TableIdentifier struct {
	Schema    string
	TableName string
}

// ColumnInfo represents column information
type ColumnInfo struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Nullable     bool    `json:"nullable"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	Primary      bool    `json:"primary"`
	Unique       bool    `json:"unique"`
	Foreign      bool    `json:"foreign"`
	Comment      *string `json:"comment,omitempty"`
	MaxLength    *int    `json:"maxLength,omitempty"`
	Precision    *int    `json:"precision,omitempty"`
	Scale        *int    `json:"scale,omitempty"`
}

// ProcedureAnalysisResult represents the result of SQL analysis
type ProcedureAnalysisResult struct {
	Statements       []SqlStatement
	SelectStatements []SelectStatement
	Warnings         []string
	Success          bool
}

// SqlStatement represents a SQL statement
type SqlStatement struct {
	StatementType string
	Content       string
	Level         int
}

// SelectStatement represents a SELECT statement
type SelectStatement struct {
	SqlStatement
	IsResultProducing bool
	Children          []AstNode
}

// AstNode represents an AST node
type AstNode struct {
	NodeType string
	Metadata map[string]interface{}
	Children []AstNode
}

// FunctionResult represents the result of function analysis
type FunctionResult struct {
	DataType  string
	Nullable  bool
	MaxLength *int
	Precision *int
	Scale     *int
}
