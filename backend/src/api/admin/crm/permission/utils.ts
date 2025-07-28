import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
const redis = RedisSingleton.getInstance();

// Function to cache the permissions
export async function cachePermissions() {
  try {
    const permissions = await getPermissions();
    await redis.set("permissions", JSON.stringify(permissions), "EX", 3600);
  } catch (error) {
    console.error("Redis error:", error);
  }
}

// Initialize the cache when the file is loaded
cachePermissions();

export async function getPermissions(): Promise<permissionAttributes[]> {
  return (
    await models.permission.findAll({
      include: [
        {
          model: models.role,
          as: "roles",
          through: { attributes: [] },
        },
      ],
    })
  ).map((permission) =>
    permission.get({ plain: true })
  ) as unknown as permissionAttributes[];
}
