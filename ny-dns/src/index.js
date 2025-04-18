#!/usr/bin/env node

import fs from 'fs';
import dns from 'dns';
import Table from "tty-table";
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };
import net from 'net';

const recordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR", "SRV"];

function isIP(input) {
    return net.isIP(input) !== 0;
}

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
async function getAllDNSRecords(domain) {
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

async function getDNSRecords(domain, type="A") {
    const json = await getAllDNSRecords(domain);

    return json[type];
}

async function printAllDNSRecords(domain) {
    const json = await getAllDNSRecords(domain);

    const baseRows = [];

    const activeTypes = recordTypes.filter(type => !isEmpty(json[type]));

    if (isEmpty(activeTypes)) {
        console.log(`Data for host ${domain} not found.`);
        return ;
    }

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

async function printDNSRecords(domain, type="A") {
    let answer = await getDNSRecords(domain, type);
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

async function getPTRRecords(domain) {
    return new Promise(resolve => {
        dns.reverse(domain, (err, records) => {
            if (err) {
                resolve([]);
            } else {
                resolve(records);
            }
        });
    });
}

program
    .argument('<site>')
    .option('-o, --old', 'Print like a host command', false)
    .option('-p, --port <port>', 'Specify the DNS port', 53)
    .option('-d, --dns <dns_server>', 'Specify the DNS server', dns.getServers()[0])
    .option('-t, --type <type>', 'Specify the DNS record type', 'ALL')
    .option('-j, --json <json_file>', 'Save record as json file')
    .version(packageJson.version)
    .description('Program to make dns request files.');

program.parse(process.argv);

const argument = program.args;
const site = argument[0];

const options = program.opts();

const dnsPort = options.port;
const dnsServer = options.dns;
const dnsType = options.type.toUpperCase();

const oldPrint = options.old;
const output_file = options?.json;

await isDnsServerReachable(dnsServer, dnsPort);
dns.setServers([`${dnsServer}:${dnsPort}`]);

let json = null;

if (output_file) {
    json = await getAllDNSRecords(site);
} else if (isIP(site)) {
    console.log(await getPTRRecords(site));
} else if (dnsType === "ALL") {
    await printAllDNSRecords(site);
} else if (recordTypes.includes(dnsType)) {
    const dnsType = options.type.toUpperCase();
    await printDNSRecords(site, dnsType);
} else {
    console.log(`Invalid type: ${dnsType}`);
    process.exit(1);
}

if (output_file && json) {
    fs.writeFile(output_file, JSON.stringify(json, null, '\t'), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        }
    });
}