package procedure

import (
	"fmt"
	"regexp"
	"strconv"
	"wails-dbman/pkg/cache"
)

// CacheTableAccessor implements TableAccessor using the cache
type CacheTableAccessor struct {
	connectionID string
	database     string
}

// NewCacheTableAccessor creates a new cache-based table accessor
func NewCacheTableAccessor(connectionID, database string) *CacheTableAccessor {
	return &CacheTableAccessor{
		connectionID: connectionID,
		database:     database,
	}
}

// GetTableColumns gets columns for a single table
func (c *CacheTableAccessor) GetTableColumns(schema, table string) ([]cache.ColumnInfo, error) {
	schemaResp, err := cache.GetCachedSchema(c.connectionID, c.database)
	if err != nil {
		return nil, err
	}
	if schemaResp == nil {
		return nil, fmt.Errorf("no cached schema found")
	}

	// Find the table
	for _, tableInfo := range schemaResp.Tables {
		if tableInfo.Schema == schema && tableInfo.Name == table {
			columns := make([]cache.ColumnInfo, len(tableInfo.Columns))
			for i, col := range tableInfo.Columns {
				columns[i] = cache.ColumnInfo{
					Name:         col.Name,
					Type:         col.Type,
					Nullable:     col.Nullable,
					DefaultValue: col.DefaultValue,
					Primary:      col.Primary,
					Unique:       col.Unique,
					Foreign:      col.Foreign,
					Comment:      col.Comment,
				}
			}
			return columns, nil
		}
	}

	return nil, fmt.Errorf("table %s.%s not found", schema, table)
}

// GetMultipleTableColumns gets columns for multiple tables in bulk
func (c *CacheTableAccessor) GetMultipleTableColumns(tables []TableIdentifier) (map[string][]ColumnInfo, error) {
	result := make(map[string][]ColumnInfo)

	schemaResp, err := cache.GetCachedSchema(c.connectionID, c.database)
	if err != nil {
		return result, err
	}
	if schemaResp == nil {
		return result, fmt.Errorf("no cached schema found")
	}

	// Create a lookup map for requested tables
	requestedTables := make(map[string]bool)
	for _, table := range tables {
		key := fmt.Sprintf("%s.%s", table.Schema, table.TableName)
		requestedTables[key] = true
	}

	// Find matching tables
	for _, tableInfo := range schemaResp.Tables {
		tableKey := fmt.Sprintf("%s.%s", tableInfo.Schema, tableInfo.Name)
		if requestedTables[tableKey] {
			columns := make([]ColumnInfo, len(tableInfo.Columns))
			for i, col := range tableInfo.Columns {
				columns[i] = ColumnInfo{
					Name:         col.Name,
					Type:         col.Type,
					Nullable:     col.Nullable,
					DefaultValue: col.DefaultValue,
					Primary:      col.Primary,
					Unique:       col.Unique,
					Foreign:      col.Foreign,
					Comment:      col.Comment,
					MaxLength:    parseMaxLength(col.Type),
					Precision:    parsePrecision(col.Type),
					Scale:        parseScale(col.Type),
				}
			}
			result[tableKey] = columns
		}
	}

	return result, nil
}

// parseMaxLength parses max length from type string
func parseMaxLength(typeStr string) *int {
	// Handle varchar(100), nvarchar(50), etc.
	re := regexp.MustCompile(`\w+\((\d+)\)`)
	match := re.FindStringSubmatch(typeStr)
	if len(match) > 1 {
		if val, err := strconv.Atoi(match[1]); err == nil {
			return &val
		}
	}
	return nil
}

// parsePrecision parses precision from type string
func parsePrecision(typeStr string) *int {
	// Handle decimal(18,2), numeric(10,4), etc.
	re := regexp.MustCompile(`\w+\((\d+),\s*\d+\)`)
	match := re.FindStringSubmatch(typeStr)
	if len(match) > 1 {
		if val, err := strconv.Atoi(match[1]); err == nil {
			return &val
		}
	}
	return nil
}

// parseScale parses scale from type string
func parseScale(typeStr string) *int {
	// Handle decimal(18,2), numeric(10,4), etc.
	re := regexp.MustCompile(`\w+\(\d+,\s*(\d+)\)`)
	match := re.FindStringSubmatch(typeStr)
	if len(match) > 1 {
		if val, err := strconv.Atoi(match[1]); err == nil {
			return &val
		}
	}
	return nil
}
