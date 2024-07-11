package cmd

import (
	"fmt"
	"os"
	"strings"

	"ethan/pkg/mstoken"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type CheckSchedule struct {
}

func (c *CheckSchedule) Run(cmd *cobra.Command, _ []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.body-content-type=text")
	emailRecipients := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")
	conversationID := os.Getenv("CONVERSATION_ID")

	ret := strings.Builder{}
	for _, recipient := range emailRecipients {
		rep := strings.TrimSpace(recipient)
		configuration := &graphusers.ItemMessagesRequestBuilderGetRequestConfiguration{
			Headers: headers,
		}
		messages, err := client.Me().Messages().Get(cmd.Context(), configuration)
		if err != nil {
			return err
		}
		for _, m := range messages.GetValue() {
			if *m.GetConversationId() != conversationID {
				continue
			}
			if *m.GetSender().GetEmailAddress().GetAddress() != rep {
				continue
			}
			ret.WriteString(rep)
			ret.WriteString("\n")
			ret.WriteString(*m.GetBody().GetContent())
			ret.WriteString("\n")
		}
	}

	fmt.Println(ret.String())
	return nil
}
