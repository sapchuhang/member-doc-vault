const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const AdminSettings = sequelize.define('AdminSettings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    securityQuestion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    securityAnswer: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (admin) => {
            if (admin.password) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(admin.password, salt);
            }
            if (admin.securityAnswer) {
                const salt = await bcrypt.genSalt(10);
                admin.securityAnswer = await bcrypt.hash(admin.securityAnswer.toLowerCase(), salt);
            }
        },
        beforeUpdate: async (admin) => {
            if (admin.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(admin.password, salt);
            }
            if (admin.changed('securityAnswer')) {
                const salt = await bcrypt.genSalt(10);
                admin.securityAnswer = await bcrypt.hash(admin.securityAnswer.toLowerCase(), salt);
            }
        }
    }
});

AdminSettings.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

AdminSettings.prototype.compareSecurityAnswer = async function (candidateAnswer) {
    return await bcrypt.compare(candidateAnswer.toLowerCase(), this.securityAnswer);
};

module.exports = AdminSettings;
