const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Members',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    docType: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: [['photo', 'citizenship_front', 'citizenship_back', 'nid', 'pan', 'other']]
        }
    }
}, {
    timestamps: true
});

module.exports = Document;
