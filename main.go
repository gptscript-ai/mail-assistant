package main

import (
	"meeting-schedulinator/pkg/cmd"

	acmd "github.com/acorn-io/cmd"
)

func main() {
	acmd.Main(cmd.New())
}
