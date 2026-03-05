import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import prisma from "./config/database";

dotenv.config();

async function createAdminUser() {
  const email = "mg8751721@gmail.com";
  const password = "Admin@123456"; // You should change this!
  const firstName = "Admin";
  const lastName = "User";

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
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          filter: `email.eq.${email}`,
        });

        if (!listError && users && users.length > 0) {
          const supabaseUser = users[0];

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
    console.log(`   Password: ${password}`);
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