#include <stdio.h>
#include <stdbool.h>
#include <pcap.h>
#include <unistd.h>
#include <stdlib.h>
#include <errno.h>

#define MAX_LEN 65535

bool dump_to_file = false;
pcap_dumper_t *dumper = NULL;

void packet_handler(unsigned char *user, const struct pcap_pkthdr *header, const unsigned char *packet) {
    printf("Packet captured: length = %d\n", header->len);

    if (dump_to_file) {
        pcap_dump((unsigned char*)dumper, header, packet);
    }

    for (int i = 0; i < header->len; i++) {
        printf("%02x ", packet[i]);
    }

    printf("\n");
}

int main(int argc, char *argv[]) {
    char errbuf[PCAP_ERRBUF_SIZE]; // error buffer
    pcap_t *handle; // handler
    const char *device = NULL; // device

    char* output = NULL;
    char* filter_exp = NULL;
    int max_count = -1;
    int length = 0;
    int opt;

    while ((opt = getopt(argc, argv, "s:w:c:f:")) != -1) {
        switch (opt) {
            case 'w':
                output = optarg;
                dump_to_file = true;
                break;
            case 's':
                length = atoi(optarg);
                break;
            case 'c':
                max_count = atoi(optarg);
                break;
            case 'f':
                filter_exp = optarg;
                break;
            default:
                printf("Unknown error\n");
        }
    }

    device = pcap_lookupdev(errbuf);
    if (device == NULL) {
        fprintf(stderr, "Device not found: %s\n", errbuf);
        return 1;
    }

    printf("Capturing packets on device: %s\n", device);

    handle = pcap_open_live(device, length, 1, 1000, errbuf);
    if (handle == NULL) {
        fprintf(stderr, "Error opening device: %s\n", errbuf);
        return 1;
    }

    printf("Using filter: %s\n", filter_exp);

    if (filter_exp != NULL) {
        struct bpf_program fp;

        if (pcap_compile(handle, &fp, filter_exp, 0, PCAP_NETMASK_UNKNOWN) == -1) {
            fprintf(stderr, "Couldn't parse filter %s: %s\n", filter_exp, pcap_geterr(handle));
            return 1;
        }

        if (pcap_setfilter(handle, &fp) == -1) {
            fprintf(stderr, "Couldn't install filter %s: %s\n", filter_exp, pcap_geterr(handle));
            return 1;
        }

        pcap_freecode(&fp);
    }

    if (dump_to_file) {
        dumper = pcap_dump_open(handle, "capture.pcap");
        if (!dumper) {
            fprintf(stderr, "Error opening output file: %s\n", pcap_geterr(handle));
            return 1;
        }
    }

    // Start capturing packets; `packet_handler` will be called for each captured packet
    if (pcap_loop(handle, max_count, packet_handler, (unsigned char *)dumper) < 0) {
        fprintf(stderr, "Error capturing packets: %s\n", pcap_geterr(handle));
        return 1;
    }

    // Close the capture session when done
    if (dumper) {
        pcap_dump_close(dumper);
    }
    pcap_close(handle);
    return 0;
}