"use strict";
const { v4: uuidv4 } = require("uuid");
const argon2 = require("argon2");

async function hashPassword(password) {
  try {
    return await argon2.hash(password);
  } catch (err) {
    console.error(`Error hashing password: ${err.message}`);
    throw new Error("Failed to hash password");
  }
}
const Categories = [
  {
    name: "Cryptocurrency",
    slug: "cryptocurrency",
    description: "Posts related to cryptocurrency and trading",
  },
];

const Tags = [
  {
    name: "Bitcoin",
    slug: "bitcoin",
  },
  {
    name: "Trading Strategies",
    slug: "trading-strategies",
  },
];

const Posts = [
  {
    title: "Understanding Bitcoin",
    slug: "understanding-bitcoin",
    description: "Exploring the fundamentals of Bitcoin",
    content: `Bitcoin is the first and most well-known cryptocurrency. It was created in 2009 by an unknown person or group of people using the pseudonym Satoshi Nakamoto. Bitcoin operates on a decentralized network called blockchain, which is a distributed ledger that records all transactions.

    One of the key features of Bitcoin is its limited supply. There will only ever be 21 million bitcoins in existence, making it a deflationary asset. This scarcity has contributed to its value over time.

    Bitcoin transactions are verified by network nodes through cryptography and recorded in a public ledger called a blockchain. This ensures transparency and security in the system.

    Despite its volatility, Bitcoin has gained mainstream adoption and has become a popular investment asset. Its price is influenced by various factors including market demand, adoption rates, regulatory developments, and macroeconomic trends.`,
    status: "PUBLISHED",
  },
  {
    title: "Effective Trading Strategies",
    slug: "effective-trading-strategies",
    description: "Strategies to succeed in crypto trading",
    content: `Cryptocurrency trading can be lucrative but also highly volatile. Here are some effective trading strategies to help you navigate the market:

    1. Research and Analysis: Before making any trades, thoroughly research the cryptocurrencies you're interested in. Analyze their technology, team, market trends, and community sentiment.

    2. Diversification: Don't put all your eggs in one basket. Diversify your investment across multiple cryptocurrencies to spread risk.

    3. Risk Management: Set stop-loss orders to limit potential losses and protect your capital. Only invest what you can afford to lose.

    4. Technical Analysis: Use technical analysis tools like candlestick charts, moving averages, and support/resistance levels to identify potential entry and exit points.

    5. Follow Trends: Stay updated on market trends and news that may impact cryptocurrency prices. Social media platforms and cryptocurrency forums can be valuable sources of information.

    6. HODLing: Consider a long-term investment strategy by holding onto cryptocurrencies with strong fundamentals despite short-term price fluctuations.

    Remember, there's no one-size-fits-all approach to trading. Experiment with different strategies and find what works best for you.`,
    status: "PUBLISHED",
  },
];

const Comments = [
  {
    content: "Great insights into Bitcoin!",
  },
  {
    content: "These trading strategies are really helpful.",
  },
];

const seedCategories = async (queryInterface) => {
  const existingCategories = await queryInterface.sequelize.query(
    "SELECT slug FROM category",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  const existingCategorySlugs = existingCategories.map((cat) => cat.slug);

  const newCategories = Categories.filter(
    (cat) => !existingCategorySlugs.includes(cat.slug)
  ).map((cat) => ({
    ...cat,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (newCategories.length > 0) {
    await queryInterface.bulkInsert("category", newCategories);
  }
};

const seedTags = async (queryInterface) => {
  const existingTags = await queryInterface.sequelize.query(
    "SELECT slug FROM tag",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  const existingTagSlugs = existingTags.map((tag) => tag.slug);

  const newTags = Tags.filter(
    (tag) => !existingTagSlugs.includes(tag.slug)
  ).map((tag) => ({
    ...tag,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (newTags.length > 0) {
    await queryInterface.bulkInsert("tag", newTags);
  }
};

const seedPosts = async (queryInterface) => {
  const [firstCategory] = await queryInterface.sequelize.query(
    "SELECT id FROM category LIMIT 1",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );

  let [firstUser] = await queryInterface.sequelize.query(
    "SELECT id FROM user LIMIT 1",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );

  if (!firstUser) {
    const newUserId = uuidv4();
    const newUser = {
      id: newUserId,
      email: "defaultuser@example.com",
      password: await hashPassword("12345678"),
      firstName: "Default",
      lastName: "User",
      status: "ACTIVE",
    };
    await queryInterface.bulkInsert("user", [newUser]);
    firstUser = newUser;
  }

  const [existingAuthor] = await queryInterface.sequelize.query(
    "SELECT id FROM author WHERE userId = :userId",
    {
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: { userId: firstUser.id },
    }
  );

  let authorId;
  if (existingAuthor) {
    authorId = existingAuthor.id;
  } else {
    authorId = uuidv4();
    const author = {
      id: authorId,
      userId: firstUser.id,
      status: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await queryInterface.bulkInsert("author", [author]);
  }

  if (!firstCategory || firstCategory.length === 0) {
    console.error(
      "No valid category found. Please ensure at least one category exists."
    );
    return;
  }

  const existingPosts = await queryInterface.sequelize.query(
    "SELECT slug FROM post",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  const existingPostSlugs = existingPosts.map((post) => post.slug);

  const newPosts = Posts.filter(
    (post) => !existingPostSlugs.includes(post.slug)
  ).map((post) => ({
    ...post,
    id: uuidv4(),
    categoryId: firstCategory.id,
    authorId: authorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (newPosts.length > 0) {
    await queryInterface.bulkInsert("post", newPosts);
  }

  const tagsMap = await queryInterface.sequelize.query(
    "SELECT slug, id FROM tag",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );

  const tagsDict = new Map(tagsMap.map((tag) => [tag.slug, tag.id]));

  const postTags = newPosts.flatMap((post) => {
    return Array.from(tagsDict).map(([slug, tagId]) => ({
      id: uuidv4(),
      postId: post.id,
      tagId: tagId,
    }));
  });

  if (postTags.length > 0) {
    await queryInterface.bulkInsert("post_tag", postTags);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await seedCategories(queryInterface);
    await seedTags(queryInterface);
    await seedPosts(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("category", null, {});
    await queryInterface.bulkDelete("tag", null, {});
    await queryInterface.bulkDelete("post", null, {});
    await queryInterface.bulkDelete("author", null, {});
    await queryInterface.bulkDelete("user", null, {});
  },
};
