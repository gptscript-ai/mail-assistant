package cmd

import (
	"context"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/acorn-io/cmd"
	"github.com/spf13/cobra"
)

type StaticTokenCredential struct {
	token string
}

func NewStaticTokenCredential(token string) StaticTokenCredential {
	return StaticTokenCredential{
		token: token,
	}
}

func (s StaticTokenCredential) GetToken(ctx context.Context, options policy.TokenRequestOptions) (azcore.AccessToken, error) {
	return azcore.AccessToken{
		Token: s.token,
	}, nil
}

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
