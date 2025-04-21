#!/usr/bin/env node

import pcapp from 'pcap-parser';
import { writeFileSync } from 'fs';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

function bytesToBigInt(bytes) {
    let result = 0n;
    for (const byte of bytes) {
        result = (result << 8n) | BigInt(byte);
    }
    return result;
}

program
    .argument('<pcap_file>')
    .option('-o, --output <output_file>', 'Specify the upstream DNS port')
    .version(packageJson.version)
    .description("Program for reading pcap files");

const argument = program.args;
const file = argument[0];
    
const options = program.opts();
const output_file = options?.output;
const output = [];
const parser = pcapp.parse(file);

let count_of_packets = 0;

parser.on('packet', function (packet) {
    count_of_packets += 1;

    const data = packet.data;
    let start = 0;

    // ethernet header
    const ethernetHeader = {};

    ethernetHeader['destinationMac'] = Array.from(data.slice(start, start + 6))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':');

    ethernetHeader['sourceMac'] = Array.from(data.slice(start + 6, start + 12))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':');

    ethernetHeader['preamble'] = bytesToBigInt(
        data.slice(start + 12, start + 19)
    );
    ethernetHeader['SFD'] = data[start + 20];

    start += 20;

    // ip header
    const ipHeader = {};
    ipHeader['ipVersion'] = (data[start] & 0xf0) >> 4;

    if (ipHeader['ipVersion'] === 6) {
        return;
    }

    const IHL = (data[start] & 0x0f) * 4;

    ipHeader['IHL'] = IHL;
    ipHeader['TOS'] = data[start + 1];
    ipHeader['length'] = bytesToBigInt(data.slice(start + 2, start + 4));
    ipHeader['id'] = bytesToBigInt(data.slice(start + 4, start + 6));
    ipHeader['flags'] = (data[start + 6] & 0b11100000) >> 5;
    ipHeader['fragmentOffset'] =
        (BigInt(data[start + 6] & 0b00011111) << 8n) | BigInt(data[start + 7]);

    ipHeader['TOL'] = data[start + 8];

    const protocol = data[start + 9];

    ipHeader['protocol'] = protocol;
    ipHeader['checksum'] = bytesToBigInt(data.slice(start + 9, start + 11));
    ipHeader['srcIP'] = data.slice(start + 12, start + 16).join('.');
    ipHeader['dstIP'] = data.slice(start + 16, start + 20).join('.');

    if (IHL > 20) {
        ipHeader['IPOptions'] = bytesToBigInt(
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
        protocolHeader['srcPort'] = bytesToBigInt(data.slice(start, start + 2));
        protocolHeader['dstPort'] = bytesToBigInt(
            data.slice(start + 2, start + 4)
        );
    }

    start += 4;

    if (protocol_type === 'TCP') {
        protocolHeader['sequenceNumber'] = bytesToBigInt(
            data.slice(start, start + 4)
        );

        protocolHeader['Acknowledgment'] = bytesToBigInt(
            data.slice(start + 4, start + 8)
        );

        start += 8;

        protocolHeader['dataOffset']; // 4 bits
        protocolHeader['reserved']; // 3 bits
        protocolHeader['flags']; // 9 bits

        start += 2;

        protocolHeader['windowSize'] = bytesToBigInt(
            data.slice(start, start + 2)
        );

        protocolHeader['checksum'] = bytesToBigInt(
            data.slice(start + 2, start + 4)
        );

        protocolHeader['urgentPointer'] = bytesToBigInt(
            data.slice(start + 4, start + 6)
        );

        start += 6;
    }

    if (protocol_type === 'UDP') {
        protocolHeader['length'] = bytesToBigInt(data.slice(start, start + 2));
        protocolHeader['checksum'] = bytesToBigInt(
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
} else {
    // print
}
