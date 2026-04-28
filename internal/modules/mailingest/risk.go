package mailingest

import "context"

type SenderRiskEvaluator interface {
	EvaluateSender(ctx context.Context, sender string) (bool, string, error)
}

type NopSenderRiskEvaluator struct{}

func (NopSenderRiskEvaluator) EvaluateSender(context.Context, string) (bool, string, error) {
	return false, "", nil
}
