import bcrypt from "bcrypt";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const hash = bcrypt.hashSync("admin123", 10);
pool
  .query(
    "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
    ["admin@school-crm.com", hash, "Admin", "admin"],
  )
  .then((r) => {
    if (r.rowCount === 0) console.log("User already exists");
    else console.log("Admin user created successfully");
    pool.end();
  })
  .catch((e) => {
    console.error("Error:", e.message);
    pool.end();
  });
