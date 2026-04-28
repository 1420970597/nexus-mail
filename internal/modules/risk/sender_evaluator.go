package risk

import (
	"context"
	"fmt"
	"log"
)

type SenderEvaluatorAdapter struct {
	Service *Service
}

func (a SenderEvaluatorAdapter) EvaluateSender(ctx context.Context, sender string) (bool, string, error) {
	if a.Service == nil {
		return false, "", nil
	}
	matched, entry, err := a.Service.EvaluateSender(ctx, sender)
	if err != nil || !matched {
		return matched, "", err
	}
	reason := fmt.Sprintf("%s:%s", entry.MatchType, entry.Pattern)
	if err := a.Service.repo.RecordSenderBlacklistHit(ctx, sender, reason); err != nil {
		log.Printf("record sender blacklist hit audit failed sender=%s reason=%s: %v", sender, reason, err)
	}
	return true, reason, nil
}
