const User = require("../models/User");

const seedAdminUser = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  const name = (process.env.ADMIN_NAME || "Hireperfect Admin").trim();

  if (!email || !password) {
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log(`Updated existing user to admin: ${email}`);
    }
    return;
  }

  await User.create({
    name,
    email,
    password,
    role: "admin",
  });

  console.log(`Seeded admin user: ${email}`);
};

module.exports = { seedAdminUser };
