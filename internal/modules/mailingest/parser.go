package mailingest

import (
	"regexp"
	"strings"
)

var (
	codePattern       = regexp.MustCompile(`\b\d{4,8}\b`)
	spacedCodePattern = regexp.MustCompile(`\b(?:\d[\s-]?){3,7}\d\b`)
	linkPattern       = regexp.MustCompile(`https?://[^\s<>"]+`)
)

func ExtractResult(raw []byte) (string, string) {
	text := string(raw)
	if match := codePattern.FindString(text); match != "" {
		return "code", match
	}
	if match := normalizeCodeCandidate(spacedCodePattern.FindString(text)); match != "" {
		return "code", match
	}
	if match := linkPattern.FindString(text); match != "" {
		return "link", strings.TrimRight(match, ".,)>")
	}
	return "", ""
}

func normalizeCodeCandidate(input string) string {
	input = strings.TrimSpace(input)
	if input == "" {
		return ""
	}
	replacer := strings.NewReplacer(" ", "", "-", "")
	value := replacer.Replace(input)
	if len(value) < 4 || len(value) > 8 {
		return ""
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return ""
		}
	}
	return value
}
