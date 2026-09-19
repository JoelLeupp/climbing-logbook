import { db } from "./client.js";
import { hashPassword } from "./hashing.js";
import { users, groups, groupMemberships, climbingAreas, sectors, climbs, tags, climbTags } from "./schema.js";

// Fixed set of named test users for `POST /api/auth/dev-login` (Story 1.5, AD-10/AD-9) to pick
// from - all sharing one bootstrapped "Dev Group". Kept separate from `demoUser` above, which
// predates the group model and isn't part of this dev-login fixture set.
// Alphabet-conformant with auth.ts's INVITE_CODE_ALPHABET (excludes 0/O/1/I/L) even though this
// one is hardcoded rather than generated, for the same hand-typed-code reason.
const DEV_GROUP_INVITE_CODE = "DEVGRPXY";
const DEV_TEST_USERS = [
  { email: "alice@dev.local", name: "Alice Dev" },
  { email: "bob@dev.local", name: "Bob Dev" },
];

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

  const [devGroup] = await db
    .insert(groups)
    .values({ name: "Dev Group", inviteCode: DEV_GROUP_INVITE_CODE })
    .onConflictDoNothing({ target: groups.inviteCode })
    .returning();

  const devGroupRow =
    devGroup ?? (await db.query.groups.findFirst({ where: (g, { eq }) => eq(g.inviteCode, DEV_GROUP_INVITE_CODE) }));
  if (!devGroupRow) throw new Error("failed to create or find dev group");

  for (const testUser of DEV_TEST_USERS) {
    const [insertedTestUser] = await db
      .insert(users)
      .values({
        email: testUser.email,
        name: testUser.name,
        passwordHash: hashPassword("devpass123"),
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    const testUserRow =
      insertedTestUser ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, testUser.email) }));
    if (!testUserRow) throw new Error(`failed to create or find test user ${testUser.email}`);

    await db
      .insert(groupMemberships)
      .values({ userId: testUserRow.id, groupId: devGroupRow.id })
      .onConflictDoNothing();
  }

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
  console.log("Seeded Dev Group test users (dev-login): alice@dev.local / bob@dev.local, password devpass123");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
