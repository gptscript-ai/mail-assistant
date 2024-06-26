package cmd

import (
	"github.com/acorn-io/cmd"
	"github.com/spf13/cobra"
)

func New() *cobra.Command {
	return cmd.Command(
		&Schedulinator{},
		new(GetContact),
		new(Cred),
		new(SendEmail),
		new(Subscribe),
		new(Schedule),
		new(CheckSchedule),
	)
}

type Schedulinator struct{}

func (s *Schedulinator) Run(cmd *cobra.Command, _ []string) error {
	return cmd.Help()
}
