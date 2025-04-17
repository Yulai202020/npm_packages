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

function isNotListOfObjects(arr) {
    return isArray(arr) && arr.every(item => typeof item !== 'object' || item === null);
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
async function getAllDNSRecordsJSON(domain, dnsServer, port) {
    dns.setServers([`${dnsServer}:${port}`]);

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

async function getDNSRecordsJSON(domain, dnsServer, port, type="A") {
    const json = await getAllDNSRecordsJSON(domain, dnsServer, port);

    return json[type];
}

async function getAllDNSRecords(domain, dnsServer, port) {
    const json = await getAllDNSRecordsJSON(domain, dnsServer, port);

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

async function getDNSRecords(domain, dnsServer, port, type="A") {
    let answer = await getDNSRecordsJSON(domain, dnsServer, port, type);
    const rows = []

    function formatValues(list) {
        if (isArray(list)) {
            return list.map(item => {
                if (isArray(item) && !isObject(item)) {
                    return formatValues(item);
                } else {
                    return formatJson(item);
                }
            });
        } else {
            return formatJson(list);
        }
    }
    
    answer = formatValues(answer);

    if (isArray(answer)) {
        answer.forEach(item => {
            rows.push([item]);
        });
    } else {
        rows.push([answer]);
    }

    const t1 = Table([{value: type}], rows);
    console.log(t1.render());
}

program
    .argument('<site>')
    .option('-p, --port <port>', 'Specify the DNS record type', 53)
    .option('-d, --dns <dns_server>', 'Specify the DNS server', '8.8.8.8')
    .option('-t, --type <type>', 'Specify the DNS record type')
    .option('-j, --json <json_file>', 'Save record as json file')
    .version(packageJson.version)
    .description('Program to make dns request files.');

program.parse(process.argv);

const argument = program.args;
const site = argument[0];

const options = program.opts();

const dnsPort = options.port;
const dnsServer = options.dns;
const dnsType = options?.type?.toUpperCase() || "ALL";
const output_file = options?.json;

let json = null;

if (dnsType === "ALL") {
    if (output_file) {
        json = await getAllDNSRecordsJSON(site, dnsServer, dnsPort);
    } else {
        await getAllDNSRecords(site, dnsServer, dnsPort);
    }
} else {
    if (!recordTypes.includes(dnsType)) {
        console.log(`Invalid type: ${dnsType}`);
        process.exit(1);
    }

    if (output_file) {
        json = await getDNSRecordsJSON(site, dnsServer, dnsPort, dnsType);
    } else {
        const dnsType = options.type.toUpperCase();
        await getDNSRecords(site, dnsServer, dnsPort, dnsType);
    }
}

if (output_file) {
    fs.writeFile(output_file, JSON.stringify(json, null, '\t'), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        }
    });
}