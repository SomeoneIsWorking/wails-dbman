package adapters

import (
	"fmt"
	"wails-dbman/pkg/cache"
)

type ConnectionConfig struct {
	Type             string  `json:"type"`
	ConnectionID     string  `json:"connectionId"`
	Host             *string `json:"host,omitempty"`
	Port             *int    `json:"port,omitempty"`
	Username         *string `json:"username,omitempty"`
	Password         *string `json:"password,omitempty"`
	Database         *string `json:"database,omitempty"`
	ConnectionString *string `json:"connectionString,omitempty"`
}

type BaseAdapter interface {
	ListDatabases() ([]string, error)
	GetSchema(database string) (*cache.SchemaInfo, error)
	ExecuteQuery(query string, database string) ([]map[string]interface{}, error)
	GetTableData(database, schema, tableName string, options map[string]interface{}) (*cache.TableDataResponse, error)
	GetTableDataCount(database, schema, tableName string, options map[string]interface{}) (int, error)
	GetProcedureDetails(database, schema, name string) (*cache.StoredProcedureInfo, error)
}

type AdapterFactory struct{}

func (f *AdapterFactory) CreateAdapter(config ConnectionConfig) (BaseAdapter, error) {
	switch config.Type {
	case "postgres":
		return &PostgresAdapter{config: config}, nil
	case "mysql":
		return &MySQLAdapter{config: config}, nil
	case "mssql":
		return &MSSQLAdapter{config: config}, nil
	default:
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}
}
