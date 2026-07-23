import fetch from "node-fetch";
const email = "aabad346@piat.edu.ph";
const password = "password";
const base = "http://localhost:4000";

async function main() {
  try {
    const r1 = await fetch(`${base}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const u1 = await r1.text();
    console.log("USERS login status", r1.status, u1);
  } catch (err) {
    console.error("users login err", err);
  }
  try {
    const r2 = await fetch(`${base}/api/students/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const u2 = await r2.text();
    console.log("STUDENTS login status", r2.status, u2);
  } catch (err) {
    console.error("students login err", err);
  }
}
main();
