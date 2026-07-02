const request = require('supertest');
process.env.NODE_ENV = 'test';
const app = require('../server');

describe('Offline AI disabled routes', () => {
    test('/api/health reports AI disabled without Ollama dependency', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.ai).toMatchObject({
            status: 'disabled',
            source: 'offline_kiosk',
            aiEnabled: false,
            engine: 'deterministic'
        });
        expect(response.body.aiEnabled).toBe(false);
    });

    test('/api/ai routes return AI_REMOVED', async () => {
        const response = await request(app).get('/api/ai/health');

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic'
        });
    });

    test('/api/compatibility/enhanced/future-upgrade-external returns AI_REMOVED', async () => {
        const response = await request(app)
            .post('/api/compatibility/enhanced/future-upgrade-external')
            .send({ currentComponent: { name: 'CPU', category: 'CPU' }, targetCategory: 'GPU', budget: 10000 });

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic'
        });
    });

    test('/api/kiosk/ollama-external-upgrade returns AI_REMOVED', async () => {
        const response = await request(app)
            .post('/api/kiosk/ollama-external-upgrade')
            .send({
                currentItem: { name: 'Intel Core i5-13400F', category: 'CPU' },
                targetCategory: 'GPU',
                budget: 25000
            });

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic'
        });
    });

    test('/api/kiosk/pc-customized-ai-parameters returns AI_REMOVED', async () => {
        const response = await request(app).get('/api/kiosk/pc-customized-ai-parameters');

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic',
            aiEnabled: false
        });
    });

    test('/api/pc-customized-ai-builds legacy routes return AI_REMOVED', async () => {
        const response = await request(app).get('/api/pc-customized-ai-builds/all');

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic'
        });
    });

    test('/api/compatibility/batch returns deterministic candidate results', async () => {
        const response = await request(app)
            .post('/api/compatibility/batch')
            .send({
                contextParts: [
                    {
                        id: 101,
                        name: 'Intel Core i5-13400F',
                        category: 'CPU',
                        specifications: { socket: 'LGA1700', tdp: '65W' }
                    }
                ],
                candidates: [
                    {
                        id: 102,
                        name: 'B760 LGA1700 Motherboard',
                        category: 'Motherboard',
                        specifications: { socket: 'LGA1700', chipset: 'B760', memory_type: 'DDR5' }
                    },
                    {
                        id: 103,
                        name: 'B650 AM5 Motherboard',
                        category: 'Motherboard',
                        specifications: { socket: 'AM5', chipset: 'B650', memory_type: 'DDR5' }
                    }
                ],
                mode: 'candidate_filter',
                targetCategory: 'Motherboard'
            });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            mode: 'candidate_filter',
            summary: {
                total: 2,
                compatible: 1,
                failed: 1
            }
        });
        expect(response.body.data[0]).toMatchObject({
            id: 102,
            compatible: true,
            source: 'deterministic'
        });
        expect(response.body.data[1]).toMatchObject({
            id: 103,
            compatible: false,
            compatibility_score: 0,
            verdict: 'fail'
        });
    });

    test('/api/compatibility/analyze pair_check uses deterministic contract', async () => {
        const response = await request(app)
            .post('/api/compatibility/analyze')
            .send({
                mode: 'pair_check',
                currentProduct: {
                    id: 202,
                    name: 'B650 AM5 Motherboard',
                    category: 'Motherboard',
                    specifications: { socket: 'AM5', chipset: 'B650', memory_type: 'DDR5' }
                },
                selectedParts: [
                    {
                        id: 201,
                        name: 'Intel Core i5-13400F',
                        category: 'CPU',
                        specifications: { socket: 'LGA1700', tdp: '65W' }
                    }
                ]
            });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            compatible: false,
            status: 'incompatible',
            score: 0
        });
        expect(response.body.issues.some((issue) => issue.rule === 'socket_match')).toBe(true);
    });

    test('/api/pc-upgrade/external-suggestions is disabled offline', async () => {
        const response = await request(app)
            .post('/api/pc-upgrade/external-suggestions')
            .send({ currentComponent: 'Intel Core i5-13400F', category: 'GPU', budget: 25000 });

        expect(response.status).toBe(410);
        expect(response.body).toMatchObject({
            success: false,
            code: 'OFFLINE_ONLY',
            source: 'deterministic',
            aiEnabled: false
        });
    });
});
