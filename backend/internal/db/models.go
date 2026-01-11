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
	ID             uint       `gorm:"primaryKey" json:"id"`
	PcapID         uint       `gorm:"index;not null" json:"pcap_id"`
	UserID         uint       `gorm:"index;not null" json:"user_id"`
	Proto          string     `gorm:"index;not null" json:"proto"`
	SrcIP          string     `gorm:"index;not null" json:"src_ip"`
	DstIP          string     `gorm:"index;not null" json:"dst_ip"`
	SrcPort        int        `gorm:"index;not null" json:"src_port"`
	DstPort        int        `gorm:"index;not null" json:"dst_port"`
	FirstSeen      time.Time  `gorm:"not null" json:"first_seen"`
	LastSeen       time.Time  `gorm:"not null" json:"last_seen"`
	SynTime        *time.Time `json:"syn_time"`
	SynAckTime     *time.Time `json:"syn_ack_time"`
	AckTime        *time.Time `json:"ack_time"`
	RTTMs          *float64   `json:"rtt_ms"`
	BytesSent      int64      `gorm:"not null;default:0" json:"bytes_sent"`
	BytesRecv      int64      `gorm:"not null;default:0" json:"bytes_recv"`
	Retransmits    int64      `gorm:"not null;default:0" json:"retransmits"`
	OutOfOrder     int64      `gorm:"not null;default:0" json:"out_of_order"`
	MSS            *int       `json:"mss"`
	TLSVersion     *string    `json:"tls_version"`
	TLSSNI         *string    `json:"tls_sni"`
	ALPN           *string    `json:"alpn"`
	TLSClientHello bool       `gorm:"not null;default:false" json:"tls_client_hello"`
	TLSServerHello bool       `gorm:"not null;default:false" json:"tls_server_hello"`
	TLSAlert       bool       `gorm:"not null;default:false" json:"tls_alert"`
	RSTCount       int64      `gorm:"not null;default:0" json:"rst_count"`
	FragmentCount  int64      `gorm:"not null;default:0" json:"fragment_count"`
	ThroughputBps  *float64   `json:"throughput_bps"`
	HTTPMethod     *string    `json:"http_method"`
	HTTPHost       *string    `json:"http_host"`
	HTTPTime       *time.Time `json:"http_time"`
}

type Issue struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PcapID       uint      `gorm:"index;not null" json:"pcap_id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	FlowID       *uint     `gorm:"index" json:"flow_id"`
	Severity     string    `gorm:"index;not null" json:"severity"`
	Type         string    `gorm:"index;not null" json:"type"`
	Title        string    `gorm:"not null" json:"title"`
	Description  string    `gorm:"not null" json:"description"`
	EvidenceJSON string    `gorm:"type:jsonb;not null" json:"evidence_json"`
	CreatedAt    time.Time `gorm:"not null;autoCreateTime" json:"created_at"`
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
