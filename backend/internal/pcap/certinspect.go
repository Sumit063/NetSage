package pcap

import (
    "context"
    "crypto/tls"
    "crypto/x509"
    "net"
    "time"
)

type CertReport struct {
    Host              string    `json:"host"`
    Port              int       `json:"port"`
    Subject           string    `json:"subject"`
    Issuer            string    `json:"issuer"`
    SANs              []string  `json:"sans"`
    NotBefore         time.Time `json:"not_before"`
    NotAfter          time.Time `json:"not_after"`
    SignatureAlg      string    `json:"signature_algorithm"`
    ChainLength       int       `json:"chain_length"`
    Issues            []string  `json:"issues"`
    HostnameValid     bool      `json:"hostname_valid"`
    SelfSigned        bool      `json:"self_signed"`
    Expired           bool      `json:"expired"`
    WeakSignatureAlgo bool      `json:"weak_signature"`
}

func InspectCert(ctx context.Context, host string, port int) (CertReport, error) {
    report := CertReport{Host: host, Port: port}

    dialer := &net.Dialer{Timeout: 8 * time.Second}
    conn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(host, intToString(port)), &tls.Config{
        ServerName:         host,
        InsecureSkipVerify: true,
    })
    if err != nil {
        return report, err
    }
    defer conn.Close()

    state := conn.ConnectionState()
    if len(state.PeerCertificates) == 0 {
        report.Issues = append(report.Issues, "no certificates presented")
        return report, nil
    }

    leaf := state.PeerCertificates[0]
    report.Subject = leaf.Subject.String()
    report.Issuer = leaf.Issuer.String()
    report.SANs = leaf.DNSNames
    report.NotBefore = leaf.NotBefore
    report.NotAfter = leaf.NotAfter
    report.SignatureAlg = leaf.SignatureAlgorithm.String()
    report.ChainLength = len(state.PeerCertificates)

    if time.Now().After(leaf.NotAfter) || time.Now().Before(leaf.NotBefore) {
        report.Expired = true
        report.Issues = append(report.Issues, "certificate is expired or not yet valid")
    }

    if err := leaf.VerifyHostname(host); err != nil {
        report.HostnameValid = false
        report.Issues = append(report.Issues, "hostname mismatch")
    } else {
        report.HostnameValid = true
    }

    if leaf.Subject.String() == leaf.Issuer.String() {
        report.SelfSigned = true
        report.Issues = append(report.Issues, "self-signed certificate")
    }

    if report.ChainLength < 2 {
        report.Issues = append(report.Issues, "incomplete certificate chain")
    }

    if isWeakSignature(leaf.SignatureAlgorithm) {
        report.WeakSignatureAlgo = true
        report.Issues = append(report.Issues, "weak signature algorithm")
    }

    _ = ctx
    return report, nil
}

func isWeakSignature(alg x509.SignatureAlgorithm) bool {
    switch alg {
    case x509.MD2WithRSA, x509.MD5WithRSA, x509.SHA1WithRSA, x509.DSAWithSHA1, x509.ECDSAWithSHA1:
        return true
    default:
        return false
    }
}

func intToString(v int) string {
    if v == 0 {
        return "0"
    }
    buf := [20]byte{}
    i := len(buf)
    for v > 0 {
        i--
        buf[i] = byte('0' + v%10)
        v /= 10
    }
    return string(buf[i:])
}
