package tool

import (
	_ "embed"
)

var (
	//go:embed copilot.gpt
	DefaultToolDef string
)
