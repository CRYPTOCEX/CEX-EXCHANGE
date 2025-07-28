'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add pageSource column
    await queryInterface.addColumn('defaultPages', 'pageSource', {
      type: Sequelize.ENUM('default', 'builder'),
      allowNull: false,
      defaultValue: 'default',
      comment: 'Source type: default for regular pages, builder for builder-created pages'
    });

    // Update existing records to have 'default' as pageSource
    await queryInterface.sequelize.query(
      `UPDATE defaultPages SET pageSource = 'default' WHERE pageSource IS NULL`
    );

    // Remove the old unique constraint on pageId only
    await queryInterface.removeIndex('defaultPages', 'pageId');

    // Add new unique constraint on pageId + pageSource
    await queryInterface.addIndex('defaultPages', {
      fields: ['pageId', 'pageSource'],
      unique: true,
      name: 'unique_page_source'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique constraint
    await queryInterface.removeIndex('defaultPages', 'unique_page_source');

    // Add back the old unique constraint on pageId only
    await queryInterface.addIndex('defaultPages', {
      fields: ['pageId'],
      unique: true
    });

    // Remove pageSource column
    await queryInterface.removeColumn('defaultPages', 'pageSource');
  }
}; 