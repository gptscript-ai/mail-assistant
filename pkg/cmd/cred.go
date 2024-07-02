package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/gptscript-ai/go-gptscript"
	"github.com/spf13/cobra"
)

type Cred struct{}

type credential struct {
	Env map[string]string `json:"env"`
}

func (c *Cred) Run(cmd *cobra.Command, _ []string) error {
	if os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN") != "" {
		return nil
	}
	var err error
	cred, err := azidentity.NewDeviceCodeCredential(&azidentity.DeviceCodeCredentialOptions{
		ClientID: "761e7275-0044-4d3b-ad81-99f3dc8be936",
		TenantID: "369895fd-4335-4606-b433-6ab084d5bd79",
		UserPrompt: func(ctx context.Context, message azidentity.DeviceCodeMessage) error {
			gs, err := gptscript.NewGPTScript(gptscript.GlobalOptions{})
			if err != nil {
				return fmt.Errorf("error creating GPTScript client: %w", err)
			}
			defer gs.Close()

			sysPromptIn, err := json.Marshal(struct {
				Message   string `json:"message"`
				Fields    string `json:"fields"`
				Sensitive string `json:"sensitive"`
			}{
				Message:   message.Message,
				Fields:    "Press enter to continue ...",
				Sensitive: "false",
			})
			if err != nil {
				return fmt.Errorf("error marshaling sysPromptIn: %w", err)
			}

			run, err := gs.Run(ctx, "sys.prompt", gptscript.Options{Input: string(sysPromptIn)})
			if err != nil {
				return fmt.Errorf("error running sys.prompt: %w", err)
			}

			_, err = run.Text()
			if err != nil {
				return fmt.Errorf("error getting the result of sys.prompt: %w", err)
			}
			return nil
		},
	})
	if err != nil {
		return err
	}
	token, err := cred.GetToken(context.Background(), policy.TokenRequestOptions{
		Scopes: []string{"User.Read", "Mail.Read", "Mail.Send", "Contacts.Read", "Calendars.ReadWrite"},
	})
	if err != nil {
		return err
	}

	credential := credential{
		Env: map[string]string{
			"GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN": token.Token,
		},
	}

	credJSON, err := json.Marshal(credential)
	if err != nil {
		return err
	}

	fmt.Print(string(credJSON))
	return nil
}
