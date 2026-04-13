package mailboxpoll

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/textproto"
	"os"
	"strconv"
	"strings"
	"time"
)

type SecretResolver interface {
	Resolve(ctx context.Context, secretRef string) (string, error)
}

type CredentialValidator interface {
	Validate(ctx context.Context, account AccountConfig) error
}

type MultiSecretResolver struct{}

func (MultiSecretResolver) Resolve(_ context.Context, secretRef string) (string, error) {
	ref := strings.TrimSpace(secretRef)
	if ref == "" {
		return "", fmt.Errorf("secret_ref 不能为空")
	}
	switch {
	case strings.HasPrefix(ref, "env://"):
		key := strings.TrimSpace(strings.TrimPrefix(ref, "env://"))
		if key == "" {
			return "", fmt.Errorf("env secret_ref 缺少变量名")
		}
		value := strings.TrimSpace(os.Getenv(key))
		if value == "" {
			return "", fmt.Errorf("环境变量 %s 未配置", key)
		}
		return value, nil
	case strings.HasPrefix(ref, "file://"):
		path := strings.TrimSpace(strings.TrimPrefix(ref, "file://"))
		if path == "" {
			return "", fmt.Errorf("file secret_ref 缺少路径")
		}
		payload, err := os.ReadFile(path)
		if err != nil {
			return "", fmt.Errorf("读取 secret_ref 文件失败: %w", err)
		}
		value := strings.TrimSpace(string(payload))
		if value == "" {
			return "", fmt.Errorf("secret_ref 文件为空")
		}
		return value, nil
	default:
		return "", fmt.Errorf("暂不支持的 secret_ref: %s", ref)
	}
}

type NetworkCredentialValidator struct {
	DialContext func(ctx context.Context, network, address string) (net.Conn, error)
	TLSDialer   func(ctx context.Context, network, address string, cfg *tls.Config) (*tls.Conn, error)
	Timeout     time.Duration
}

func (v NetworkCredentialValidator) Validate(ctx context.Context, account AccountConfig) error {
	normalized, err := NormalizeAccountConfig(account)
	if err != nil {
		return err
	}
	secret := strings.TrimSpace(normalized.CredentialSecret)
	if secret == "" {
		return fmt.Errorf("credential_secret 不能为空")
	}
	if normalized.Host == "" || normalized.Port == 0 {
		return fmt.Errorf("host 或 port 未配置")
	}
	switch normalized.ProtocolMode {
	case "imap_pull":
		return v.validateIMAP(ctx, normalized, secret)
	case "pop3_pull":
		return v.validatePOP3(ctx, normalized, secret)
	default:
		return fmt.Errorf("暂不支持的协议模式: %s", normalized.ProtocolMode)
	}
}

func (v NetworkCredentialValidator) validateIMAP(ctx context.Context, account AccountConfig, secret string) error {
	conn, err := v.open(ctx, account.Host, account.Port)
	if err != nil {
		return err
	}
	defer conn.Close()

	reader := bufio.NewReader(conn)
	greeting, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("读取 IMAP greeting 失败: %w", err)
	}
	if !strings.HasPrefix(strings.TrimSpace(greeting), "*") {
		return fmt.Errorf("IMAP greeting 非法: %s", strings.TrimSpace(greeting))
	}

	tp := textproto.NewConn(struct {
		ioReader
		ioWriter
		ioCloser
	}{ioReader: reader, ioWriter: conn, ioCloser: conn})
	defer tp.Close()

	tag := "A001"
	user := account.LoginIdentity()
	if _, err := fmt.Fprintf(conn, "%s LOGIN %s %s\r\n", tag, quoteIMAPString(user), quoteIMAPString(secret)); err != nil {
		return fmt.Errorf("发送 IMAP LOGIN 失败: %w", err)
	}
	for {
		line, err := tp.ReadLine()
		if err != nil {
			return fmt.Errorf("读取 IMAP LOGIN 响应失败: %w", err)
		}
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, tag+" ") {
			if strings.Contains(strings.ToUpper(trimmed), " OK") {
				_, _ = fmt.Fprintf(conn, "A002 LOGOUT\r\n")
				return nil
			}
			return fmt.Errorf("IMAP 登录失败: %s", trimmed)
		}
	}
}

func (v NetworkCredentialValidator) validatePOP3(ctx context.Context, account AccountConfig, secret string) error {
	conn, err := v.open(ctx, account.Host, account.Port)
	if err != nil {
		return err
	}
	defer conn.Close()
	tp := textproto.NewConn(conn)
	defer tp.Close()
	greeting, err := tp.ReadLine()
	if err != nil {
		return fmt.Errorf("读取 POP3 greeting 失败: %w", err)
	}
	if !strings.HasPrefix(strings.TrimSpace(greeting), "+OK") {
		return fmt.Errorf("POP3 greeting 非法: %s", strings.TrimSpace(greeting))
	}
	user := account.LoginIdentity()
	if err := sendPOP3ExpectOK(tp, fmt.Sprintf("USER %s", user), "USER"); err != nil {
		return err
	}
	if err := sendPOP3ExpectOK(tp, fmt.Sprintf("PASS %s", secret), "PASS"); err != nil {
		return err
	}
	_ = sendPOP3ExpectOK(tp, "QUIT", "QUIT")
	return nil
}

func sendPOP3ExpectOK(tp *textproto.Conn, command, label string) error {
	if err := tp.PrintfLine("%s", command); err != nil {
		return fmt.Errorf("发送 POP3 %s 失败: %w", label, err)
	}
	line, err := tp.ReadLine()
	if err != nil {
		return fmt.Errorf("读取 POP3 %s 响应失败: %w", label, err)
	}
	if !strings.HasPrefix(strings.TrimSpace(line), "+OK") {
		return fmt.Errorf("POP3 %s 失败: %s", label, strings.TrimSpace(line))
	}
	return nil
}

func (v NetworkCredentialValidator) open(ctx context.Context, host string, port int) (net.Conn, error) {
	address := net.JoinHostPort(host, strconv.Itoa(port))
	if v.shouldUseTLS(host, port) {
		tlsDialer := v.TLSDialer
		if tlsDialer == nil {
			tlsDialer = func(ctx context.Context, network, address string, cfg *tls.Config) (*tls.Conn, error) {
				d := &net.Dialer{Timeout: v.timeout()}
				return tls.DialWithDialer(d, network, address, cfg)
			}
		}
		cfg := &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}
		conn, err := tlsDialer(ctx, "tcp", address, cfg)
		if err != nil {
			return nil, fmt.Errorf("建立 TLS 连接失败: %w", err)
		}
		if err := conn.SetDeadline(time.Now().Add(v.timeout())); err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("设置 TLS deadline 失败: %w", err)
		}
		return conn, nil
	}
	dialer := v.DialContext
	if dialer == nil {
		d := &net.Dialer{Timeout: v.timeout()}
		dialer = d.DialContext
	}
	conn, err := dialer(ctx, "tcp", address)
	if err != nil {
		return nil, fmt.Errorf("建立 TCP 连接失败: %w", err)
	}
	if err := conn.SetDeadline(time.Now().Add(v.timeout())); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("设置 TCP deadline 失败: %w", err)
	}
	return conn, nil
}

func (v NetworkCredentialValidator) timeout() time.Duration {
	if v.Timeout <= 0 {
		return 10 * time.Second
	}
	return v.Timeout
}

func (v NetworkCredentialValidator) shouldUseTLS(host string, port int) bool {
	if host == "127.0.0.1" || host == "localhost" {
		return false
	}
	switch port {
	case 993, 995:
		return true
	case 143, 110, 1143:
		return false
	default:
		return true
	}
}

func quoteIMAPString(value string) string {
	replacer := strings.NewReplacer("\\", "\\\\", `"`, `\"`)
	return `"` + replacer.Replace(value) + `"`
}

type ioReader interface {
	Read(p []byte) (int, error)
}

type ioWriter interface {
	Write(p []byte) (int, error)
}

type ioCloser interface {
	Close() error
}
