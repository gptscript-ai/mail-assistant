package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"ethan/pkg/mstoken"
	"github.com/sirupsen/logrus"

	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	"github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type output struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type GetContact struct{}

func (c *GetContact) Run(cmd *cobra.Command, args []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	var ret []output
	for _, name := range strings.Split(os.Getenv("EMAIL_RECIPIENT_NAMES"), ",") {
		config := &users.ItemPeopleRequestBuilderGetRequestConfiguration{
			QueryParameters: &users.ItemPeopleRequestBuilderGetQueryParameters{
				Search: &name,
			},
		}
		people, err := client.Me().People().Get(cmd.Context(), config)
		if err != nil {
			logrus.Errorf("Failed to get people from MS Graph: %v", err)
			continue
		}
		contacts := people.GetValue()
		for _, contact := range contacts {
			if contact.GetDisplayName() != nil {
				var emails []string
				for _, email := range contact.GetScoredEmailAddresses() {
					if email.GetAddress() != nil {
						emails = append(emails, *email.GetAddress())
					}
				}
				ret = append(ret, output{
					Name:  *contact.GetDisplayName(),
					Email: strings.Join(emails, ","),
				})
			}
		}
	}

	result, err := client.Me().Contacts().Get(cmd.Context(), nil)
	if err != nil {
		return err
	}
	for _, contact := range result.GetValue() {
		var displayName string
		if contact.GetDisplayName() != nil && *contact.GetDisplayName() != "" {
			displayName = *contact.GetDisplayName()
		} else if contact.GetGivenName() != nil && contact.GetSurname() != nil {
			displayName = fmt.Sprintf("%v %v", *contact.GetGivenName(), *contact.GetSurname())
		}

		for _, name := range strings.Split(os.Getenv("EMAIL_RECIPIENT_NAMES"), ",") {
			if strings.Contains(strings.ToLower(displayName), strings.ToLower(strings.TrimSpace(name))) {
				ret = append(ret, output{
					Name:  displayName,
					Email: *contact.GetEmailAddresses()[0].GetAddress(),
				})
				break
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
