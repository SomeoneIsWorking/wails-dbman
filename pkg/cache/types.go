package cache

// Response types for API
type DatabasesResponse struct {
	Databases []string `json:"databases"`
	UpdatedAt string   `json:"updatedAt"`
}

type TableResponse struct {
	Name        string               `json:"name"`
	Schema      string               `json:"schema"`
	Columns     []ColumnResponse     `json:"columns"`
	PrimaryKey  []string             `json:"primaryKey"`
	ForeignKeys []ForeignKeyResponse `json:"foreignKeys"`
}

type ColumnResponse struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Nullable     bool    `json:"nullable"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	Primary      bool    `json:"primary"`
	Unique       bool    `json:"unique"`
	Foreign      bool    `json:"foreign"`
	Comment      *string `json:"comment,omitempty"`
}

type ForeignKeyResponse struct {
	Columns           []string `json:"columns"`
	ReferencedTable   string   `json:"referencedTable"`
	ReferencedColumns []string `json:"referencedColumns"`
}

type ViewResponse struct {
	Name       string           `json:"name"`
	Schema     string           `json:"schema"`
	Columns    []ColumnResponse `json:"columns"`
	Definition *string          `json:"definition,omitempty"`
}

type ProcedureResponse struct {
	Name       string                       `json:"name"`
	Schema     string                       `json:"schema"`
	Parameters []ProcedureParameterResponse `json:"parameters"`
	ResultSets []ResultSetResponse          `json:"resultSets"`
	Definition *string                      `json:"definition,omitempty"`
	Cached     bool                         `json:"cached"`
	LastCached string                       `json:"lastCached"`
}

type ProcedureParameterResponse struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Mode         string  `json:"mode"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	IsNullable   bool    `json:"isNullable"`
	MaxLength    *int    `json:"maxLength,omitempty"`
	Precision    *int    `json:"precision,omitempty"`
	Scale        *int    `json:"scale,omitempty"`
}

type ResultSetResponse struct {
	Columns []ResultSetColumnResponse `json:"columns"`
}

type ResultSetColumnResponse struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Nullable  bool   `json:"nullable"`
	MaxLength *int   `json:"maxLength,omitempty"`
	Precision *int   `json:"precision,omitempty"`
	Scale     *int   `json:"scale,omitempty"`
}

type SchemaResponse struct {
	Tables           []TableResponse     `json:"tables"`
	Views            []ViewResponse      `json:"views"`
	StoredProcedures []ProcedureResponse `json:"storedProcedures"`
	UpdatedAt        string              `json:"updatedAt"`
}

type TableDataResponse struct {
	Results []map[string]interface{} `json:"results"`
	Total   int                      `json:"total"`
}

type Filter struct {
	Column   string      `json:"column"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

type ProcedureParameterData struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Direction    string  `json:"direction"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	IsNullable   bool    `json:"isNullable"`
	MaxLength    *int    `json:"maxLength,omitempty"`
	Precision    *int    `json:"precision,omitempty"`
	Scale        *int    `json:"scale,omitempty"`
}

type ResultSetColumnData struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Nullable  bool   `json:"nullable"`
	MaxLength *int   `json:"maxLength,omitempty"`
	Precision *int   `json:"precision,omitempty"`
	Scale     *int   `json:"scale,omitempty"`
}

type ResultSetData struct {
	Columns []ResultSetColumnData `json:"columns"`
}

type ProcedureDetailsData struct {
	Definition *string                  `json:"definition,omitempty"`
	Parameters []ProcedureParameterData `json:"parameters"`
	ResultSets []ResultSetData          `json:"resultSets"`
}

type ConnectionDetail struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	Type             string           `json:"type"`
	Host             *string          `json:"host,omitempty"`
	Port             *int             `json:"port,omitempty"`
	Username         *string          `json:"username,omitempty"`
	Password         *string          `json:"password,omitempty"`
	Database         *string          `json:"database,omitempty"`
	ConnectionString *string          `json:"connectionString,omitempty"`
	Databases        []DatabaseDetail `json:"databases"`
}

type DatabaseDetail struct {
	Name   string          `json:"name"`
	Schema *SchemaResponse `json:"schema,omitempty"`
	Loaded bool            `json:"loaded"`
}
