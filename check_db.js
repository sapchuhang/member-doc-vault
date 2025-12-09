const sequelize = require('./config/database');
const Member = require('./models/Member');

async function check() {
    try {
        await sequelize.authenticate();
        const count = await Member.count();
        console.log(`Member count: ${count}`);
    } catch (error) {
        console.log('Error checking members:', error.message);
    }
}

check();
