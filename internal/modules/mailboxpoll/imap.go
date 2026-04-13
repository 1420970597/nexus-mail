package mailboxpoll

import "context"

type IMAPPoller struct{}

func (IMAPPoller) Poll(_ context.Context, account AccountConfig) (PollResult, error) {
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
