package main

import (
	"ethan/pkg/cmd"

	acmd "github.com/acorn-io/cmd"
)

func main() {
	acmd.Main(cmd.New())
}
