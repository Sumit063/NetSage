package triage

import (
	"embed"
	"path"
	"sort"

	"gopkg.in/yaml.v3"
)

//go:embed rules/*.yaml
var rulesFS embed.FS

func LoadRules() ([]Rule, error) {
	entries, err := rulesFS.ReadDir("rules")
	if err != nil {
		return nil, err
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		files = append(files, entry.Name())
	}
	sort.Strings(files)

	rules := make([]Rule, 0, len(files))
	for _, file := range files {
		data, err := rulesFS.ReadFile(path.Join("rules", file))
		if err != nil {
			return nil, err
		}
		var rule Rule
		if err := yaml.Unmarshal(data, &rule); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}

	return rules, nil
}
