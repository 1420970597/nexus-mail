package mailingest

import "time"

type Envelope struct {
	MailFrom string   `json:"mail_from"`
	RcptTo   []string `json:"rcpt_to"`
	Helo     string   `json:"helo"`
	RemoteIP string   `json:"remote_ip"`
}

type PersistedMessage struct {
	ID           string    `json:"id"`
	MailFrom     string    `json:"mail_from"`
	RcptTo       []string  `json:"rcpt_to"`
	Helo         string    `json:"helo"`
	RemoteIP     string    `json:"remote_ip"`
	StoredAt     time.Time `json:"stored_at"`
	RawPath      string    `json:"raw_path"`
	MetadataPath string    `json:"metadata_path"`
	SizeBytes    int       `json:"size_bytes"`
}
