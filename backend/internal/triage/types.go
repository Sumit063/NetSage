package triage

import "netsage/internal/flows"

type IssueType string

const (
	IssueLatency             IssueType = "LATENCY"
	IssueRetransmission      IssueType = "RETRANSMISSION"
	IssueTLSHandshakeFailure IssueType = "TLS_HANDSHAKE_FAILURE"
)

type Rule struct {
	ID         string         `yaml:"id"`
	IssueType  IssueType      `yaml:"issue_type"`
	Title      string         `yaml:"title"`
	Summary    string         `yaml:"summary"`
	Conditions ConditionGroup `yaml:"conditions"`
	Severity   SeverityRule   `yaml:"severity"`
}

type ConditionGroup struct {
	Any    []ConditionGroup `yaml:"any"`
	All    []ConditionGroup `yaml:"all"`
	Metric string           `yaml:"metric"`
	Op     string           `yaml:"op"`
	Value  interface{}      `yaml:"value"`
}

type SeverityRule struct {
	Base  int            `yaml:"base"`
	Steps []SeverityStep `yaml:"steps"`
}

type SeverityStep struct {
	Severity int            `yaml:"severity"`
	When     ConditionGroup `yaml:"when"`
}

type Evidence struct {
	Flow             *flows.FlowAgg
	PacketStartIndex int
	PacketEndIndex   int
	Metrics          map[string]interface{}
}

type Finding struct {
	IssueType    IssueType
	Severity     int
	Title        string
	Summary      string
	PrimaryFlow  *flows.FlowAgg
	EvidenceList []Evidence
}
