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
}

func (a *MySQLAdapter) connect(database string) (*gorm.DB, error) {
	database = a.config.Database
	dsn := a.buildDSN(database)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

func (a *MySQLAdapter) buildDSN(database string) string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local", a.config.Username, a.config.Password, a.config.Host, a.config.Port, database)
}

func (a *MySQLAdapter) ListDatabases() ([]string, error) {
	db, err := a.connect("master")
	if err != nil {
		return nil, err
	}
	var databases []string
	err = db.Raw("SHOW DATABASES").Pluck("Database", &databases).Error
	return databases, err
}

func (a *MySQLAdapter) GetSchema(database string) (*cache.SchemaInfo, error) {
	// MySQL schema fetching logic would go here
	return &cache.SchemaInfo{}, nil
}

func (a *MySQLAdapter) ExecuteQuery(query string, database string) (*cache.ExecuteQueryResponse, error) {
	startTime := time.Now()
	db, err := a.connect(database)
	if err != nil {
		return nil, err
	}
	rows, err := db.Raw(query).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := &cache.ExecuteQueryResponse{
		ResultSets: []cache.ResultSet{},
	}

	for {
		columns, err := rows.Columns()
		if err != nil {
			return nil, err
		}

		var data []map[string]interface{}
		rowCount := 0
		for rows.Next() {
			if rowCount < MaxQueryRows {
				values := make([]interface{}, len(columns))
				valuePtrs := make([]interface{}, len(columns))
				for i := range values {
					valuePtrs[i] = &values[i]
				}
				if err := rows.Scan(valuePtrs...); err != nil {
					return nil, err
				}
				row := make(map[string]interface{})
				for i, col := range columns {
					row[col] = values[i]
				}
				data = append(data, row)
			}
			rowCount++
		}

		response.ResultSets = append(response.ResultSets, cache.ResultSet{
			Data:         data,
			Columns:      columns,
			RowsAffected: int64(rowCount),
		})

		if !rows.NextResultSet() {
			break
		}
	}

	response.ElapsedMs = time.Since(startTime).Milliseconds()
	return response, nil
}

func (a *MySQLAdapter) buildWhereClause(filters []cache.Filter) (string, []interface{}) {
	if len(filters) == 0 {
		return "", nil
	}
	where := " WHERE "
	args := []interface{}{}
	for i, f := range filters {
		if i > 0 {
			where += " AND "
		}
		where += fmt.Sprintf("`%s` %s ?", f.Column, f.Operator)
		args = append(args, f.Value)
	}
	return where, args
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
	filters, _ := options["filters"].([]cache.Filter)
	sortColumn, _ := options["sortColumn"].(string)
	sortDirection, _ := options["sortDirection"].(string)

	whereClause, args := a.buildWhereClause(filters)
	offset := (page - 1) * limit

	orderByClause := ""
	if sortColumn != "" {
		direction := "ASC"
		if sortDirection == "desc" {
			direction = "DESC"
		}
		orderByClause = fmt.Sprintf(" ORDER BY `%s` %s", sortColumn, direction)
	}

	query := fmt.Sprintf("SELECT * FROM %s%s%s LIMIT %d OFFSET %d", tableName, whereClause, orderByClause, limit, offset)

	db, err := a.connect(database)
	if err != nil {
		return nil, err
	}

	rows, err := db.Raw(query, args...).Rows()
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

	return &cache.TableDataResponse{
		Results: results,
	}, nil
}

func (a *MySQLAdapter) GetTableDataCount(database, schema, tableName string, options map[string]interface{}) (int, error) {
	filters, _ := options["filters"].([]cache.Filter)
	whereClause, args := a.buildWhereClause(filters)
	countQuery := fmt.Sprintf("SELECT COUNT(*) as total FROM %s%s", tableName, whereClause)

	db, err := a.connect(database)
	if err != nil {
		return 0, err
	}

	var total int64
	err = db.Raw(countQuery, args...).Scan(&total).Error
	if err != nil {
		return 0, err
	}

	return int(total), nil
}

func (a *MySQLAdapter) GetProcedureDetails(database, schema, name string) (*cache.StoredProcedureInfo, error) {
	db, err := a.connect(database)
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
