#!/usr/bin/env node

import fs from 'fs';
import dns from 'dns';
import Table from "tty-table";
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

const recordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR", "SRV"];

// tools
function isArray(array) {
    return Array.isArray(array);
}

function isObject(value) {
    return typeof value === 'object' && value !== null && !isArray(value)
}

function formatJson(jsonObj) {
    if (isObject(jsonObj)) {
        return Object.entries(jsonObj)
            .map(([key, value]) => value)
            .join(' ');
    }

    return jsonObj;
}

function isEmpty(variable) {
    if (variable === null || variable === undefined) {
        return true;
    }
  
    if (typeof variable === 'object') {
        if (isArray(variable)) {
            return variable.length === 0;
        }
      
        return Object.keys(variable).length === 0;
    }
  
    return false;
}

// main functions
async function getAllDNSRecordsJSON(domain, dnsServer) {
    dns.setServers([dnsServer]);

    const lookupTypes = {
        "A": "resolve4",
        "AAAA": "resolve6",
        "CNAME": "resolveCname",
        "MX": "resolveMx",
        "TXT": "resolveTxt",
        "NS": "resolveNs",
        "SOA": "resolveSoa",
        "PTR": "resolvePtr",
        "SRV": "resolveSrv"
    };

    const json = {}

    const recordPromises = recordTypes.map((type) => {
        return new Promise((resolve) => {
            dns[lookupTypes[type]](domain, (err, records) => {
                if (err) {
                    json[type] = [];
                } else {
                    if (Array.isArray(records)) {
                        json[type] = records.length > 0 ? records.flat() : [];
                    } else {
                        json[type] = records;
                    }
                }

                resolve();
            });
        });
    });

    await Promise.all(recordPromises);

    const sortedJson = {};
    recordTypes.forEach((type) => {
        if (json[type] !== undefined) {
            sortedJson[type] = json[type];
        }
    });

    return sortedJson;
}

async function getDNSRecordsJSON(domain, dnsServer, type="A") {
    const json = await getAllDNSRecordsJSON(domain, dnsServer);

    return json[type];
}

async function getAllDNSRecords(domain, dnsServer) {
    const json = await getAllDNSRecordsJSON(domain, dnsServer);

    // make table
    const baseRows = [];

    const activeTypes = recordTypes.filter(type => !isEmpty(json[type]));

    const maxRows = Math.max(...activeTypes.map(type => json[type]?.length || 0));
    const header = activeTypes.map(type => ({ value: type }));

    for (let i = 0; i < maxRows; i++) {
        const row = activeTypes.map(type => {
            if (isArray(json[type])) {
                const val = json[type]?.[i];
    
                if (typeof val === "object") {
                    return formatJson(val);
                }
    
                return val || "";
            } else {
                if (i === 0) {
                    return formatJson(json[type]);
                } else {
                    return "";
                }
            }
        });

        baseRows.push(row);
    }

    const t1 = Table(header, baseRows);
    console.log(t1.render());
}

async function getDNSRecords(domain, dnsServer, type="A") {
    const answer = await getDNSRecordsJSON(domain, dnsServer, type);
    const rows = []

    if (!isArray(answer)) {
        rows.push([ formatJson(answer) ]);
    } else {
        rows.push(answer);
    }
    
    const t1 = Table([{value: type}], rows);
    console.log(t1.render());
}

program
    .argument('<site>')
    .option('-t, --type <type>', 'Specify the DNS record type')
    .option('-j, --json <json_file>', 'Save record as json file')
    .option('-d, --dns <dns_server>', 'Specify the DNS server', '8.8.8.8')
    .version(packageJson.version)
    .description('Program to make dns request files.');

program.parse(process.argv);

const argument = program.args;
const site = argument[0];

const options = program.opts();

const dnsServer = options.dns;
const dnsType = options?.type?.toUpperCase() || "ALL";
const output_file = options?.json;

let json = null;

if (dnsType === "ALL") {
    if (output_file) {
        json = await getAllDNSRecordsJSON(site, dnsServer);
    } else {
        await getAllDNSRecords(site, dnsServer);
    }
} else {
    if (!recordTypes.includes(dnsType)) {
        console.log(`Invalid type: ${dnsType}`);
        process.exit(1);
    }

    if (output_file) {
        json = await getDNSRecordsJSON(site, dnsServer, dnsType);
    } else {
        const dnsType = options.type.toUpperCase();
        await getDNSRecords(site, dnsServer, dnsType);
    }
}

if (output_file) {
    fs.writeFile(output_file, JSON.stringify(json, null, '\t'), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        }
    });
}