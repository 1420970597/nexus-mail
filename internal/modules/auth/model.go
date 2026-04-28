package auth

import "time"

type Role string

type Permission string

const (
	RoleUser     Role = "user"
	RoleSupplier Role = "supplier"
	RoleAdmin    Role = "admin"
)

const (
	PermissionDashboardView        Permission = "dashboard:view"
	PermissionProjectView          Permission = "project:view"
	PermissionOrderView            Permission = "order:view"
	PermissionBalanceView          Permission = "balance:view"
	PermissionProfileManage        Permission = "profile:manage"
	PermissionAPIKeysManage        Permission = "api_keys:manage"
	PermissionSettingsManage       Permission = "settings:manage"
	PermissionSupplierDomain       Permission = "supplier:domain"
	PermissionSupplierResource     Permission = "supplier:resource"
	PermissionSupplierSettlement   Permission = "supplier:settlement"
	PermissionAdminUserManage      Permission = "admin:user_manage"
	PermissionAdminSupplierManage  Permission = "admin:supplier_manage"
	PermissionAdminPricingManage   Permission = "admin:pricing_manage"
	PermissionAdminRiskManage      Permission = "admin:risk_manage"
	PermissionAdminAuditView       Permission = "admin:audit_view"
	PermissionAPIKeyWhitelistWrite Permission = "api_keys:whitelist_manage"
)

var rolePermissions = map[Role][]Permission{
	RoleUser: {
		PermissionDashboardView,
		PermissionProjectView,
		PermissionOrderView,
		PermissionBalanceView,
		PermissionProfileManage,
		PermissionAPIKeysManage,
		PermissionAPIKeyWhitelistWrite,
		PermissionSettingsManage,
	},
	RoleSupplier: {
		PermissionDashboardView,
		PermissionProjectView,
		PermissionOrderView,
		PermissionBalanceView,
		PermissionProfileManage,
		PermissionAPIKeysManage,
		PermissionAPIKeyWhitelistWrite,
		PermissionSettingsManage,
		PermissionSupplierDomain,
		PermissionSupplierResource,
		PermissionSupplierSettlement,
	},
	RoleAdmin: {
		PermissionDashboardView,
		PermissionProjectView,
		PermissionOrderView,
		PermissionBalanceView,
		PermissionProfileManage,
		PermissionAPIKeysManage,
		PermissionAPIKeyWhitelistWrite,
		PermissionSettingsManage,
		PermissionSupplierDomain,
		PermissionSupplierResource,
		PermissionSupplierSettlement,
		PermissionAdminUserManage,
		PermissionAdminSupplierManage,
		PermissionAdminPricingManage,
		PermissionAdminRiskManage,
		PermissionAdminAuditView,
	},
}

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Session struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

type RefreshInput struct {
	RefreshToken string `json:"refresh_token"`
}

type MenuItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Path  string `json:"path"`
}
