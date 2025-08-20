// Migration to fix userBlock table issues
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('userBlock') || tables.includes('user_blocks')
    );

    // If old table exists, rename it to follow convention
    if (tableExists) {
      try {
        // First drop the existing foreign key constraints if they exist
        const foreignKeys = await queryInterface.getForeignKeysForTable('userBlock').catch(() => []);
        
        for (const fk of foreignKeys) {
          await queryInterface.removeConstraint('userBlock', fk.constraintName).catch(err => {
            console.log(`Could not remove constraint ${fk.constraintName}:`, err.message);
          });
        }

        // Drop indexes if they exist
        const indexes = await queryInterface.showIndex('userBlock').catch(() => []);
        
        for (const index of indexes) {
          if (index.name !== 'PRIMARY') {
            await queryInterface.removeIndex('userBlock', index.name).catch(err => {
              console.log(`Could not remove index ${index.name}:`, err.message);
            });
          }
        }

        // Rename the table
        await queryInterface.renameTable('userBlock', 'user_blocks').catch(err => {
          console.log('Table might already be renamed:', err.message);
        });
      } catch (error) {
        console.log('Error during migration:', error.message);
      }
    }

    // Ensure the table exists with correct structure
    const tableNowExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('user_blocks')
    );

    if (!tableNowExists) {
      await queryInterface.createTable('user_blocks', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        adminId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        isTemporary: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        duration: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        blockedUntil: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      // Add indexes
      await queryInterface.addIndex('user_blocks', ['userId'], {
        name: 'user_blocks_userId_idx',
      });
      
      await queryInterface.addIndex('user_blocks', ['adminId'], {
        name: 'user_blocks_adminId_idx',
      });
      
      await queryInterface.addIndex('user_blocks', ['isActive'], {
        name: 'user_blocks_isActive_idx',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert table name back to original if needed
    await queryInterface.renameTable('user_blocks', 'userBlock').catch(() => {});
  }
};