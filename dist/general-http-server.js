#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
const app = express();
const port = process.env.HTTP_PORT || 3004;
// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'general-http-server'
    });
});
// Basic HTTP endpoints for testing
app.get('/', (req, res) => {
    res.json({
        message: 'General HTTP Server is running',
        endpoints: [
            'GET /health - Health check',
            'GET / - This message',
            'GET /api/info - Server info',
            'POST /api/echo - Echo request body',
            'GET /api/test - Test endpoint'
        ]
    });
});
// Server info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'General HTTP Server',
        version: '1.0.0',
        node: process.version,
        uptime: process.uptime(),
        port: port
    });
});
// Echo endpoint - returns the request body
app.post('/api/echo', (req, res) => {
    res.json({
        message: 'Echo response',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});
// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test endpoint working',
        params: req.query,
        timestamp: new Date().toISOString()
    });
});
// Generic API endpoint for custom requests
app.all('/api/:endpoint', (req, res) => {
    res.json({
        message: `API endpoint: ${req.params.endpoint}`,
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body,
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});
app.listen(port, () => {
    console.log(`🌐 General HTTP Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🏠 Home: http://localhost:${port}/`);
    console.log(`ℹ️  Info: http://localhost:${port}/api/info`);
});
