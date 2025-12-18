const sequelize = require('./config/database');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');
        
        // Drop the backup table if it exists (it causes sync issues)
        await sequelize.query('DROP TABLE IF EXISTS `Members_backup`');
        console.log('Dropped Members_backup table.');
        
        await sequelize.close();
        console.log('Done.');
    } catch (error) {
        console.error('Error fixing database:', error);
    }
}

fix();
