package activation

import (
	"context"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) ListProjects(ctx context.Context) ([]Project, error) {
	return s.repo.ListProjects(ctx)
}

func (s *Service) ListInventory(ctx context.Context) ([]ProjectOffering, error) {
	return s.repo.ListProjectOfferings(ctx)
}

func (s *Service) CreateActivationOrder(ctx context.Context, userID int64, input CreateActivationOrderInput) (ActivationOrder, error) {
	if input.ProjectKey == "" {
		return ActivationOrder{}, fmt.Errorf("project_key 不能为空")
	}
	return s.repo.CreateActivationOrder(ctx, userID, input)
}

func (s *Service) ListActivationOrders(ctx context.Context, userID int64) ([]ActivationOrder, error) {
	return s.repo.ListActivationOrdersByUser(ctx, userID)
}

func (s *Service) GetActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	return s.repo.GetActivationOrderForUser(ctx, userID, orderID)
}

func (s *Service) GetActivationResult(ctx context.Context, userID, orderID int64) (ActivationResult, error) {
	order, err := s.repo.GetActivationOrderForUser(ctx, userID, orderID)
	if err != nil {
		return ActivationResult{}, err
	}
	return ActivationResult{
		OrderID:         order.ID,
		Status:          order.Status,
		ExtractionType:  order.ExtractionType,
		ExtractionValue: order.ExtractionValue,
	}, nil
}

func (s *Service) CancelActivationOrder(ctx context.Context, userID, orderID int64) (ActivationOrder, error) {
	return s.repo.CancelActivationOrder(ctx, userID, orderID)
}

func (s *Service) SupplierResources(ctx context.Context, supplierID int64) (map[string]any, error) {
	return s.repo.ListSupplierResources(ctx, supplierID)
}

func (s *Service) AllSupplierResources(ctx context.Context) (map[string]any, error) {
	return s.repo.ListAllSupplierResources(ctx)
}
