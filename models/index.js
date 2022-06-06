import 'dotenv/config';

import { readdirSync, readFileSync } from 'fs';
import { createConnection } from 'mysql2';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url'
import { dirname , join, basename } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config = JSON.parse(readFileSync(`${__dirname}/../config/sequelizeConfig`));
const basename = basename(__filename);
const db = {};
let sequelize = {};
const OPERATIONAL_DB_NAME = process.env.OPERATIONAL_DB_NAME || 'operationaldb';
const OPERATIONAL_DB_PASSWORD = process.env.OPERATIONAL_DB_PASSWORD || '';

config.database = OPERATIONAL_DB_NAME;
config.password = OPERATIONAL_DB_PASSWORD;

const connection = createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: OPERATIONAL_DB_PASSWORD,
});
connection.query(`CREATE DATABASE IF NOT EXISTS \`${OPERATIONAL_DB_NAME}\`;`);

if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

readdirSync(__dirname)
    .filter((file) => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
    .forEach((file) => {
        const model = JSON.parse(readFileSync(join(__dirname, file)))(
            sequelize,
            Sequelize.DataTypes,
        );
        db[model.name] = model;
    });

Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
