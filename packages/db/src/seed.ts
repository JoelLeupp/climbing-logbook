import { db } from "./client.js";
import { hashPassword } from "./hashing.js";
import { users, climbingAreas, sectors, climbs, tags, climbTags } from "./schema.js";

async function seed() {
  const [demoUser] = await db
    .insert(users)
    .values({
      email: "demo@example.com",
      name: "Demo Climber",
      passwordHash: hashPassword("demo1234"),
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const user = demoUser ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "demo@example.com") }));
  if (!user) throw new Error("failed to create or find demo user");

  const [area] = await db
    .insert(climbingAreas)
    .values({
      name: "Magic Wood",
      description: "Legendary granite boulders in a Swiss forest valley.",
      howToGetThere: "Park in Bondo, ~20min walk into the forest.",
      personalRating: 5,
      latitude: 46.336,
      longitude: 9.578,
      createdBy: user.id,
    })
    .returning();

  const [sector] = await db
    .insert(sectors)
    .values({
      areaId: area.id,
      name: "Ticino Sector",
      description: "Dense cluster of classic boulders.",
      rating: 5,
      latitude: 46.337,
      longitude: 9.579,
      createdBy: user.id,
    })
    .returning();

  const [crimpy, sloper] = await db
    .insert(tags)
    .values([{ name: "crimpy" }, { name: "sloper" }])
    .onConflictDoNothing({ target: tags.name })
    .returning();

  const [climb] = await db
    .insert(climbs)
    .values({
      sectorId: sector.id,
      kind: "boulder",
      name: "Practice Boulder",
      difficulty: "V5",
      rating: 4,
      description: "Classic warm-up line.",
      createdBy: user.id,
    })
    .returning();

  if (crimpy) await db.insert(climbTags).values({ climbId: climb.id, tagId: crimpy.id }).onConflictDoNothing();
  if (sloper) await db.insert(climbTags).values({ climbId: climb.id, tagId: sloper.id }).onConflictDoNothing();

  console.log("Seeded demo data. Login with demo@example.com / demo1234");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
