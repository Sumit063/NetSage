package pcap

import (
    "encoding/binary"
)

type tlsInfo struct {
    payload []byte
}

func (t tlsInfo) Parse() (*string, *string, *string, bool, bool, bool) {
    var sni *string
    var version *string
    var alpn *string
    clientHello := false
    serverHello := false
    alert := false

    data := t.payload
    for len(data) >= 5 {
        contentType := data[0]
        if contentType == 21 {
            alert = true
        }
        recordVersion := data[1:3]
        recordLen := int(binary.BigEndian.Uint16(data[3:5]))
        if len(data) < 5+recordLen {
            break
        }
        record := data[5 : 5+recordLen]

        if contentType == 22 {
            hsType, hsVersion, hsSNI, hsALPN := parseHandshake(record)
            if hsType == 1 {
                clientHello = true
                if hsSNI != nil {
                    sni = hsSNI
                }
                if hsALPN != nil {
                    alpn = hsALPN
                }
                if hsVersion != nil {
                    version = hsVersion
                }
            }
            if hsType == 2 {
                serverHello = true
                if hsALPN != nil {
                    alpn = hsALPN
                }
                if hsVersion != nil {
                    version = hsVersion
                }
            }
        } else if contentType == 23 && version == nil {
            v := tlsVersionString(recordVersion)
            if v != "" {
                version = &v
            }
        }

        data = data[5+recordLen:]
    }

    return sni, version, alpn, clientHello, serverHello, alert
}

func parseHandshake(record []byte) (int, *string, *string, *string) {
    if len(record) < 4 {
        return 0, nil, nil, nil
    }
    hsType := int(record[0])
    hsLen := int(record[1])<<16 | int(record[2])<<8 | int(record[3])
    if len(record) < 4+hsLen {
        return 0, nil, nil, nil
    }

    body := record[4 : 4+hsLen]
    if hsType == 1 {
        sni, alpn, version := parseClientHello(body)
        return hsType, version, sni, alpn
    }
    if hsType == 2 {
        alpn, version := parseServerHello(body)
        return hsType, version, nil, alpn
    }

    return hsType, nil, nil, nil
}

func parseClientHello(body []byte) (*string, *string, *string) {
    if len(body) < 34 {
        return nil, nil, nil
    }
    version := tlsVersionString(body[0:2])
    idx := 2 + 32

    if len(body) < idx+1 {
        return nil, nil, strPtr(version)
    }
    sessionLen := int(body[idx])
    idx++
    if len(body) < idx+sessionLen {
        return nil, nil, strPtr(version)
    }
    idx += sessionLen

    if len(body) < idx+2 {
        return nil, nil, strPtr(version)
    }
    cipherLen := int(binary.BigEndian.Uint16(body[idx : idx+2]))
    idx += 2 + cipherLen

    if len(body) < idx+1 {
        return nil, nil, strPtr(version)
    }
    compLen := int(body[idx])
    idx++
    idx += compLen

    if len(body) < idx+2 {
        return nil, nil, strPtr(version)
    }
    extLen := int(binary.BigEndian.Uint16(body[idx : idx+2]))
    idx += 2
    if len(body) < idx+extLen {
        return nil, nil, strPtr(version)
    }

    extData := body[idx : idx+extLen]
    sni, alpn := parseExtensions(extData)

    return sni, alpn, strPtr(version)
}

func parseServerHello(body []byte) (*string, *string) {
    if len(body) < 38 {
        return nil, nil
    }
    version := tlsVersionString(body[0:2])
    idx := 2 + 32

    if len(body) < idx+1 {
        return nil, strPtr(version)
    }
    sessionLen := int(body[idx])
    idx++
    if len(body) < idx+sessionLen+2+1 {
        return nil, strPtr(version)
    }
    idx += sessionLen

    idx += 2
    idx += 1

    if len(body) < idx+2 {
        return nil, strPtr(version)
    }
    extLen := int(binary.BigEndian.Uint16(body[idx : idx+2]))
    idx += 2
    if len(body) < idx+extLen {
        return nil, strPtr(version)
    }
    extData := body[idx : idx+extLen]
    _, alpn := parseExtensions(extData)
    return alpn, strPtr(version)
}

func parseExtensions(data []byte) (*string, *string) {
    var sni *string
    var alpn *string

    idx := 0
    for idx+4 <= len(data) {
        extType := binary.BigEndian.Uint16(data[idx : idx+2])
        extLen := int(binary.BigEndian.Uint16(data[idx+2 : idx+4]))
        idx += 4
        if idx+extLen > len(data) {
            break
        }
        ext := data[idx : idx+extLen]
        idx += extLen

        switch extType {
        case 0x0000:
            if sni == nil {
                if host := parseSNI(ext); host != "" {
                    sni = &host
                }
            }
        case 0x0010:
            if alpn == nil {
                if proto := parseALPN(ext); proto != "" {
                    alpn = &proto
                }
            }
        }
    }

    return sni, alpn
}

func parseSNI(data []byte) string {
    if len(data) < 5 {
        return ""
    }
    listLen := int(binary.BigEndian.Uint16(data[0:2]))
    if len(data) < 2+listLen {
        return ""
    }
    idx := 2
    if idx+3 > len(data) {
        return ""
    }
    nameType := data[idx]
    if nameType != 0x00 {
        return ""
    }
    idx++
    nameLen := int(binary.BigEndian.Uint16(data[idx : idx+2]))
    idx += 2
    if idx+nameLen > len(data) {
        return ""
    }
    return string(data[idx : idx+nameLen])
}

func parseALPN(data []byte) string {
    if len(data) < 3 {
        return ""
    }
    listLen := int(binary.BigEndian.Uint16(data[0:2]))
    if len(data) < 2+listLen {
        return ""
    }
    idx := 2
    if idx+1 > len(data) {
        return ""
    }
    protoLen := int(data[idx])
    idx++
    if idx+protoLen > len(data) {
        return ""
    }
    return string(data[idx : idx+protoLen])
}

func tlsVersionString(raw []byte) string {
    if len(raw) < 2 {
        return ""
    }
    v := binary.BigEndian.Uint16(raw)
    switch v {
    case 0x0301:
        return "TLS1.0"
    case 0x0302:
        return "TLS1.1"
    case 0x0303:
        return "TLS1.2"
    case 0x0304:
        return "TLS1.3"
    default:
        return ""
    }
}

func strPtr(v string) *string {
    if v == "" {
        return nil
    }
    return &v
}
