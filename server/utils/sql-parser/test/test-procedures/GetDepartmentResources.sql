CREATE PROCEDURE [dbo].[GetDepartmentResources]
(
	@Reference	BIGINT,
	@Mode		CHAR(1)
)
AS
BEGIN

	DECLARE @Resources TABLE
		(
			[ResourceId]	INT,
			MinQuantity		INT,
			MaxQuantity		INT
		)

	IF (@Mode = 'P') -- PROJECT
	BEGIN

		INSERT INTO @Resources 
		Select	ResourceId,
				MinQuantity,
				MaxQuantity
		From	ProjectResources With (NoLock)
		Where	ProjectId = @Reference

	END
	ELSE IF (@Mode = 'T') -- TRAINING
	BEGIN

		IF EXISTS
			(
				Select	1
				From	TrainingResourceConfig With(NoLock)
				Where	TemplateId = @Reference
			)
			INSERT INTO @Resources
			Select	ResourceId,
					null,
					null
			From	TrainingResourceConfig With (NoLock)
			Where	TemplateId = @Reference
				AND	CategoryId = 3

		ELSE
			INSERT INTO @Resources
			Select	ResourceId,
					MinQuantity,
					MaxQuantity
			From	TrainingDefaults With (NoLock)
			Where	CategoryId = 3
				AND	IsActive = 1

	END
	ELSE
	BEGIN

		INSERT INTO @Resources
		Select	ResourceId,
				MinQuantity,
				MaxQuantity
		From	DepartmentResources With (NoLock)
		Where	DepartmentId = @Reference
			AND	CategoryId = 3
			AND	IsActive = 1

		-- Update resources based on schedule configuration
		MERGE @Resources AS target
		USING
			(
				Select	*
				From	vw_ScheduledResources 
				Where	CategoryId = 3
			) As source
		ON		target.[ResourceId] = source.HideResourceId
		WHEN MATCHED
		THEN UPDATE
			SET	target.[ResourceId] = source.ResourceId
		WHEN NOT MATCHED
		THEN INSERT ([ResourceId])
			VALUES (source.ResourceId)

		;

	END

	-- Return available resources with details
	Select	res.[ResourceId],
			res.[CategoryId],
			ISNULL(t.MinQuantity, res.MinQuantity) / CAST(100 AS FLOAT) As MinQuantity,
			ISNULL(t.MaxQuantity, res.MaxQuantity) / CAST(100 AS FLOAT) As MaxQuantity,
			res.ResourceType,
			-- Display information
			display.Name,
			display.[ImageUrl],
			display.IconUrl,
			display.PageContent,
			REPLACE
				(
					REPLACE
						(
							ISNULL(display.[Description], ''),
							'[min]',
							ISNULL(t.MinQuantity, res.MinQuantity) / CAST(100 AS FLOAT)
						),
					'[max]',
					ISNULL(t.MaxQuantity, res.MaxQuantity) / CAST(100 AS FLOAT)
				) As [Description],
			display.Url,
            display.Position,
			display.ImagePath

	From	@Resources As t
		INNER JOIN ResourceDefinition As res With (NoLock)
			ON		res.[ResourceId] = t.[ResourceId]
		INNER JOIN DisplayConfiguration as display With(NoLock)
		On		display.CategoryId = res.CategoryId
			AND	display.ItemId = res.[ResourceId]
	Where	display.IsActive = 1

	-- Return allocation information
	Select	alloc.AllocationId,
			alloc.[Name],
			alloc.AllocationType,
			alloc.Amount,
			alloc.ToBase,
			t.[ResourceId]

	From	AllocationConfiguration As alloc With(NoLock)
		INNER JOIN ResourceDefinition As res With(NoLock)
			On	(
						alloc.AllocationType = res.ResourceType 
					Or	alloc.AllocationType = 'B'
				)
		INNER JOIN @Resources As t
			ON t.[ResourceId] = res.[ResourceId]

	-- Return allocation number mappings
	Select	alloc.AllocationId,
			alloc.NumberValue,
			numbers.Label
	From	AllocationNumberMapping As alloc With(NoLock)
		INNER JOIN NumberDefinitions As numbers With(NoLock)
			On alloc.NumberValue = numbers.NumberValue

END 