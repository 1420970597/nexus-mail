package mailingest

import (
	"regexp"
)

var (
	codePattern = regexp.MustCompile(`\b\d{4,8}\b`)
	linkPattern = regexp.MustCompile(`https?://[^\s<>"]+`)
)

func ExtractResult(raw []byte) (string, string) {
	text := string(raw)
	if match := codePattern.FindString(text); match != "" {
		return "code", match
	}
	if match := linkPattern.FindString(text); match != "" {
		return "link", match
	}
	return "", ""
}
