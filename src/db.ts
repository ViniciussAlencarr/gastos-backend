import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI!);
let db: Db;

export async function connectDB() {
    await client.connect();
    db = client.db(); // pega o banco definido na URI
    console.log("MongoDB conectado ✅");
    return db;
}

export { db, client };
