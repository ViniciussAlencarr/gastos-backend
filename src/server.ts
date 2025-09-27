import Fastify from "fastify";
import fastifyJwt from '@fastify/jwt';
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { connectDB, db } from "./db";

import { Gasto, Usuario } from "./types/global";
import { ObjectId } from "mongodb";

dotenv.config();
const fastify = Fastify({ logger: true });


async function main() {
    await connectDB();

    const USUARIOS = db.collection('usuarios');
    const GASTOS = db.collection('gastos');
    const SALARIO = db.collection('salario');

    await fastify.register(cors, {
        origin: "*", // permite qualquer origem (só pra desenvolvimento)
        methods: ["GET", "POST", "PUT", "DELETE"]
    });

    await fastify.register(fastifyJwt, { secret: process.env.FASTIFY_JWT_SECRET as string });

    // Login
    fastify.post('/register', async (req, reply) => {
        const { name, email, password } = req.body as any;
        const existing = await USUARIOS.findOne({ email });
        if (existing) return reply.status(400).send({ error: 'Email já cadastrado' });

        const res = await USUARIOS.insertOne({ name, email, password }); // senha plain para exemplo
        const token = fastify.jwt.sign({ id: res.insertedId.toString() });
        return { token, name };
    });

    fastify.post('/login', async (req, reply) => {
        const { email, password } = req.body as any;
        const user = await USUARIOS.findOne({ email }) as unknown as Usuario;
        if (!user || user.password !== password) return reply.status(401).send({ error: 'Credenciais inválidas' });
        const token = fastify.jwt.sign({ id: user._id.toString() });
        return { token, nome: user.name };
    });

    fastify.decorate('authenticate', async (req: any, reply: any) => {
        try {
            await req.jwtVerify();
        } catch {
            reply.status(401).send({ error: 'Não autorizado' });
        }
    });

    fastify.register(async (fastify) => {
        fastify.addHook('preHandler', (fastify as any).authenticate);

        // Rota teste
        fastify.get("/", async () => {
            return { status: "API de gastos funcionando 🚀" };
        });

        // Criar gasto
        fastify.post<{ Body: Gasto }>("/gastos", async (request, reply) => {
            const bodyData = request.body;
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            const dataGasto: Gasto = {
                ...bodyData,
                userId,
                date: new Date() // <- importante
            };

            const result = await GASTOS.insertOne(dataGasto);
            return { _id: result.insertedId, ...dataGasto };
        });

        // Listar gastos
        fastify.get("/gastos", async (request, reply) => {
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            const gastos = await GASTOS.find({ userId }).toArray();
            return gastos.map(g => ({ ...g, _id: g._id.toString() }));
        });

        // Remover gasto
        fastify.delete<{ Params: { id: string } }>("/gastos/:id", async (request) => {
            const { id } = request.params;
            const result = await GASTOS.deleteOne({ _id: new ObjectId(id) });
            return { deleted: result.deletedCount === 1 };
        });

        // Editar gasto
        fastify.put<{ Params: { id: string }, Body: Partial<Gasto> }>("/gastos/:id", async (request, reply) => {
            const { id } = request.params;
            const userId = (request.user as any)?.id;
            const updateData = request.body;

            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            updateData.date = new Date(updateData.date ?? 0)
            updateData.userId = userId

            const result = await GASTOS.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updateData },
                { returnDocument: "after" } // retorna o documento atualizado
            );

            return { id: result?._id, ...updateData };
        });

        // Listar gastos do mês
        fastify.get('/gastos/:ano/:mes', async (request, reply) => {
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            const { ano, mes } = request.params as any;
            const start = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            const end = new Date(parseInt(ano), parseInt(mes), 1);

            const gastos = await GASTOS.find({
                userId,
                date: { $gte: start, $lt: end }
            }).toArray();

            return gastos.map(g => ({ ...g, _id: g._id.toString() }));
        });

        // Gastos acumulados por mês
        fastify.get('/gastos-acumulados', async (request, reply) => {
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            const pipeline = [
                { $match: { userId } },
                {
                    $group: {
                        _id: { ano: { $year: "$date" }, mes: { $month: "$date" } },
                        total: { $sum: "$value" }
                    }
                },
                { $sort: { "_id.ano": 1, "_id.mes": 1 } }
            ];
            const res = await GASTOS.aggregate(pipeline).toArray();
            return res;
        });

        // --- Salário ---
        fastify.get('/salario', async (request, reply) => {
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            const doc = await SALARIO.findOne({ userId });
            return doc?.value || 0;
        });

        fastify.post('/salario', async (request, reply) => {
            const { value } = request.body as any;
            const userId = (request.user as any)?.id;
            if (!userId) return reply.status(401).send({ error: 'Não autorizado' });

            await SALARIO.updateOne(
                { userId }, // <-- garante que só atualiza do usuário logado
                { $set: { value, userId } },
                { upsert: true }
            );

            return { value };
        });
    })


    await fastify.listen({ port: parseInt(process.env.PORT || "3000") });
    console.log(`Servidor rodando na porta ${process.env.PORT}`);
}

main();
