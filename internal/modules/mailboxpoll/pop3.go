package mailboxpoll

import "context"

type POP3Poller struct{}

func (POP3Poller) Poll(_ context.Context, account AccountConfig) (PollResult, error) {
	normalized, err := NormalizeAccountConfig(account)
	if err != nil {
		return PollResult{}, err
	}
	return PollResult{
		Provider:   normalized.Provider,
		Protocol:   normalized.ProtocolMode,
		AccountRef: normalized.Identifier,
		MessageIDs: []string{},
	}, nil
}
