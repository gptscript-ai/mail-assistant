package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"ethan/pkg/mstoken"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	"github.com/spf13/cobra"
)

type output struct {
	Name string `json:"name"`
	Email string `json:"email"`
}

type GetContact struct{}

func (c *GetContact) Run(cmd *cobra.Command, args []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	result, err := client.Me().Contacts().Get(cmd.Context(), nil)
	if err != nil {
		return err
	}
	// todo: do server side filtering
	contacts := result.GetValue()
	var ret []output
	for _, contact := range contacts {
		if contact.GetDisplayName() != nil {
			for _, name := range strings.Split(os.Getenv("EMAIL_RECIPIENT_NAMES"), ",") {
				if strings.Contains(strings.ToLower(*contact.GetDisplayName()), strings.ToLower(strings.TrimSpace(name))) {
					ret = append(ret, output{
						Name:  *contact.GetDisplayName(),
						Email: *contact.GetEmailAddresses()[0].GetAddress(),
					})
					break
				}
			}
		}
	}
	data, err := json.Marshal(ret)
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}
