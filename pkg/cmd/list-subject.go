package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"ethan/pkg/mstoken"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type contactOutput struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type ListSubjects struct{}

func (l *ListSubjects) Run(cmd *cobra.Command, args []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.body-content-type=text")
	requestParameters := &graphusers.ItemMessagesRequestBuilderGetQueryParameters{
		Select: []string{"sender", "subject", "body"},
		Top: &[]int32{100}[0],
	}
	configuration := &graphusers.ItemMessagesRequestBuilderGetRequestConfiguration{
		QueryParameters: requestParameters,
		Headers:         headers,
	}

	messages, err := client.Me().Messages().Get(cmd.Context(), configuration)
	if err != nil {
		return err
	}

	var contacts []contactOutput
	for _, m := range messages.GetValue() {
		contacts = append(contacts, contactOutput{
			Body:    *m.GetBody().GetContent(),
			Subject: *m.GetSubject(),
		})
	}

	data, err := json.Marshal(contacts)
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}
