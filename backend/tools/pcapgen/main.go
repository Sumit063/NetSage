package main

import (
    "log"
    "path/filepath"

    "netsage/internal/pcap/testutil"
)

func main() {
    outPath := filepath.Join(".", "testdata", "sample.pcap")
    if err := testutil.GenerateSamplePCAP(outPath); err != nil {
        log.Fatalf("generate sample pcap: %v", err)
    }
    log.Printf("sample pcap written to %s", outPath)
}
