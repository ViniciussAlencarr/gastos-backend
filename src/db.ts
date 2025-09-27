import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export async function connectDB() {
    if (!client) {
        client = new MongoClient(process.env.MONGODB_URI as string, {
            // força uso de TLS
            ssl: true,
        });
        await client.connect();
        db = client.db("gastos"); // aqui o nome do DB
        console.log("MongoDB conectado ✅");
    }
    return db;
}

export { db };
