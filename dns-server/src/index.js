#!/usr/bin/env node

import dgram from 'dgram';
import packet from 'dns-packet';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [new winston.transports.File({ filename: 'app.log' })],
});

const LOCAL_PORT = 53;
const UPSTREAM_DNS = { address: '8.8.8.8', port: 53 };

const server = dgram.createSocket('udp4');
const upstream = dgram.createSocket('udp4');

const data = {
    'example.com': {
        A: ['127.0.0.1'],
        MX: [{ preference: 10, exchange: 'mail.example.com' }],
    },
};

server.on('message', (msg, rinfo) => {
    let query;
    try {
        query = packet.decode(msg);
    } catch (err) {
        logger.error(`Failed to decode packet: ${err}`);
        console.error(`Failed to decode packet: ${err}`);
        // journaldLogger.error('error', `Failed to decode packet: ${err}`);

        return;
    }

    const answers = [];
    const seen = new Set();
    let resolvedLocally = false;

    for (const q of query.questions) {
        const key = `${q.type}:${q.name}`;
        if (!q.name || seen.has(key)) continue;
        seen.add(key);

        if (data[q.name] && data[q.name][q.type]) {
            for (const record of data[q.name][q.type]) {
                answers.push({
                    type: q.type,
                    name: q.name,
                    ttl: 300,
                    class: 'IN',
                    data: record,
                });
            }

            resolvedLocally = true;
        }
    }

    if (resolvedLocally) {
        const response = {
            id: query.id,
            type: 'response',
            flags: packet.RECURSION_DESIRED | packet.RECURSION_AVAILABLE,
            questions: query.questions,
            answers,
        };

        const buf = packet.encode(response);
        server.send(buf, 0, buf.length, rinfo.port, rinfo.address, () => {});
    } else {
        upstream.send(
            msg,
            0,
            msg.length,
            UPSTREAM_DNS.port,
            UPSTREAM_DNS.address
        );

        upstream.once('message', (upstreamResponse) => {
            server.send(
                upstreamResponse,
                0,
                upstreamResponse.length,
                rinfo.port,
                rinfo.address,
                () => {
                    const qName = query.questions[0]?.name || '[unknown]';
                    logger.info(
                        `Forwarded response for ${qName} from ${UPSTREAM_DNS.address}`
                    );
                }
            );
        });
    }
});

server.on('listening', () => {
    const address = server.address();
    logger.info(`DNS server listening on ${address.address}:${address.port}`);
    console.log(`DNS server listening on ${address.address}:${address.port}`);
    // journaldLogger.info(
    //     `DNS server listening on ${address.address}:${address.port}`
    // );
});

server.bind(LOCAL_PORT);
