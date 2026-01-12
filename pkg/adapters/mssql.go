package adapters

import (
	"fmt"
	"log"
	"time"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/procedure"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

type MSSQLAdapter struct {
	config ConnectionConfig
	db     *gorm.DB
}

func (a *MSSQLAdapter) connect() (*gorm.DB, error) {
	if a.db != nil {
		return a.db, nil
	}
	dsn := a.buildDSN()
	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	a.db = db
	return db, nil
}

func (a *MSSQLAdapter) buildDSN() string {
	host := "localhost"
	if a.config.Host != nil {
		host = *a.config.Host
	}
	port := 1433
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
	return fmt.Sprintf("sqlserver://%s:%s@%s:%d?database=%s", user, password, host, port, dbname)
}

func (a *MSSQLAdapter) ListDatabases() ([]string, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}
	var databases []string
	err = db.Raw("SELECT name FROM sys.databases WHERE database_id > 4").Pluck("name", &databases).Error
	return databases, err
}

func (a *MSSQLAdapter) GetSchema(database string) (*cache.SchemaInfo, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}

	schema := &cache.SchemaInfo{}

	// Get tables
	tableQuery := `
		SELECT 
			t.name as table_name,
			s.name as schema_name
		FROM sys.tables t
		JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE t.type = 'U'
		ORDER BY s.name, t.name
	`
	tableRows, err := db.Raw(tableQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer tableRows.Close()

	// Get all columns for all tables
	allColumnsQuery := `
		SELECT 
			s.name as schema_name,
			t.name as table_name,
			c.name,
			ty.name as data_type,
			c.is_nullable,
			c.max_length,
			c.precision,
			c.scale,
			CASE WHEN EXISTS (
				SELECT 1 FROM sys.index_columns ic
				JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
				WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id AND i.is_primary_key = 1
			) THEN 1 ELSE 0 END as is_primary,
			CASE WHEN EXISTS (
				SELECT 1 FROM sys.index_columns ic
				JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
				WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id AND i.is_unique = 1 AND i.is_primary_key = 0
			) THEN 1 ELSE 0 END as is_unique,
			CASE WHEN EXISTS (
				SELECT 1 FROM sys.foreign_key_columns fkc
				WHERE fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
			) THEN 1 ELSE 0 END as is_foreign,
			c.default_object_id
		FROM sys.columns c
		JOIN sys.types ty ON c.user_type_id = ty.user_type_id
		JOIN sys.tables t ON c.object_id = t.object_id
		JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE t.type = 'U'
		ORDER BY s.name, t.name, c.column_id
	`
	allColumnsRows, err := db.Raw(allColumnsQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer allColumnsRows.Close()

	columnsMap := make(map[string][]cache.ColumnInfo)
	for allColumnsRows.Next() {
		var schemaName, tableName string
		var col cache.ColumnInfo
		var maxLength, precision, scale *int
		var isPrimary, isUnique, isForeign bool
		var defaultObjID int
		err := allColumnsRows.Scan(&schemaName, &tableName, &col.Name, &col.Type, &col.Nullable, &maxLength, &precision, &scale, &isPrimary, &isUnique, &isForeign, &defaultObjID)
		if err != nil {
			continue
		}
		col.MaxLength = maxLength
		col.Precision = precision
		col.Scale = scale
		col.Primary = isPrimary
		col.Unique = isUnique
		col.Foreign = isForeign
		if defaultObjID != 0 {
			// Get default value
			var defaultValue string
			db.Raw("SELECT definition FROM sys.default_constraints WHERE object_id = ?", defaultObjID).Scan(&defaultValue)
			col.DefaultValue = &defaultValue
		}
		key := schemaName + "." + tableName
		columnsMap[key] = append(columnsMap[key], col)
	}
	allColumnsRows.Close()

	// Get all foreign keys
	allFkQuery := `
		SELECT 
			s.name as schema_name,
			t.name as table_name,
			fk.name as fk_name,
			rs.name as referenced_schema,
			rt.name as referenced_table,
			pc.name as parent_column,
			rc.name as referenced_column
		FROM sys.foreign_keys fk
		JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
		JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
		JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
		JOIN sys.columns pc ON fkc.parent_object_id = pc.object_id AND fkc.parent_column_id = pc.column_id
		JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
		JOIN sys.tables t ON fk.parent_object_id = t.object_id
		JOIN sys.schemas s ON t.schema_id = s.schema_id
		WHERE t.type = 'U'
		ORDER BY s.name, t.name, fk.name, fkc.constraint_column_id
	`
	allFkRows, err := db.Raw(allFkQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer allFkRows.Close()

	fkMap := make(map[string]map[string]*cache.ForeignKeyInfo)
	for allFkRows.Next() {
		var schemaName, tableName, fkName, refSchema, refTable, parentCol, refCol string
		err := allFkRows.Scan(&schemaName, &tableName, &fkName, &refSchema, &refTable, &parentCol, &refCol)
		if err != nil {
			continue
		}
		key := schemaName + "." + tableName
		if fkMap[key] == nil {
			fkMap[key] = make(map[string]*cache.ForeignKeyInfo)
		}
		if _, ok := fkMap[key][fkName]; !ok {
			fkMap[key][fkName] = &cache.ForeignKeyInfo{
				Columns:           []string{},
				ReferencedTable:   refTable,
				ReferencedColumns: []string{},
			}
		}
		fkMap[key][fkName].Columns = append(fkMap[key][fkName].Columns, parentCol)
		fkMap[key][fkName].ReferencedColumns = append(fkMap[key][fkName].ReferencedColumns, refCol)
	}
	allFkRows.Close()

	for tableRows.Next() {
		var tableName, schemaName string
		err := tableRows.Scan(&tableName, &schemaName)
		if err != nil {
			continue
		}

		table := cache.TableInfo{
			Name:   tableName,
			Schema: schemaName,
		}

		key := schemaName + "." + tableName
		table.Columns = columnsMap[key]

		var primaryKeys []string
		for _, col := range table.Columns {
			if col.Primary {
				primaryKeys = append(primaryKeys, col.Name)
			}
		}
		table.PrimaryKey = primaryKeys

		if tableFks, ok := fkMap[key]; ok {
			for _, fk := range tableFks {
				table.ForeignKeys = append(table.ForeignKeys, *fk)
			}
		}

		schema.Tables = append(schema.Tables, table)
	}
	tableRows.Close()

	// Get views
	viewQuery := `
		SELECT 
			v.name as view_name,
			s.name as schema_name,
			m.definition
		FROM sys.views v
		JOIN sys.schemas s ON v.schema_id = s.schema_id
		LEFT JOIN sys.sql_modules m ON v.object_id = m.object_id
		ORDER BY s.name, v.name
	`
	viewRows, err := db.Raw(viewQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer viewRows.Close()

	// Get all view columns
	allViewColumnsQuery := `
		SELECT 
			s.name as schema_name,
			v.name as view_name,
			c.name,
			ty.name as data_type,
			c.is_nullable,
			c.max_length,
			c.precision,
			c.scale
		FROM sys.columns c
		JOIN sys.types ty ON c.user_type_id = ty.user_type_id
		JOIN sys.views v ON c.object_id = v.object_id
		JOIN sys.schemas s ON v.schema_id = s.schema_id
		ORDER BY s.name, v.name, c.column_id
	`
	allViewColumnsRows, err := db.Raw(allViewColumnsQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer allViewColumnsRows.Close()

	viewColumnsMap := make(map[string][]cache.ColumnInfo)
	for allViewColumnsRows.Next() {
		var schemaName, viewName string
		var col cache.ColumnInfo
		var maxLength, precision, scale *int
		err := allViewColumnsRows.Scan(&schemaName, &viewName, &col.Name, &col.Type, &col.Nullable, &maxLength, &precision, &scale)
		if err != nil {
			continue
		}
		col.MaxLength = maxLength
		col.Precision = precision
		col.Scale = scale
		key := schemaName + "." + viewName
		viewColumnsMap[key] = append(viewColumnsMap[key], col)
	}
	allViewColumnsRows.Close()

	for viewRows.Next() {
		var viewName, schemaName string
		var definition *string
		err := viewRows.Scan(&viewName, &schemaName, &definition)
		if err != nil {
			continue
		}

		view := cache.ViewInfo{
			Name:       viewName,
			Schema:     schemaName,
			Definition: definition,
		}

		key := schemaName + "." + viewName
		view.Columns = viewColumnsMap[key]

		schema.Views = append(schema.Views, view)
	}
	viewRows.Close()

	// Get stored procedures
	procQuery := `
		SELECT 
			p.name as proc_name,
			s.name as schema_name
		FROM sys.procedures p
		JOIN sys.schemas s ON p.schema_id = s.schema_id
		ORDER BY s.name, p.name
	`
	procRows, err := db.Raw(procQuery).Rows()
	if err != nil {
		return nil, err
	}
	defer procRows.Close()

	for procRows.Next() {
		var procName, schemaName string
		err := procRows.Scan(&procName, &schemaName)
		if err != nil {
			continue
		}

		proc := cache.StoredProcedureInfo{
			Name:       procName,
			Schema:     schemaName,
			Parameters: []cache.ParameterInfo{},
			ResultSets: []cache.ResultSetInfo{},
		}

		schema.StoredProcedures = append(schema.StoredProcedures, proc)
	}
	procRows.Close()

	return schema, nil
}

func (a *MSSQLAdapter) ExecuteQuery(query string, database string) ([]map[string]interface{}, error) {
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

func (a *MSSQLAdapter) GetTableData(database, schema, tableName string, options map[string]interface{}) (*cache.TableDataResponse, error) {
	page := 1
	if p, ok := options["page"].(int); ok {
		page = p
	}
	limit := 100
	if l, ok := options["limit"].(int); ok {
		limit = l
	}
	offset := page * limit
	query := fmt.Sprintf("SELECT * FROM %s.%s ORDER BY (SELECT NULL) OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", schema, tableName, offset, limit)
	log.Printf("Executing query: %s", query)
	results, err := a.ExecuteQuery(query, database)
	if err != nil {
		return nil, err
	}
	countQuery := fmt.Sprintf("SELECT COUNT(*) as total FROM %s.%s", schema, tableName)
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

func (a *MSSQLAdapter) GetProcedureDetails(database, schema, name string) (*cache.StoredProcedureInfo, error) {
	db, err := a.connect()
	if err != nil {
		return nil, err
	}

	// Get procedure definition
	var definition *string
	query := `
		SELECT m.definition
		FROM sys.sql_modules m
		INNER JOIN sys.objects o ON m.object_id = o.object_id
		WHERE o.type = 'P' AND o.name = ? AND SCHEMA_NAME(o.schema_id) = ?
	`
	err = db.Raw(query, name, schema).Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	if definition == nil {
		return &cache.StoredProcedureInfo{
			Name:       name,
			Schema:     schema,
			Definition: nil,
			Parameters: []cache.ParameterInfo{},
			ResultSets: []cache.ResultSetInfo{},
			Cached:     false,
			LastCached: "",
		}, nil
	}

	// Get parameters
	var parameters []cache.ParameterInfo
	paramQuery := `
		SELECT 
			p.name as Name,
			t.name as Type,
			p.is_nullable as IsNullable,
			p.max_length as MaxLength,
			p.precision as Precision,
			p.scale as Scale,
			p.default_value as DefaultValue
		FROM sys.parameters p
		INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
		INNER JOIN sys.objects o ON p.object_id = o.object_id
		WHERE o.type = 'P' AND o.name = ? AND SCHEMA_NAME(o.schema_id) = ?
		ORDER BY p.parameter_id
	`
	rows, err := db.Raw(paramQuery, name, schema).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var param cache.ParameterInfo
		var maxLength, precision, scale *int
		var defaultValue *string
		err := rows.Scan(&param.Name, &param.Type, &param.IsNullable, &maxLength, &precision, &scale, &defaultValue)
		if err != nil {
			continue
		}
		param.MaxLength = maxLength
		param.Precision = precision
		param.Scale = scale
		param.DefaultValue = defaultValue
		param.Mode = "IN" // Default for stored procedures
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
