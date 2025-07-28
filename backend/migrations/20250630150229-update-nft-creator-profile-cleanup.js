'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add profilePublic column
    await queryInterface.addColumn('nft_creator', 'profilePublic', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Remove social link columns that are no longer needed
    const columnsToRemove = ['avatar', 'website', 'twitter', 'discord', 'instagram'];
    
    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('nft_creator', column);
      } catch (error) {
        // Column might not exist, continue
        console.log(`Column ${column} does not exist, skipping...`);
      }
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove profilePublic column
    await queryInterface.removeColumn('nft_creator', 'profilePublic');

    // Add back social link columns
    await queryInterface.addColumn('nft_creator', 'avatar', {
      type: Sequelize.STRING(1000),
      allowNull: true,
    });

    await queryInterface.addColumn('nft_creator', 'website', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn('nft_creator', 'twitter', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn('nft_creator', 'discord', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn('nft_creator', 'instagram', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  }
};
