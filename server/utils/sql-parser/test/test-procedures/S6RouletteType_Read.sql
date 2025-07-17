
CREATE PROCEDURE [dbo].[S6RouletteType_Read]
@Reference BIGINT,
@PlayMode CHAR(1),
@LobbyName VARCHAR(50) = 'Master'
AS

SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED
SET NOCOUNT ON;

DECLARE @Types TABLE
(
	[Type]	INT,
	MinBet	INT,
	MaxBet	INT
)

IF (@PlayMode = 'T') -- TOURNAMENT
BEGIN
	INSERT INTO @Types 
	SELECT
		Game,
		MinBet,
		MaxBet
	FROM
		Tournament 
	WHERE
		Tournament = @Reference
END
ELSE IF (@PlayMode = 'B') -- CASINO BONUS 
BEGIN
	IF EXISTS (SELECT 1 FROM Bonus_Game_Type WHERE Template = @Reference)
	BEGIN
		INSERT INTO @Types
		SELECT
			Game,
			NULL,
			NULL
		FROM
			Bonus_Game_Type 
		WHERE
			Template = @Reference
		AND
			GameType = 3
	END
	ELSE
	BEGIN
		INSERT INTO @Types
		SELECT
			Game,
			MinBet,
			MaxBet
		FROM
			Bonus_Type 
		WHERE
			GameType = 3
		AND
			Active = 1
	END
END
ELSE
BEGIN
	INSERT INTO @Types
	SELECT
		Game,
		MinBet,
		MaxBet
	FROM
		Profile_Type 
	WHERE
		[Profile] = @Reference
	AND
		GameType = 3
	AND	
		Active = 1

	INSERT INTO
		@Types ([Type], MinBet, MaxBet)
	SELECT 
		[Type] AS Game,
		MinBet,
		MaxBet
	FROM
		Roulette_Type
	WHERE
		Active = 1 AND [Type] NOT IN (SELECT Game FROM Profile_Type  WHERE [Profile] = @Reference AND GameType = 3 AND Active = 1)

	--hide when the game type = 3 and the hidegame matches the types that should be available, and insert the ones that needs to be added (but not on profile)
	/*
	MERGE @Types AS t
	USING
	(
	Select	*
	From	vw_ScheduleTypes 
	Where	GameType = 3
	)As s
	ON		t.[Type] = s.HideGame
	WHEN MATCHED
	THEN UPDATE
	SET	t.[Type] = s.Game
	WHEN NOT MATCHED
	THEN INSERT ([Type])
	VALUES (s.Game); */
END

SELECT
	r.[Type],
	r.[GameType],
	ISNULL(t.MinBet, r.MinBet) / CAST(100 AS FLOAT) As MinBet,
	ISNULL(t.MaxBet, r.MaxBet) / CAST(100 AS FLOAT) As MaxBet,
	r.Nature,
	--lobby stuff 
	l.GameLobbyName,
	l.[ImagePath],
	l.Orientation,
	l.DeviceType,
	l.Theme,
	REPLACE (REPLACE (ISNULL(l.[Description], ''), '[min]', ISNULL(t.MinBet, r.MinBet) / CAST(100 AS FLOAT)), '[max]', ISNULL(t.MaxBet, r.MaxBet) / CAST(100 AS FLOAT)) As [Description],
	l.[Url]
FROM
	@Types AS t	 
LEFT JOIN
	S6LobbyGame AS l
ON
	l.GameId = t.[Type]
LEFT JOIN
	Roulette_Type As r
ON
	t.[Type] = r.[Type]
WHERE
	l.IsVisible = 1 AND l.GameTypeId = 3 AND LobbyName = @LobbyName
ORDER BY 
	ISNULL(l.DisplayOrder, 999) ASC, l.[LobbyName] ASC

--display types 
--Select	r.[Type],
--r.[GameType],
--ISNULL(t.MinBet, r.MinBet) / CAST(100 AS FLOAT) As MinBet,
--ISNULL(t.MaxBet, r.MaxBet) / CAST(100 AS FLOAT) As MaxBet,
--r.Nature,
----lobby stuff 
--l.Name,
--l.[Image],
--l.Icon,
--l.PageContent,
--l.Orientation,
--l.DeviceType,
--l.Theme,
--l.NewIcon,
--l.ExcludeOnList,
--REPLACE
--(
--REPLACE
--(
--	ISNULL(l.[Description], ''),
--	'[min]',
--	ISNULL(t.MinBet, r.MinBet) / CAST(100 AS FLOAT)
--),
--'[max]',
--ISNULL(t.MaxBet, r.MaxBet) / CAST(100 AS FLOAT)
--) As [Description],
--l.Url,
--l.Position,
--l.ImagePath

--From	@Types As t
--INNER JOIN Roulette_Type As r 
--ON		r.[Type] = t.[Type]
--INNER JOIN Lobby_Type as l With(NoLock)
--On		l.GameType = r.GameType
--AND	l.Game = r.[Type]
--Where	l.Active = 1

--payouts 
SELECT
	p.Payout,
	p.[Name],
	p.Nature,
	p.Amount,
	p.ToBase,
	t.[Type]
FROM
	RL_Payout AS p
INNER JOIN
	Roulette_Type AS t
ON
	(p.Nature = t.Nature OR	p.Nature = 'B')
INNER JOIN
	@Types AS r
ON
	r.[Type] = t.[Type]

--payouts numbers 
SELECT
	p.Payout,
	p.Number,
	n.[Label]
FROM
	RL_Payout_Number AS p
INNER JOIN
	RL_Number AS n
ON
	p.Number = n.Number

