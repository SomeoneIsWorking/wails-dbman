package adapters

import (
	"fmt"
	"time"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/procedure"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type PostgresAdapter struct {
	config ConnectionConfig
}

func (a *PostgresAdapter) connect(database string) (*gorm.DB, error) {
	dsn := a.buildDSN(database)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

func (a *PostgresAdapter) buildDSN(database string) string {
	host := a.config.Host
	port := a.config.Port
	user := a.config.Username
	password := a.config.Password
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, database)
}

func (a *PostgresAdapter) ListDatabases() ([]string, error) {
	db, err := a.connect("master")
	if err != nil {
		return nil, err
	}
	var databases []string
	err = db.Raw("SELECT datname FROM pg_database WHERE datistemplate = false").Pluck("datname", &databases).Error
	return databases, err
}

func (a *PostgresAdapter) GetSchema(database string) (*cache.SchemaInfo, error) {
	// Implement schema fetching
	// This is complex, need to query pg_catalog
	return &cache.SchemaInfo{}, nil
}

func (a *PostgresAdapter) ExecuteQuery(query string, database string) ([]map[string]interface{}, error) {
	db, err := a.connect(database)
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

func (a *PostgresAdapter) buildWhereClause(filters []cache.Filter) (string, []interface{}) {
	if len(filters) == 0 {
		return "", nil
	}
	where := " WHERE "
	args := []interface{}{}
	for i, f := range filters {
		if i > 0 {
			where += " AND "
		}
		// Basic implementation, should be careful with operators and column names
		// Using positional parameters $1, $2 for Postgres
		where += fmt.Sprintf("\"%s\" %s $%d", f.Column, f.Operator, len(args)+1)
		args = append(args, f.Value)
	}
	return where, args
}

func (a *PostgresAdapter) GetTableData(database, schema, tableName string, options map[string]interface{}) (*cache.TableDataResponse, error) {
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
		orderByClause = fmt.Sprintf(" ORDER BY \"%s\" %s", sortColumn, direction)
	}

	query := fmt.Sprintf("SELECT * FROM %s.%s%s%s LIMIT %d OFFSET %d", schema, tableName, whereClause, orderByClause, limit, offset)

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

func (a *PostgresAdapter) GetTableDataCount(database, schema, tableName string, options map[string]interface{}) (int, error) {
	filters, _ := options["filters"].([]cache.Filter)
	whereClause, args := a.buildWhereClause(filters)
	countQuery := fmt.Sprintf("SELECT COUNT(*) as total FROM %s.%s%s", schema, tableName, whereClause)

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

func (a *PostgresAdapter) GetProcedureDetails(database, schema, name string) (*cache.StoredProcedureInfo, error) {
	db, err := a.connect(database)
	if err != nil {
		return nil, err
	}

	// Get procedure/function definition
	var definition *string
	query := `
		SELECT pg_get_functiondef(p.oid) as definition
		FROM pg_proc p
		JOIN pg_namespace n ON p.pronamespace = n.oid
		WHERE n.nspname = $1 AND p.proname = $2
		LIMIT 1
	`
	err = db.Raw(query, schema, name).Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	// Get parameters
	var parameters []cache.ParameterInfo
	paramQuery := `
		SELECT 
			COALESCE(p.proargnames[ordinal_position], 'param_' || ordinal_position) as name,
			CASE 
				WHEN p.proargtypes[ordinal_position] IS NOT NULL THEN 
					(SELECT t.typname FROM pg_type t WHERE t.oid = p.proargtypes[ordinal_position])
				ELSE 'unknown'
			END as type,
			false as is_nullable
		FROM pg_proc p
		JOIN pg_namespace n ON p.pronamespace = n.oid
		CROSS JOIN generate_subscripts(COALESCE(p.proargtypes, ARRAY[]::oid[]), 1) AS ordinal_position
		WHERE n.nspname = $1 AND p.proname = $2
		ORDER BY ordinal_position
	`
	rows, err := db.Raw(paramQuery, schema, name).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var param cache.ParameterInfo
		err := rows.Scan(&param.Name, &param.Type, &param.IsNullable)
		if err != nil {
			continue
		}
		param.Mode = "IN" // Default for functions/procedures
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
