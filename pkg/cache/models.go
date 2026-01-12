package cache

type Connection struct {
	ID               string  `json:"id" gorm:"primaryKey"`
	Name             string  `json:"name"`
	Type             string  `json:"type"`
	Host             *string `json:"host,omitempty"`
	Port             *int    `json:"port,omitempty"`
	Username         *string `json:"username,omitempty"`
	Password         *string `json:"password,omitempty"`
	Database         *string `json:"database,omitempty"`
	ConnectionString *string `json:"connectionString,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`

	// Relations
	Databases      []CachedDatabase `gorm:"foreignKey:ConnectionID"`
	Schemas        []CachedSchema   `gorm:"foreignKey:ConnectionID"`
	QueryHistories []QueryHistory   `gorm:"foreignKey:ConnectionID"`
}

type CachedDatabase struct {
	ID           string `json:"id" gorm:"primaryKey"`
	ConnectionID string `json:"connectionId"`
	Name         string `json:"name"`
	UpdatedAt    string `json:"updatedAt"`

	Connection Connection `gorm:"foreignKey:ConnectionID"`
}

type CachedSchema struct {
	ID           string `json:"id" gorm:"primaryKey"`
	ConnectionID string `json:"connectionId"`
	Database     string `json:"database"`
	UpdatedAt    string `json:"updatedAt"`

	Connection Connection        `gorm:"foreignKey:ConnectionID"`
	Tables     []CachedTable     `gorm:"foreignKey:SchemaID"`
	Views      []CachedView      `gorm:"foreignKey:SchemaID"`
	Procedures []CachedProcedure `gorm:"foreignKey:SchemaID"`
}

type CachedTable struct {
	ID        string `json:"id" gorm:"primaryKey"`
	SchemaID  string `json:"schemaId"`
	Name      string `json:"name"`
	Schema    string `json:"schema"`
	UpdatedAt string `json:"updatedAt"`

	CachedSchema CachedSchema            `gorm:"foreignKey:SchemaID"`
	Columns      []CachedTableColumn     `gorm:"foreignKey:TableID"`
	PrimaryKeys  []CachedTablePrimaryKey `gorm:"foreignKey:TableID"`
	ForeignKeys  []CachedTableForeignKey `gorm:"foreignKey:TableID"`
}

type CachedTableColumn struct {
	ID              string  `json:"id" gorm:"primaryKey"`
	TableID         string  `json:"tableId"`
	Name            string  `json:"name"`
	DataType        string  `json:"dataType"`
	IsNullable      bool    `json:"isNullable" gorm:"default:true"`
	DefaultValue    *string `json:"defaultValue,omitempty"`
	IsPrimary       bool    `json:"isPrimary" gorm:"default:false"`
	IsUnique        bool    `json:"isUnique" gorm:"default:false"`
	IsForeign       bool    `json:"isForeign" gorm:"default:false"`
	Comment         *string `json:"comment,omitempty"`
	MaxLength       *int    `json:"maxLength,omitempty"`
	Precision       *int    `json:"precision,omitempty"`
	Scale           *int    `json:"scale,omitempty"`
	OrdinalPosition int     `json:"ordinalPosition"`

	Table CachedTable `gorm:"foreignKey:TableID"`
}

type CachedTablePrimaryKey struct {
	ID              string `json:"id" gorm:"primaryKey"`
	TableID         string `json:"tableId"`
	ColumnName      string `json:"columnName"`
	OrdinalPosition int    `json:"ordinalPosition"`

	Table CachedTable `gorm:"foreignKey:TableID"`
}

type CachedTableForeignKey struct {
	ID               string `json:"id" gorm:"primaryKey"`
	TableID          string `json:"tableId"`
	ColumnName       string `json:"columnName"`
	ReferencedTable  string `json:"referencedTable"`
	ReferencedColumn string `json:"referencedColumn"`
	OrdinalPosition  int    `json:"ordinalPosition"`

	Table CachedTable `gorm:"foreignKey:TableID"`
}

type CachedView struct {
	ID         string  `json:"id" gorm:"primaryKey"`
	SchemaID   string  `json:"schemaId"`
	Name       string  `json:"name"`
	Schema     string  `json:"schema"`
	Definition *string `json:"definition,omitempty"`
	UpdatedAt  string  `json:"updatedAt"`

	CachedSchema CachedSchema       `gorm:"foreignKey:SchemaID"`
	Columns      []CachedViewColumn `gorm:"foreignKey:ViewID"`
}

type CachedViewColumn struct {
	ID              string  `json:"id" gorm:"primaryKey"`
	ViewID          string  `json:"viewId"`
	Name            string  `json:"name"`
	DataType        string  `json:"dataType"`
	IsNullable      bool    `json:"isNullable" gorm:"default:true"`
	DefaultValue    *string `json:"defaultValue,omitempty"`
	MaxLength       *int    `json:"maxLength,omitempty"`
	Precision       *int    `json:"precision,omitempty"`
	Scale           *int    `json:"scale,omitempty"`
	OrdinalPosition int     `json:"ordinalPosition"`

	View CachedView `gorm:"foreignKey:ViewID"`
}

type QueryHistory struct {
	ID           string  `json:"id" gorm:"primaryKey"`
	ConnectionID string  `json:"connectionId"`
	Query        string  `json:"query"`
	Result       *string `json:"result,omitempty"`
	Error        *string `json:"error,omitempty"`
	ExecutedAt   string  `json:"executedAt"`

	Connection Connection `gorm:"foreignKey:ConnectionID"`
}

type CachedProcedure struct {
	ID                  string  `json:"id" gorm:"primaryKey"`
	SchemaID            string  `json:"schemaId"`
	Schema              string  `json:"schema"`
	ProcedureName       string  `json:"procedureName"`
	Definition          *string `json:"definition,omitempty"`
	DefinitionReadError *string `json:"definitionReadError,omitempty"`
	ParametersCached    bool    `json:"parametersCached" gorm:"default:false"`
	ParametersReadError *string `json:"parametersReadError,omitempty"`
	ResultSetsCached    bool    `json:"resultSetsCached" gorm:"default:false"`
	ResultSetsReadError *string `json:"resultSetsReadError,omitempty"`
	FailedToLoad        bool    `json:"failedToLoad" gorm:"default:false"`
	FailureReason       *string `json:"failureReason,omitempty"`
	CreatedAt           string  `json:"createdAt"`
	UpdatedAt           string  `json:"updatedAt"`

	CachedSchema CachedSchema         `gorm:"foreignKey:SchemaID"`
	Parameters   []ProcedureParameter `gorm:"foreignKey:ProcedureID"`
	ResultSets   []ProcedureResultSet `gorm:"foreignKey:ProcedureID"`
}

type ProcedureParameter struct {
	ID              string  `json:"id" gorm:"primaryKey"`
	ProcedureID     string  `json:"procedureId"`
	Name            string  `json:"name"`
	DataType        string  `json:"dataType"`
	Direction       string  `json:"direction"`
	DefaultValue    *string `json:"defaultValue,omitempty"`
	IsNullable      bool    `json:"isNullable" gorm:"default:true"`
	MaxLength       *int    `json:"maxLength,omitempty"`
	Precision       *int    `json:"precision,omitempty"`
	Scale           *int    `json:"scale,omitempty"`
	OrdinalPosition int     `json:"ordinalPosition"`

	Procedure CachedProcedure `gorm:"foreignKey:ProcedureID"`
}

type ProcedureResultSet struct {
	ID             string  `json:"id" gorm:"primaryKey"`
	ProcedureID    string  `json:"procedureId"`
	ResultSetIndex int     `json:"resultSetIndex"`
	Name           *string `json:"name,omitempty"`

	Procedure CachedProcedure   `gorm:"foreignKey:ProcedureID"`
	Columns   []ResultSetColumn `gorm:"foreignKey:ResultSetID"`
}

type ResultSetColumn struct {
	ID              string `json:"id" gorm:"primaryKey"`
	ResultSetID     string `json:"resultSetId"`
	Name            string `json:"name"`
	DataType        string `json:"dataType"`
	IsNullable      bool   `json:"isNullable" gorm:"default:true"`
	MaxLength       *int   `json:"maxLength,omitempty"`
	Precision       *int   `json:"precision,omitempty"`
	Scale           *int   `json:"scale,omitempty"`
	OrdinalPosition int    `json:"ordinalPosition"`

	ResultSet ProcedureResultSet `gorm:"foreignKey:ResultSetID"`
}
