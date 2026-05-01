import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import prisma from "./config/database";

dotenv.config();

async function createAdminUser() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const firstName = process.env.ADMIN_SEED_FIRST_NAME || "Admin";
  const lastName = process.env.ADMIN_SEED_LAST_NAME || "User";

  if (!email || !password) {
    console.error("❌ ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env");
    process.exit(1);
  }

  console.log("🔧 Creating admin account...");
  console.log(`   Email: ${email}`);

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log("⚠️  User already exists. Updating to admin role...");

      // Update existing user to admin
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { role: "admin" },
      });

      console.log("✅ User updated to admin role!");
      console.log("\n📝 Login credentials:");
      console.log(`   Email: ${email}`);
      console.log(`   Password: [Use your existing password]`);

      process.exit(0);
    }

    // Step 2: Create user in Supabase Auth
    console.log("   Creating Supabase auth user...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      // Check if user exists in Supabase but not in our DB
      if (authError.message?.includes("already been registered")) {
        console.log("⚠️  User exists in Supabase. Syncing with database...");

        // Get the user from Supabase
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const matchedUser = !listError && users ? users.find((u) => u.email === email.toLowerCase()) : null;

        if (matchedUser) {
          const supabaseUser = matchedUser;

          // Create user in our database
          const user = await prisma.user.create({
            data: {
              supabaseId: supabaseUser.id,
              email: email.toLowerCase(),
              firstName,
              lastName,
              emailVerified: true,
              role: "admin", // Set as admin directly
            },
          });

          console.log("✅ Admin account synced successfully!");
          console.log("\n📝 Login credentials:");
          console.log(`   Email: ${email}`);
          console.log(`   Password: [Use your existing Supabase password]`);

          process.exit(0);
        }
      }

      throw new Error(`Supabase auth error: ${authError.message}`);
    }

    if (!authData?.user) {
      throw new Error("Failed to create user in Supabase");
    }

    // Step 3: Create user in our database with admin role
    console.log("   Creating database user with admin role...");
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: email.toLowerCase(),
        firstName,
        lastName,
        emailVerified: true,
        role: "admin", // Set as admin directly
      },
    });

    console.log("✅ Admin account created successfully!");
    console.log("\n📝 Login credentials:");
    console.log(`   Email: ${email}`);
    console.log("   Password: [SAVE THIS — it will not be displayed again]");
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    console.log("\n🚀 You can now login at: http://localhost:3000/login");

  } catch (error) {
    console.error("❌ Error creating admin account:", error);

    // Try to clean up if partial creation
    try {
      await prisma.user.delete({
        where: { email: email.toLowerCase() },
      }).catch(() => {});
    } catch {}

    process.exit(1);
  }

  process.exit(0);
}

// Run the script
createAdminUser().catch(console.error);