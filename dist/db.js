"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.db = void 0;
exports.connectDB = connectDB;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new mongodb_1.MongoClient(process.env.MONGODB_URI);
exports.client = client;
let db;
async function connectDB() {
    await client.connect();
    exports.db = db = client.db(); // pega o banco definido na URI
    console.log("MongoDB conectado ✅");
    return db;
}
