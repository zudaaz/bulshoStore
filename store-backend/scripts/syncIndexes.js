require("dotenv").config();

const connectDB = require("../config/db");
const { closeDB } = require("../db/pool");
const { getRegisteredModels } = require("../db/modelFactory");
require("../db/models");

async function verifySchema() {
  try {
    await connectDB();
    for (const model of Object.values(getRegisteredModels())) {
      await model.syncIndexes();
      console.log(`${model.modelName}: Supabase table verified`);
    }
    console.log("Supabase schema verification completed.");
  } catch (error) {
    console.error(`Supabase schema verification failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDB().catch(() => undefined);
  }
}

verifySchema();
