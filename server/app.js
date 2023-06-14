const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
    const query = `
        SELECT p.id,
               p.name,
               p.username,
               p.country,
               p.age,
               p.game,
               p.level,
               p.is_professional                                                                AS "isProfessional",
               json_build_object('team', p.team, 'earnings', p.earnings)                        AS professional,
               json_agg(json_build_object('id', ps.id, 'platform', ps.platform, 'url', ps.url)) AS social
        FROM players p
                 LEFT JOIN player_social ps ON p.id = ps.player_id
        GROUP BY p.id
        ORDER BY p.id;
    `;

    try {
        const selectQuery = await db.query(query);
        res.json(selectQuery.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "An error occurred while getting players",
        });
    }
});

app.post("/", async (req, res) => {
    const {
        name,
        username,
        country,
        age,
        game,
        level,
        isProfessional,
        professional,
        social,
    } = req.body;
    try {
        const playerQuery = await db.query(
            `
                INSERT INTO players (name, username, country, age, game, level, is_professional, team, earnings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
                name,
                username,
                country,
                age,
                game,
                level,
                isProfessional,
                isProfessional ? professional.team : null,
                isProfessional ? professional.earnings : null,
            ],
        );
        const id = playerQuery.rows[0].id;
        if (social) {
            social.forEach(async s => {
                await db.query(
                    `
                        INSERT INTO player_social (player_id, platform, url)
                        VALUES ($1, $2, $3)`,
                    [id, s.platform, s.url],
                );
            });
        }
        res.json(id);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "An error occurred while posting player",
        });
    }
});

app.put("/", async (req, res) => {
    const {
        id,
        name,
        username,
        country,
        age,
        game,
        level,
        isProfessional,
        professional,
        social,
    } = req.body;
    try {
        await db.query(
            `
                UPDATE players
                SET name            = $1,
                    username        = $2,
                    country         = $3,
                    age             = $4,
                    game            = $5,
                    level           = $6,
                    is_professional = $7,
                    team            = $8,
                    earnings        = $9
                WHERE id = $10`,
            [
                name,
                username,
                country,
                age,
                game,
                level,
                isProfessional,
                isProfessional ? professional.team : null,
                isProfessional ? professional.earnings : null,
                id,
            ],
        );
        if (social) {
            social.forEach(async s => {
                await db.query(
                    `
                        UPDATE player_social
                        SET platform = $1,
                            url = $2
                        WHERE player_id = $3`,
                    [s.platform, s.url, id],
                );
            });
        }
        res.json("ok");
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "An error occurred while posting player",
        });
    }
});

app.listen(port, () => {
    console.log(`Server is started on port ${port}`);
});