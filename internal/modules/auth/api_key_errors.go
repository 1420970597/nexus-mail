package auth

import "errors"

var (
	ErrAPIKeyInvalid           = errors.New("API Key 无效")
	ErrAPIKeyDeniedScope       = errors.New("API Key 无权限访问该接口")
	ErrAPIKeyDeniedIP          = errors.New("当前 IP 不在 API Key 白名单内")
	ErrAPIKeyRateLimited       = errors.New("API Key 请求过于频繁")
	ErrAPIKeyRateLimiterFailed = errors.New("API Key 限流服务暂时不可用")
	ErrAPIKeyMissing           = errors.New("缺少 API Key")
	ErrAPIKeyStoreMissing      = errors.New("API Key 存储尚未初始化")
)
