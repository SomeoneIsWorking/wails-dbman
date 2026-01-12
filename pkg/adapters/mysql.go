package adapters

import (
	"fmt"
	"time"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/procedure"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type MySQLAdapter struct {
	config ConnectionConfig
	db     *gorm.DB
}

func (a *MySQLAdapter) connect() (*gorm.DB, error) {
	if a.db != nil {
		return a.db, nil
	}
	dsn := a.buildDSN()
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	a.db = db
	return db, nil
}

func (a *MySQLAdapter) buildDSN() string {
	host := "localhost"
	if a.config.Host != nil {
		host = *a.config.Host
	}
	port := 3306
	if a.config.Port != nil {
		port = *a.config.Port
	}
	user := ""
	if a.config.Username != nil {
		user = *a.config.Username
	}
	password := ""
	if a.config.Password != nil {
		password = *a.config.Password
	}
	dbname := ""
	if a.config.Database != nil {
		dbname = *a.config.Database
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, password, host, port, dbname)
}

func (a *MySQLAdapter) ListDatabases() ([]string, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}
	var databases []string
	err = db.Raw("SHOW DATABASES").Pluck("Database", &databases).Error
	return databases, err
}

func (a *MySQLAdapter) GetSchema(database string) (*cache.SchemaInfo, error) {
	return &cache.SchemaInfo{}, nil
}

func (a *MySQLAdapter) ExecuteQuery(query string, database string) ([]map[string]interface{}, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}
	rows, err := db.Raw(query).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		err = rows.Scan(valuePtrs...)
		if err != nil {
			return nil, err
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}
	return results, nil
}

func (a *MySQLAdapter) GetTableData(database, schema, tableName string, options map[string]interface{}) (*cache.TableDataResponse, error) {
	page := 1
	if p, ok := options["page"].(int); ok {
		page = p
	}
	limit := 100
	if l, ok := options["limit"].(int); ok {
		limit = l
	}
	offset := (page - 1) * limit
	query := fmt.Sprintf("SELECT * FROM %s LIMIT %d OFFSET %d", tableName, limit, offset)
	results, err := a.ExecuteQuery(query, database)
	if err != nil {
		return nil, err
	}
	countQuery := fmt.Sprintf("SELECT COUNT(*) as total FROM %s", tableName)
	countResults, err := a.ExecuteQuery(countQuery, database)
	if err != nil {
		return nil, err
	}
	total := 0
	if len(countResults) > 0 {
		if t, ok := countResults[0]["total"].(int64); ok {
			total = int(t)
		}
	}
	return &cache.TableDataResponse{
		Results: results,
		Total:   total,
	}, nil
}

func (a *MySQLAdapter) GetProcedureDetails(database, schema, name string) (*cache.StoredProcedureInfo, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}

	// Get procedure definition
	var definition *string
	query := `
		SELECT ROUTINE_DEFINITION
		FROM information_schema.ROUTINES
		WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = ? AND ROUTINE_TYPE = 'PROCEDURE'
	`
	err = db.Raw(query, database, name).Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	// Get parameters
	var parameters []cache.ParameterInfo
	paramQuery := `
		SELECT 
			PARAMETER_NAME as name,
			DTD_IDENTIFIER as type,
			CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as is_nullable,
			CHARACTER_MAXIMUM_LENGTH as max_length,
			NUMERIC_PRECISION as precision,
			NUMERIC_SCALE as scale
		FROM information_schema.PARAMETERS
		WHERE SPECIFIC_SCHEMA = ? AND SPECIFIC_NAME = ? AND PARAMETER_MODE = 'IN'
		ORDER BY ORDINAL_POSITION
	`
	rows, err := db.Raw(paramQuery, database, name).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var param cache.ParameterInfo
		var maxLength, precision, scale *int
		err := rows.Scan(&param.Name, &param.Type, &param.IsNullable, &maxLength, &precision, &scale)
		if err != nil {
			continue
		}
		param.MaxLength = maxLength
		param.Precision = precision
		param.Scale = scale
		param.Mode = "IN"
		parameters = append(parameters, param)
	}

	// Analyze procedure definition for result sets
	resultSets := []cache.ResultSetInfo{}
	if definition != nil {
		// Use procedure analysis
		analysisResult, err := procedure.AnalyzeResultSets(a.config.ConnectionID, database, schema, name, *definition)
		if err == nil && len(analysisResult.ResultSets) > 0 {
			for _, rs := range analysisResult.ResultSets {
				columns := make([]cache.ResultSetColumnInfo, len(rs.Columns))
				for i, col := range rs.Columns {
					columns[i] = cache.ResultSetColumnInfo{
						Name:      col.Name,
						Type:      col.DataType,
						Nullable:  col.Nullable,
						MaxLength: col.MaxLength,
						Precision: col.Precision,
						Scale:     col.Scale,
					}
				}
				resultSets = append(resultSets, cache.ResultSetInfo{
					Columns: columns,
				})
			}
		}
	}

	return &cache.StoredProcedureInfo{
		Name:       name,
		Schema:     schema,
		Definition: definition,
		Parameters: parameters,
		ResultSets: resultSets,
		Cached:     true,
		LastCached: time.Now().Format(time.RFC3339),
	}, nil
}
