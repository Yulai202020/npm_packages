#!/usr/bin/env node

import dns from 'dns';
import net from 'net';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

// tools
function isIP(input) {
    return net.isIP(input) !== 0;
}

async function isDnsServerReachable(dnsServer, port = 53) {
    return new Promise((resolve, reject) => {
        const resolver = new dns.Resolver();
        resolver.setServers([`${dnsServer}:${port}`]);

        resolver.resolve4('example.com', (err, addresses) => {
            if (err) {
                reject(new Error(`DNS server ${dnsServer}:${port} is not reachable: ${err.message}`));
            } else {
                resolve(true);
            }
        });
    });
}

// main functions
async function getAllDNSRecords(ip, service) {
    let reversed_ip = ip.split(".").reverse().join(".")

    return new Promise((resolve) => {
        dns.resolve4(`${reversed_ip}.${service}`, (err, records) => {
            if (err && err.code === 'ENOTFOUND') {
                resolve(`${ip} is NOT listed in ${service}`);
            } else if (addresses) {
                if (Array.isArray(records)) {
                    resolve(records.length > 0 ? records.flat() : [])
                } else {
                    resolve(records)
                }
            } else {
                reject(`Unexpected response: ${err}.`);
            }
        });
    });
}

program
    .argument('<ip>')
    .option('-p, --port <port>', 'Specify the DNS port', 53)
    .option('-d, --dns <dns_server>', 'Specify the DNS server', dns.getServers()[0])
    .option('-s, --service <service>', 'Specify the DNS server', "zen.spamhaus.org")
    .version(packageJson.version)
    .description('Program to make dns request files.');

program.parse(process.argv);

const argument = program.args;
const ip = argument[0];

const options = program.opts();

const dnsPort = options.port;
const dnsServer = options.dns;
const service = options.service;

await isDnsServerReachable(dnsServer, dnsPort);
dns.setServers([`${dnsServer}:${dnsPort}`]);

if (isIP(ip)) {
    const a = await getAllDNSRecords(ip, service);
    console.log(a)
}