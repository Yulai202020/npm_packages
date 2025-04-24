#!/usr/bin/env node

import pcapp from 'pcap-parser';
import { writeFileSync } from 'fs';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };
import { DatabaseSync } from 'node:sqlite';
import Table from "tty-table";

function bytesToInt(bytes) {
    let result = 0;
    for (const byte of bytes) {
        result = (result << 8) | byte;
    }
    return result;
}

program
    .argument('<pcap_file>')
    .option('-o, --output <output_file>', 'Specify the output file')
    .option('-d, --db <database_file>', 'Specify the output file')
    .version(packageJson.version)
    .description("Program for reading pcap files")
    .parse(process.argv);

const argument = program.args;
const file = argument[0];
    
const options = program.opts();
const output_file = options?.output;
const output_db_file = options?.db;
const output = [];
const parser = pcapp.parse(file);

let count_of_packets = 0;

parser.on('packet', (packet) => {
    count_of_packets += 1;

    const data = packet.data;
    let start = 0;

    // ethernet header
    const ethernetHeader = {};

    ethernetHeader['dstMAC'] = Array.from(data.slice(start, start + 6))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':');

    ethernetHeader['srcMAC'] = Array.from(data.slice(start + 6, start + 12))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':');

    ethernetHeader['etherType'] = bytesToInt(data.slice(start + 12, start + 14)); 

    start += 14;

    // ip header
    const ipHeader = {};
    ipHeader['ipVersion'] = (data[start] & 0xf0) >> 4;

    if (ipHeader['ipVersion'] === 6) {
        return;
    }

    const IHL = (data[start] & 0x0f) * 4;

    ipHeader['IHL'] = IHL;
    ipHeader['TOS'] = data[start + 1];
    ipHeader['length'] = bytesToInt(data.slice(start + 2, start + 4));
    ipHeader['id'] = bytesToInt(data.slice(start + 4, start + 6));
    ipHeader['flags'] = (data[start + 6] & 0b11100000) >> 5;
    ipHeader['fragmentOffset'] =
        (data[start + 6] & 0b00011111 << 8) | data[start + 7];

    ipHeader['TOL'] = data[start + 8];

    const protocol = data[start + 9];

    ipHeader['protocol'] = protocol;
    ipHeader['checksum'] = bytesToInt(data.slice(start + 9, start + 11));
    ipHeader['srcIP'] = data.slice(start + 12, start + 16).join('.');
    ipHeader['dstIP'] = data.slice(start + 16, start + 20).join('.');

    if (IHL > 20) {
        ipHeader['IPOptions'] = bytesToInt(
            data.slice(start + 20, start + IHL)
        );
    }

    start += IHL; // skip whole ip header

    // udp/tcp header
    const protocol_type =
        protocol === 6
            ? 'TCP'
            : protocol === 17
            ? 'UDP'
            : protocol === 1
            ? 'ICMP'
            : 'Other';

    const protocolHeader = {};

    if (protocol_type !== 'Other' && protocol_type !== 'ICMP') {
        protocolHeader['srcPort'] = bytesToInt(data.slice(start, start + 2));
        protocolHeader['dstPort'] = bytesToInt(
            data.slice(start + 2, start + 4)
        );
    }

    start += 4;

    if (protocol_type === 'TCP') {
        protocolHeader['sequenceNumber'] = bytesToInt(
            data.slice(start, start + 4)
        );

        protocolHeader['Acknowledgment'] = bytesToInt(
            data.slice(start + 4, start + 8)
        );

        start += 8;

        protocolHeader['dataOffset']; // 4 bits
        protocolHeader['reserved']; // 3 bits
        protocolHeader['flags']; // 9 bits

        start += 2;

        protocolHeader['windowSize'] = bytesToInt(
            data.slice(start, start + 2)
        );

        protocolHeader['checksum'] = bytesToInt(
            data.slice(start + 2, start + 4)
        );

        protocolHeader['urgentPointer'] = bytesToInt(
            data.slice(start + 4, start + 6)
        );

        start += 6;
    }

    if (protocol_type === 'UDP') {
        protocolHeader['length'] = bytesToInt(data.slice(start, start + 2));
        protocolHeader['checksum'] = bytesToInt(
            data.slice(start + 2, start + 4)
        );

        start += 4;
    }

    const body = data.slice(start).toString('hex');

    output.push({
        ethernetHeader: ethernetHeader,
        ipHeader: ipHeader,
        protocolHeader: protocolHeader,
        body: body,
    });
});

parser.on('end', () => {
    if (output_file) {
        writeFileSync(
            output_file,
            JSON.stringify(
                output,
                (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value,
                '\t'
            )
        );
    } else if (output_db_file) {
        const db = new DatabaseSync(output_db_file);

        db.exec(`
            CREATE TABLE IF NOT EXISTS ethernet (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              dstMAC TEXT,
              srcMAC TEXT,
              preamble TEXT,
              SFD TEXT
            );
        `);
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS ip (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ipVersion INTEGER,
                IHL INTEGER,
                TOS INTEGER,
                length INTEGER,
                identifier INTEGER,
                flags INTEGER,
                fragmentOffset INTEGER,
                TOL INTEGER,
                protocol INTEGER,
                checksum INTEGER,
                srcIP TEXT,
                dstIP TEXT
            );
        `);
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS protocol (
                id INTEGER PRIMARY KEY AUTOINCREMENT
            );
        `);
        
        const ethernet_insert = db.prepare(`INSERT INTO ethernet (dstMAC, srcMAC, preamble, SFD) VALUES (?, ?, ?, ?);`);
        const ip_insert = db.prepare(`INSERT INTO ip (ipVersion, IHL, TOS, length, identifier, flags, fragmentOffset, TOL, protocol, checksum, srcIP, dstIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`);
        
        output.forEach((i, index) => {
            ethernet_insert.run(...Object.values(i.ethernetHeader));
            ip_insert.run(...Object.values(i.ipHeader));
        })
    } else {
        output.forEach((i, index) => {
            const ethernetHeader = [
                {
                    value: "Destination MAC"
                },
                {
                    value: "Source MAC"
                }
            ];

            const t1 = Table(ethernetHeader, [[i.ethernetHeader["dstMAC"], i.ethernetHeader["srcMAC"]]]);
            console.log(t1.render());

            const ipHeader = [
                {
                    value: "Destination IP"
                },
                {
                    value: "Source IP"
                },
                {
                    value: "Checksum"
                }
            ];

            const ipRows = [
                [
                    i.ipHeader["dstIP"]+":"+i.protocolHeader["dstPort"],
                    i.ipHeader["srcIP"]+":"+i.protocolHeader["srcPort"],
                    i.ipHeader["checksum"]
                ]
            ]

            const t2 = Table(ipHeader, ipRows);
            console.log(t2.render());
        });
    }
});