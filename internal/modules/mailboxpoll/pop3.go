package mailboxpoll

import "context"

type POP3Poller struct {
	Validator CredentialValidator
}

func (p POP3Poller) Poll(ctx context.Context, account AccountConfig) (PollResult, error) {
	normalized, err := NormalizeAccountConfig(account)
	if err != nil {
		return PollResult{}, err
	}
	validator := p.Validator
	if validator == nil {
		validator = NetworkCredentialValidator{}
	}
	if err := validator.Validate(ctx, normalized); err != nil {
		return PollResult{}, err
	}
	return PollResult{
		Provider:   normalized.Provider,
		Protocol:   normalized.ProtocolMode,
		AccountRef: normalized.Identifier,
		MessageIDs: []string{},
	}, nil
}
