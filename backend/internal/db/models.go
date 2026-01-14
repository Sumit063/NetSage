package db

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	CreatedAt    time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
}

type Pcap struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index;not null" json:"user_id"`
	Filename    string    `gorm:"not null" json:"filename"`
	StoragePath string    `gorm:"not null" json:"storage_path"`
	UploadedAt  time.Time `gorm:"not null;autoCreateTime" json:"uploaded_at"`
}

type Job struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `gorm:"index;not null" json:"user_id"`
	PcapID     uint       `gorm:"index;not null" json:"pcap_id"`
	Status     string     `gorm:"index;not null" json:"status"`
	Progress   float64    `gorm:"not null;default:0" json:"progress"`
	StartedAt  *time.Time `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
	Error      *string    `json:"error"`
	CreatedAt  time.Time  `gorm:"not null;autoCreateTime" json:"created_at"`
}

type Flow struct {
	ID                  uint       `gorm:"primaryKey" json:"id"`
	PcapID              uint       `gorm:"index;not null" json:"pcap_id"`
	UserID              uint       `gorm:"index;not null" json:"user_id"`
	Proto               string     `gorm:"index;not null" json:"protocol"`
	SrcIP               string     `gorm:"index;not null" json:"src_ip"`
	DstIP               string     `gorm:"index;not null" json:"dst_ip"`
	SrcPort             int        `gorm:"index;not null" json:"src_port"`
	DstPort             int        `gorm:"index;not null" json:"dst_port"`
	ClientIP            string     `gorm:"index;not null" json:"client_ip"`
	ClientPort          int        `gorm:"index;not null" json:"client_port"`
	ServerIP            string     `gorm:"index;not null" json:"server_ip"`
	ServerPort          int        `gorm:"index;not null" json:"server_port"`
	StartTS             time.Time  `gorm:"column:first_seen;not null" json:"start_ts"`
	EndTS               time.Time  `gorm:"column:last_seen;not null" json:"end_ts"`
	SynTime             *time.Time `json:"syn_time"`
	SynAckTime          *time.Time `json:"syn_ack_time"`
	AckTime             *time.Time `json:"ack_time"`
	RTTMs               *float64   `json:"handshake_rtt_ms_estimate"`
	BytesSent           int64      `gorm:"not null;default:0" json:"bytes_sent"`
	BytesRecv           int64      `gorm:"not null;default:0" json:"bytes_recv"`
	BytesClientToServer int64      `gorm:"not null;default:0" json:"bytes_client_to_server"`
	BytesServerToClient int64      `gorm:"not null;default:0" json:"bytes_server_to_client"`
	PacketCount         int64      `gorm:"not null;default:0" json:"packet_count"`
	Retransmits         int64      `gorm:"not null;default:0" json:"tcp_retransmissions"`
	SynRetransmits      int64      `gorm:"column:tcp_syn_retransmissions;not null;default:0" json:"tcp_syn_retransmissions"`
	OutOfOrder          int64      `gorm:"not null;default:0" json:"out_of_order"`
	DupAcks             int64      `gorm:"not null;default:0" json:"dup_acks"`
	FirstPayloadTime    *time.Time `gorm:"column:first_payload_ts" json:"first_payload_ts"`
	LastPayloadTime     *time.Time `gorm:"column:last_payload_ts" json:"last_payload_ts"`
	DurationMs          *float64   `json:"duration_ms"`
	AppBytes            int64      `gorm:"not null;default:0" json:"app_bytes"`
	TCPStream           *int       `gorm:"index" json:"tcp_stream"`
	MSS                 *int       `json:"mss"`
	TLSVersion          *string    `json:"tls_version"`
	TLSSNI              *string    `json:"tls_sni"`
	ALPN                *string    `json:"alpn"`
	TLSClientHello      bool       `gorm:"not null;default:false" json:"tls_client_hello"`
	TLSServerHello      bool       `gorm:"not null;default:false" json:"tls_server_hello"`
	TLSAlert            bool       `gorm:"not null;default:false" json:"tls_alert"`
	TLSAlertCode        *int       `json:"tls_alert_code"`
	RSTCount            int64      `gorm:"not null;default:0" json:"rst_count"`
	FragmentCount       int64      `gorm:"not null;default:0" json:"fragment_count"`
	ThroughputBps       *float64   `json:"throughput_bps"`
	HTTPMethod          *string    `json:"http_method"`
	HTTPHost            *string    `json:"http_host"`
	HTTPTime            *time.Time `json:"http_time"`
}

type Issue struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	PcapID        uint      `gorm:"index;not null" json:"pcap_id"`
	JobID         *uint     `gorm:"index" json:"job_id"`
	UserID        uint      `gorm:"index;not null" json:"user_id"`
	PrimaryFlowID *uint     `gorm:"index" json:"primary_flow_id"`
	Severity      int       `gorm:"index;not null" json:"severity"`
	IssueType     string    `gorm:"index;not null" json:"issue_type"`
	Title         string    `gorm:"not null" json:"title"`
	Summary       string    `gorm:"not null" json:"summary"`
	CreatedAt     time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
}

type IssueEvidence struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	IssueID          uint      `gorm:"index;not null" json:"issue_id"`
	FlowID           uint      `gorm:"index;not null" json:"flow_id"`
	PacketStartIndex int       `gorm:"not null" json:"packet_start_index"`
	PacketEndIndex   int       `gorm:"not null" json:"packet_end_index"`
	MetricsJSON      string    `gorm:"type:jsonb;not null" json:"metrics_json"`
	CreatedAt        time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
}

func (IssueEvidence) TableName() string {
	return "issue_evidence"
}

type AIExplanation struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	IssueID      uint      `gorm:"index;not null" json:"issue_id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	PromptHash   string    `gorm:"index;not null" json:"prompt_hash"`
	Model        string    `gorm:"not null" json:"model"`
	ResponseText string    `gorm:"type:text;not null" json:"response_text"`
	CreatedAt    time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
}

type PcapStats struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	PcapID           uint      `gorm:"uniqueIndex;not null" json:"pcap_id"`
	UserID           uint      `gorm:"index;not null" json:"user_id"`
	TopTalkersJSON   string    `gorm:"type:jsonb;not null" json:"top_talkers_json"`
	TopFlowsJSON     string    `gorm:"type:jsonb;not null" json:"top_flows_json"`
	RTTHistogramJSON string    `gorm:"type:jsonb;not null" json:"rtt_histogram_json"`
	CreatedAt        time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
}
