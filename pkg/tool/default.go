package tool

import (
	_ "embed"
)

var (
	//go:embed copilot.gpt
	DefaultToolDef string

	//go:embed context.gpt
	DefaultContext string
)
