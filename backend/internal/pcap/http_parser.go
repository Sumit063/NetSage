package pcap

import (
    "bytes"
)

type httpInfo struct {
    payload []byte
}

func (h httpInfo) Parse() (*string, *string) {
    if len(h.payload) < 8 {
        return nil, nil
    }

    methods := [][]byte{
        []byte("GET "), []byte("POST "), []byte("PUT "), []byte("DELETE "),
        []byte("HEAD "), []byte("OPTIONS "), []byte("PATCH "),
    }
    method := ""
    for _, m := range methods {
        if bytes.HasPrefix(h.payload, m) {
            method = string(bytes.TrimSpace(m))
            break
        }
    }
    if method == "" {
        return nil, nil
    }

    host := ""
    lines := bytes.Split(h.payload, []byte("\r\n"))
    for _, line := range lines {
        if bytes.HasPrefix(bytes.ToLower(line), []byte("host:")) {
            host = string(bytes.TrimSpace(line[5:]))
            break
        }
    }

    methodPtr := method
    if host == "" {
        return &methodPtr, nil
    }
    return &methodPtr, &host
}
